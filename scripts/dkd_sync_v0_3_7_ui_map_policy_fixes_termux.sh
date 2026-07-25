#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

REPO="$HOME/projects/DraBornGate"
BRANCH="main"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="/sdcard/Download/DraBornGate-v0.3.7-before-ui-map-policy-sync-${STAMP}.zip"

pkg update -y
pkg install -y git nodejs-lts zip unzip
termux-setup-storage >/dev/null 2>&1 || true

if [ ! -d "$REPO/.git" ]; then
  echo "DraBornGate Git deposu bulunamadı: $REPO"
  exit 1
fi

cd "$REPO"
echo "1/7 Mevcut lokal kaynak yedekleniyor..."
zip -r "$BACKUP" . \
  -x '.git/*' 'node_modules/*' 'android/*' 'dist/*' '.expo/*' >/dev/null

echo "2/7 GitHub bağlantısı ayarlanıyor..."
git remote set-url origin https://github.com/DrabornEagle/DraBornGate.git

echo "3/7 GitHub main alınıyor..."
git fetch origin "$BRANCH" --prune

echo "4/7 Lokal repo GitHub main ile birebir eşitleniyor..."
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
rm -rf node_modules android dist .expo

echo "5/7 Bağımlılıklar kuruluyor..."
npm install --no-audit --no-fund

echo "6/7 TypeScript kontrolü yapılıyor..."
npm run typecheck

echo "7/7 Sürüm ve commit doğrulanıyor..."
LOCAL_VERSION="$(node -p "require('./package.json').version")"
LOCAL_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git rev-parse origin/$BRANCH)"

printf '\nDraBornGate lokal sürüm: %s\n' "$LOCAL_VERSION"
printf 'Lokal commit: %s\n' "$LOCAL_COMMIT"
printf 'GitHub commit: %s\n' "$REMOTE_COMMIT"
printf 'Yedek: %s\n' "$BACKUP"

test "$LOCAL_VERSION" = "0.3.7"
test "$LOCAL_COMMIT" = "$REMOTE_COMMIT"

echo "Lokal DraBornGate v0.3.7 ile GitHub main eşitlendi."
echo "Expo başlatma: cd $REPO && npx expo start --clear --tunnel"
