#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

REPO="DrabornEagle/DraBornGate"
PROJECT_REF="guuwomvszlwhkmstewfl"
PACKAGE_NAME="com.draborneagle.draborngate"
KEY_ALIAS="draborngate-upload"
PROJECT_DIR="${HOME}/DraBornGate"
DOWNLOADS="${HOME}/storage/downloads"
SECURE_DIR="${DOWNLOADS}/DraBornGate_Release_Secrets"
KEYSTORE_FILE="${SECURE_DIR}/draborngate-upload.p12"
RECOVERY_FILE="${SECURE_DIR}/DKD_DraBornGate_Release_Key_Recovery.txt"

mkdir -p "$SECURE_DIR"
chmod 700 "$SECURE_DIR" 2>/dev/null || true

command -v gh >/dev/null 2>&1 || pkg install gh -y
command -v keytool >/dev/null 2>&1 || pkg install openjdk-17 -y
command -v openssl >/dev/null 2>&1 || pkg install openssl -y
command -v jq >/dev/null 2>&1 || pkg install jq -y
command -v node >/dev/null 2>&1 || pkg install nodejs -y

gh auth status >/dev/null

MAPS_KEY="${GOOGLE_MAPS_ANDROID_API_KEY:-}"
if [ -z "$MAPS_KEY" ] && [ -f "$PROJECT_DIR/.env" ]; then
  MAPS_KEY="$(sed -n 's/^GOOGLE_MAPS_ANDROID_API_KEY=//p' "$PROJECT_DIR/.env" | tail -n 1 | tr -d '\r')"
fi
if [ -z "$MAPS_KEY" ]; then
  echo "HATA: GOOGLE_MAPS_ANDROID_API_KEY ortam değişkeninde veya $PROJECT_DIR/.env dosyasında bulunamadı."
  exit 1
fi

if [ ! -f "$KEYSTORE_FILE" ]; then
  KEYSTORE_PASSWORD="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 40)"
  keytool -genkeypair \
    -storetype PKCS12 \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 4096 \
    -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEYSTORE_PASSWORD" \
    -dname "CN=DraBornGate, OU=DraBornEagle, O=DraBornEagle, L=Ankara, ST=Ankara, C=TR"

  cat > "$RECOVERY_FILE" <<EOF
DraBornGate Android yükleme anahtarı kurtarma bilgileri

Paket adı: $PACKAGE_NAME
Anahtar takma adı: $KEY_ALIAS
Anahtar dosyası: $KEYSTORE_FILE
Anahtar parolası: $KEYSTORE_PASSWORD

Bu dosyayı ve .p12 anahtarını güvenli, çevrimdışı ikinci bir konuma yedekle.
GitHub'a veya herkese açık depoya yükleme.
EOF
  chmod 600 "$KEYSTORE_FILE" "$RECOVERY_FILE" 2>/dev/null || true
else
  if [ ! -f "$RECOVERY_FILE" ]; then
    echo "HATA: Mevcut anahtar bulundu fakat kurtarma/parola dosyası yok: $RECOVERY_FILE"
    exit 1
  fi
  KEYSTORE_PASSWORD="$(sed -n 's/^Anahtar parolası: //p' "$RECOVERY_FILE" | head -n 1)"
  [ -n "$KEYSTORE_PASSWORD" ] || { echo "HATA: Anahtar parolası kurtarma dosyasından okunamadı."; exit 1; }
fi

KEYSTORE_BASE64="$(base64 -w 0 "$KEYSTORE_FILE")"
printf '%s' "$KEYSTORE_BASE64" | gh secret set ANDROID_KEYSTORE_BASE64 --repo "$REPO"
printf '%s' "$KEYSTORE_PASSWORD" | gh secret set ANDROID_KEYSTORE_PASSWORD --repo "$REPO"
printf '%s' "$MAPS_KEY" | gh secret set GOOGLE_MAPS_ANDROID_API_KEY --repo "$REPO"

# Supabase URL ve publishable key uygulamada güvenli public fallback olarak bulunur;
# bu yüzden GitHub Secret olmaları gerekmez.

SERVICE_ACCOUNT_JSON="${GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_FILE:-}"
if [ -z "$SERVICE_ACCOUNT_JSON" ]; then
  SERVICE_ACCOUNT_JSON="$(find "$DOWNLOADS" -maxdepth 3 -type f \
    \( -iname '*google*play*service*.json' -o -iname '*service*account*.json' -o -iname '*android*publisher*.json' \) \
    2>/dev/null | head -n 1 || true)"
fi

# Supabase CLI mevcut oturum veya SUPABASE_ACCESS_TOKEN ile çalışır.
npx --yes supabase@latest secrets set \
  --project-ref "$PROJECT_REF" \
  GOOGLE_PLAY_PACKAGE_NAME="$PACKAGE_NAME"

if [ -n "$SERVICE_ACCOUNT_JSON" ] && [ -f "$SERVICE_ACCOUNT_JSON" ]; then
  COMPACT_JSON="$(jq -c . "$SERVICE_ACCOUNT_JSON")"
  npx --yes supabase@latest secrets set \
    --project-ref "$PROJECT_REF" \
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="$COMPACT_JSON"
  echo "Google Play servis hesabı Supabase Edge Function sırrına yüklendi."
else
  echo "UYARI: Google Play servis hesabı JSON dosyası Downloads içinde bulunamadı."
  echo "Abonelik satın alma doğrulaması, bu JSON oluşturulana kadar PLAY_CONFIGURATION_PENDING döndürür."
fi

unset KEYSTORE_BASE64 KEYSTORE_PASSWORD MAPS_KEY COMPACT_JSON 2>/dev/null || true

echo
echo "DraBornGate release yapılandırması tamamlandı."
echo "GitHub Secrets: ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, GOOGLE_MAPS_ANDROID_API_KEY"
echo "Sabit alias: $KEY_ALIAS"
echo "Supabase paket adı: $PACKAGE_NAME"
echo "Kurtarma dosyası: $RECOVERY_FILE"
