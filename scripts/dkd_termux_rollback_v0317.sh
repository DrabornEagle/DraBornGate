#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

DKD_DEFAULT_REPO_DIR="$HOME/Projects/DraBornGate"
if [ ! -d "$DKD_DEFAULT_REPO_DIR/.git" ] && [ -d "$HOME/projects/DraBornGate/.git" ]; then DKD_DEFAULT_REPO_DIR="$HOME/projects/DraBornGate"; fi
DKD_REPO_DIR="${1:-$DKD_DEFAULT_REPO_DIR}"
DKD_BACKUP_BRANCH="backup/draborngate-v0.3.17-before-v0.3.18-20260803"
DKD_DOWNLOAD_DIR="/sdcard/Download/DraBornGate_Yedekler"
DKD_TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DKD_BACKUP_ZIP="$DKD_DOWNLOAD_DIR/DraBornGate_Local_Before_Rollback_to_v0.3.17_$DKD_TIMESTAMP.zip"

pkg install -y git nodejs-lts zip unzip ripgrep
termux-setup-storage >/dev/null 2>&1 || true
mkdir -p "$DKD_DOWNLOAD_DIR"
cd "$DKD_REPO_DIR"
zip -qr "$DKD_BACKUP_ZIP" . -x 'node_modules/*' 'android/*' '.expo/*' 'dist/*' '.git/*' '*.log'
git remote set-url origin https://github.com/DrabornEagle/DraBornGate.git
git fetch --prune origin
git show-ref --verify --quiet "refs/remotes/origin/$DKD_BACKUP_BRANCH"
git checkout -B local-v0.3.17-rollback "origin/$DKD_BACKUP_BRANCH"
git clean -fd -e .env -e .env.local -e node_modules
npm install --no-audit --no-fund --package-lock=false
test "$(node -p 'require("./package.json").version')" = "0.3.17"
test "$(node -p 'require("./app.json").expo.android.versionCode')" = "7"
printf '\nLokal proje v0.3.17 sürümüne döndü. GitHub main değişmedi.\nYedek ZIP: %s\nLokal SHA: %s\n' "$DKD_BACKUP_ZIP" "$(git rev-parse HEAD)"
