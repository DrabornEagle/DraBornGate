#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

DKD_REPO="$HOME/projects/DraBornGate"
DKD_BRANCH="main"
DKD_STAMP="$(date +%Y%m%d_%H%M%S)"
DKD_BACKUP="/sdcard/Download/DraBornGate-v0.3.11-before-v0.3.12-${DKD_STAMP}.zip"

pkg update -y
pkg install -y git nodejs-lts zip unzip
termux-setup-storage >/dev/null 2>&1 || true

if [ ! -d "$DKD_REPO/.git" ]; then
  echo "DraBornGate Git deposu bulunamadı: $DKD_REPO"
  exit 1
fi

cd "$DKD_REPO"
echo "1/8 Mevcut lokal v0.3.11 kaynak kodu yedekleniyor..."
zip -r "$DKD_BACKUP" . \
  -x '.git/*' 'node_modules/*' 'android/*' 'dist/*' '.expo/*' >/dev/null

echo "2/8 GitHub bağlantısı doğrulanıyor..."
git remote set-url origin https://github.com/DrabornEagle/DraBornGate.git

echo "3/8 GitHub main ve yedek dalı alınıyor..."
git fetch origin "$DKD_BRANCH" backup/draborngate-v0.3.11-before-v0.3.12 --prune

echo "4/8 Lokal repo GitHub main ile birebir eşitleniyor..."
git checkout "$DKD_BRANCH"
git reset --hard "origin/$DKD_BRANCH"
git clean -fd -e .env -e .env.local
rm -rf node_modules android dist .expo

echo "5/8 Bağımlılıklar ve v0.3.12 kaynak güncellemesi kuruluyor..."
npm install --no-audit --no-fund

echo "6/8 TypeScript kontrolü yapılıyor..."
npm run typecheck

echo "7/8 Sürüm doğrulanıyor..."
DKD_LOCAL_VERSION="$(node -p "require('./package.json').version")"
DKD_ANDROID_CODE="$(node -p "require('./app.json').expo.android.versionCode")"
test "$DKD_LOCAL_VERSION" = "0.3.12"
test "$DKD_ANDROID_CODE" = "2"

echo "8/8 Lokal ve GitHub commit eşitliği doğrulanıyor..."
DKD_LOCAL_COMMIT="$(git rev-parse HEAD)"
DKD_REMOTE_COMMIT="$(git rev-parse origin/$DKD_BRANCH)"
test "$DKD_LOCAL_COMMIT" = "$DKD_REMOTE_COMMIT"

printf '\nDraBornGate lokal sürüm: %s\n' "$DKD_LOCAL_VERSION"
printf 'Android versionCode: %s\n' "$DKD_ANDROID_CODE"
printf 'Lokal/GitHub commit: %s\n' "$DKD_LOCAL_COMMIT"
printf 'v0.3.11 yedeği: %s\n' "$DKD_BACKUP"
printf '\nKurulum ve eşitleme tamamlandı.\n'
