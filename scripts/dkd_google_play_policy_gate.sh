#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${1:-}"
EXPECTED_PACKAGE="com.draborneagle.draborngate"
MIN_TARGET_SDK=35
NEXT_TARGET_SDK=36

node <<'NODE'
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredUrls = ['privacyPolicyUrl', 'accountDeletionUrl', 'termsUrl'];
const blocked = new Set(app.android?.blockedPermissions ?? []);
const requested = new Set(app.android?.permissions ?? []);

function fail(message) {
  console.error(`POLİTİKA HATASI: ${message}`);
  process.exitCode = 1;
}

if (app.android?.package !== 'com.draborneagle.draborngate') fail('Android paket adı değişmiş.');
if (app.version !== pkg.version) fail('app.json ve package.json sürümleri eşit değil.');
if (!Number.isInteger(app.android?.versionCode) || app.android.versionCode < 1) fail('Android versionCode en az 1 olmalı.');
for (const key of requiredUrls) {
  const value = app.extra?.[key];
  if (typeof value !== 'string' || !value.startsWith('https://')) fail(`${key} geçerli HTTPS adresi değil.`);
}
if (requested.has('ACCESS_BACKGROUND_LOCATION')) fail('Arka plan konum izni talep edilemez.');
if (!requested.has('ACCESS_COARSE_LOCATION') && !requested.has('ACCESS_FINE_LOCATION')) fail('Akıllı geçiş için foreground konum izni eksik.');
for (const permission of [
  'android.permission.MANAGE_EXTERNAL_STORAGE',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.RECORD_AUDIO',
]) {
  if (!blocked.has(permission)) fail(`${permission} blockedPermissions listesinde değil.`);
}
if (!pkg.dependencies?.['expo-iap']) fail('Dijital paket ve abonelikler için Google Play Billing entegrasyonu eksik.');
if (!app.plugins?.some((item) => item === 'expo-iap')) fail('expo-iap config plugin eksik.');
if (process.exitCode) process.exit(process.exitCode);
console.log(`Yapılandırma politika kontrolü geçti: ${app.version} (${app.android.versionCode})`);
NODE

mapfile -t POLICY_URLS < <(node -e "const app=require('./app.json').expo; console.log(app.extra.privacyPolicyUrl); console.log(app.extra.accountDeletionUrl); console.log(app.extra.termsUrl)")
for url in "${POLICY_URLS[@]}"; do
  HTTP_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' --max-time 30 --retry 2 --retry-delay 2 -A 'DraBornGate-GooglePlay-Policy-Check/0.3.9' "$url")"
  if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 400 ]; then
    echo "POLİTİKA HATASI: Yayın sayfası erişilebilir değil ($HTTP_CODE): $url" >&2
    exit 1
  fi
  echo "Yayın sayfası erişilebilir ($HTTP_CODE): $url"
done

if [ -n "$APK_PATH" ]; then
  test -s "$APK_PATH"
  BUILD_TOOLS_VERSION="$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -V | tail -n 1)"
  test -n "$BUILD_TOOLS_VERSION"
  AAPT="$ANDROID_HOME/build-tools/$BUILD_TOOLS_VERSION/aapt"
  test -x "$AAPT"
  BADGING="$($AAPT dump badging "$APK_PATH")"
  echo "$BADGING" | grep -F "package: name='$EXPECTED_PACKAGE'" >/dev/null
  TARGET_SDK="$(printf '%s\n' "$BADGING" | sed -n "s/.*targetSdkVersion:'\([0-9][0-9]*\)'.*/\1/p" | head -n 1)"
  test -n "$TARGET_SDK"
  if [ "$TARGET_SDK" -lt "$MIN_TARGET_SDK" ]; then
    echo "POLİTİKA HATASI: targetSdkVersion $TARGET_SDK; Google Play için en az $MIN_TARGET_SDK gerekli." >&2
    exit 1
  fi
  if [ "$TARGET_SDK" -lt "$NEXT_TARGET_SDK" ]; then
    echo "UYARI: targetSdkVersion $TARGET_SDK bugün uygundur; 31 Ağustos 2026 sonrası API $NEXT_TARGET_SDK gerekecek."
  else
    echo "targetSdkVersion $TARGET_SDK: 31 Ağustos 2026 gereksinimine hazır."
  fi
  if printf '%s\n' "$BADGING" | grep -F "android.permission.ACCESS_BACKGROUND_LOCATION" >/dev/null; then
    echo "POLİTİKA HATASI: APK arka plan konum izni içeriyor." >&2
    exit 1
  fi
  for permission in android.permission.MANAGE_EXTERNAL_STORAGE android.permission.READ_MEDIA_IMAGES android.permission.READ_MEDIA_VIDEO android.permission.RECORD_AUDIO; do
    if printf '%s\n' "$BADGING" | grep -F "$permission" >/dev/null; then
      echo "POLİTİKA HATASI: APK gereksiz hassas izin içeriyor: $permission" >&2
      exit 1
    fi
  done
fi

echo "DraBornGate Google Play otomatik politika kapısı başarıyla geçti."
