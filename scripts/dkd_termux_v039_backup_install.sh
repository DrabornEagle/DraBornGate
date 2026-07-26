#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

REPO_URL="https://github.com/DrabornEagle/DraBornGate.git"
REPO_DIR="$HOME/projects/DraBornGate"
REPO_PARENT="$(dirname "$REPO_DIR")"
REPO_NAME="$(basename "$REPO_DIR")"
DOWNLOAD_DIR="$HOME/storage/downloads"
BACKUP_BRANCH="backup-v0.3.8-20260726"
EXPECTED_VERSION="0.3.9"
STAMP="$(date +%Y%m%d-%H%M%S)"

pkg update -y
pkg install -y git nodejs-lts zip unzip
mkdir -p "$REPO_PARENT"

if [ ! -d "$DOWNLOAD_DIR" ]; then
  echo "Termux depolama iznini onayla."
  termux-setup-storage
  sleep 2
fi
mkdir -p "$DOWNLOAD_DIR"

if [ -d "$REPO_DIR/.git" ]; then
  cd "$REPO_DIR"
  OLD_VERSION="$(node -p 'try { require("./package.json").version } catch (_) { "bilinmiyor" }')"
  BACKUP_FILE="$DOWNLOAD_DIR/DraBornGate-v${OLD_VERSION}-before-v${EXPECTED_VERSION}-${STAMP}.zip"
  cd "$REPO_PARENT"
  zip -qr "$BACKUP_FILE" "$REPO_NAME" \
    -x "$REPO_NAME/node_modules/*" \
       "$REPO_NAME/.expo/*" \
       "$REPO_NAME/android/.gradle/*" \
       "$REPO_NAME/android/app/build/*" \
       "$REPO_NAME/.git/objects/*"
  echo "Önceki lokal sürüm yedeklendi: $BACKUP_FILE"
else
  rm -rf "$REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
git remote set-url origin "$REPO_URL"
git fetch origin --prune
git checkout -B main origin/main
git reset --hard origin/main
git clean -fd
npm install --no-audit --no-fund --package-lock=false
npm run typecheck

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main)"
VERSION="$(node -p 'require("./package.json").version')"
WORKTREE_STATUS="$(git status --porcelain)"

[ "$VERSION" = "$EXPECTED_VERSION" ]
[ "$LOCAL_SHA" = "$REMOTE_SHA" ]
[ -z "$WORKTREE_STATUS" ]

echo
echo "DraBornGate kaynak kurulumu tamamlandı."
echo "Sürüm: $VERSION"
echo "Lokal SHA:  $LOCAL_SHA"
echo "GitHub SHA: $REMOTE_SHA"
echo "Geri alma dalı: origin/$BACKUP_BRANCH"
echo "Lokal ve GitHub birebir eşit; çalışma ağacı temiz."

APK_FILE="$DOWNLOAD_DIR/DraBornGate-v${EXPECTED_VERSION}-release.apk"
if [ -s "$APK_FILE" ]; then
  echo "Release APK bulundu, Android yükleyicisi açılıyor: $APK_FILE"
  termux-open "$APK_FILE"
else
  echo "APK henüz Download klasöründe değil. İndirdikten sonra şu komutu çalıştır:"
  echo "termux-open \"$APK_FILE\""
fi
