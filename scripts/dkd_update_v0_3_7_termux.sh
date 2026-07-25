#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

DKD_REPO="$HOME/DraBornGate"
DKD_REMOTE="https://github.com/DrabornEagle/DraBornGate.git"
DKD_TARGET_VERSION="0.3.7"
DKD_NOW="$(date +%Y%m%d_%H%M%S)"
DKD_DOWNLOAD="/sdcard/Download"

pkg update -y
pkg install -y git nodejs-lts zip unzip
mkdir -p "$DKD_DOWNLOAD"

if [ -d "$DKD_REPO/.git" ]; then
  DKD_OLD_VERSION="$(node -p "require('$DKD_REPO/package.json').version" 2>/dev/null || printf 'bilinmiyor')"
  cd "$DKD_REPO"
  zip -qr "$DKD_DOWNLOAD/DraBornGate_v${DKD_OLD_VERSION}_before_v${DKD_TARGET_VERSION}_${DKD_NOW}.zip" . \
    -x '.git/*' 'node_modules/*' 'android/*' 'dist/*' '.expo/*'
else
  git clone "$DKD_REMOTE" "$DKD_REPO"
  cd "$DKD_REPO"
fi

git fetch --prune origin
git checkout -B main origin/main
git reset --hard origin/main
git clean -fd -e node_modules/

npm install --no-audit --no-fund
npm run typecheck

DKD_INSTALLED_VERSION="$(node -p "require('./package.json').version")"
if [ "$DKD_INSTALLED_VERSION" != "$DKD_TARGET_VERSION" ]; then
  echo "Sürüm doğrulaması başarısız: $DKD_INSTALLED_VERSION" >&2
  exit 1
fi

echo "DraBornGate v${DKD_INSTALLED_VERSION} GitHub main ile eşitlendi."
echo "Yedekler: $DKD_DOWNLOAD"
echo "Expo Go başlatılıyor..."
npx expo start -c --go
