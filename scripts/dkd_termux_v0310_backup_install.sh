#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

REPO_URL="https://github.com/DrabornEagle/DraBornGate.git"
REPO_DIR="$HOME/DraBornGate"
DOWNLOAD_DIR="$HOME/storage/downloads"
BACKUP_BRANCH="backup-v0.3.9-20260726-2235"
EXPECTED_VERSION="0.3.10"
STAMP="$(date +%Y%m%d-%H%M%S)"

pkg update -y
pkg install -y git nodejs-lts zip unzip

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
git remote set-url origin "$REPO_URL"
git fetch origin --prune
git checkout -B main origin/main
git reset --hard origin/main
git clean -fd
rm -rf .expo
npm install --no-audit --no-fund --package-lock=false
npm run typecheck

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main)"
VERSION="$(node -p 'require("./package.json").version')"
ANDROID_VERSION_CODE="$(node -p 'require("./app.json").expo.android.versionCode')"
WORKTREE_STATUS="$(git status --porcelain)"

[ "$VERSION" = "$EXPECTED_VERSION" ]
[ "$ANDROID_VERSION_CODE" = "1" ]
[ "$LOCAL_SHA" = "$REMOTE_SHA" ]
[ -z "$WORKTREE_STATUS" ]

echo
echo "DraBornGate kaynak kurulumu tamamlandı."
echo "Sürüm: $VERSION"
echo "Android versionCode: $ANDROID_VERSION_CODE"
echo "Lokal SHA:  $LOCAL_SHA"
echo "GitHub SHA: $REMOTE_SHA"
echo "Geri dönüş yedeği: origin/$BACKUP_BRANCH"
echo "Lokal ve GitHub birebir eşit; çalışma ağacı temiz."
echo
echo "Expo Go testi için:"
echo "cd \"$REPO_DIR\" && npm run start:termux"
echo "Kurulu DraBornGate APK ikonunu değil, Expo Go içindeki projeyi aç."
