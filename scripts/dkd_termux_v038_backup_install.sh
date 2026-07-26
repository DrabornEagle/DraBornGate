#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

REPO_URL="https://github.com/DrabornEagle/DraBornGate.git"
REPO_DIR="$HOME/DraBornGate"
DOWNLOAD_DIR="$HOME/storage/downloads"
STAMP="$(date +%Y%m%d-%H%M%S)"

pkg update -y
pkg install -y git nodejs-lts zip unzip

if [ ! -d "$DOWNLOAD_DIR" ]; then
  echo "Termux depolama izni hazırlanıyor. Açılan Android iznini onayla."
  termux-setup-storage
  sleep 2
fi
mkdir -p "$DOWNLOAD_DIR"

if [ -d "$REPO_DIR/.git" ]; then
  cd "$REPO_DIR"
  OLD_VERSION="$(node -p 'try { require("./package.json").version } catch (_) { "bilinmiyor" }')"
  BACKUP_FILE="$DOWNLOAD_DIR/DraBornGate-v${OLD_VERSION}-backup-${STAMP}.zip"
  cd "$HOME"
  zip -qr "$BACKUP_FILE" DraBornGate \
    -x 'DraBornGate/node_modules/*' \
       'DraBornGate/.expo/*' \
       'DraBornGate/android/.gradle/*' \
       'DraBornGate/android/app/build/*' \
       'DraBornGate/.git/objects/*'
  echo "Önceki lokal sürüm yedeklendi: $BACKUP_FILE"
else
  rm -rf "$REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
git fetch origin --prune
git reset --hard origin/main
git clean -fd
npm install --no-audit --no-fund
npm run typecheck

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main)"
VERSION="$(node -p 'require("./package.json").version')"

echo
echo "DraBornGate lokal repo GitHub main ile eşitlendi."
echo "Sürüm: $VERSION"
echo "Lokal SHA:  $LOCAL_SHA"
echo "GitHub SHA: $REMOTE_SHA"
test "$LOCAL_SHA" = "$REMOTE_SHA"
echo "Lokal ve GitHub birebir eşit."
