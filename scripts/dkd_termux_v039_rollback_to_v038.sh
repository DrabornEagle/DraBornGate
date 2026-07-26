#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

REPO_URL="https://github.com/DrabornEagle/DraBornGate.git"
REPO_DIR="$HOME/DraBornGate"
DOWNLOAD_DIR="$HOME/storage/downloads"
BACKUP_BRANCH="backup-v0.3.8-20260726"
STAMP="$(date +%Y%m%d-%H%M%S)"

pkg install -y git nodejs-lts zip unzip
mkdir -p "$DOWNLOAD_DIR"

if [ ! -d "$REPO_DIR/.git" ]; then
  git clone "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
CURRENT_VERSION="$(node -p 'try { require("./package.json").version } catch (_) { "bilinmiyor" }')"
ROLLBACK_BACKUP="$DOWNLOAD_DIR/DraBornGate-v${CURRENT_VERSION}-before-rollback-${STAMP}.zip"
cd "$HOME"
zip -qr "$ROLLBACK_BACKUP" DraBornGate \
  -x 'DraBornGate/node_modules/*' \
     'DraBornGate/.expo/*' \
     'DraBornGate/android/.gradle/*' \
     'DraBornGate/android/app/build/*' \
     'DraBornGate/.git/objects/*'

cd "$REPO_DIR"
git remote set-url origin "$REPO_URL"
git fetch origin --prune
git checkout -B rollback-v0.3.8 "origin/$BACKUP_BRANCH"
git reset --hard "origin/$BACKUP_BRANCH"
git clean -fd
npm install --no-audit --no-fund --package-lock=false
npm run typecheck

ROLLBACK_SHA="$(git rev-parse HEAD)"
BACKUP_SHA="$(git rev-parse origin/$BACKUP_BRANCH)"
WORKTREE_STATUS="$(git status --porcelain)"

[ "$ROLLBACK_SHA" = "$BACKUP_SHA" ]
[ -z "$WORKTREE_STATUS" ]

echo
echo "DraBornGate v0.3.8 yedeğine dönüldü."
echo "Geri alma öncesi yedek: $ROLLBACK_BACKUP"
echo "Aktif commit: $ROLLBACK_SHA"
echo "Yedek dalı ile eşit ve çalışma ağacı temiz."
