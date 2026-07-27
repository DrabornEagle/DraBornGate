#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

DKD_DEFAULT_REPO_DIR="$HOME/Projects/DraBornGate"
if [ ! -d "$DKD_DEFAULT_REPO_DIR/.git" ] && [ -d "$HOME/projects/DraBornGate/.git" ]; then
  DKD_DEFAULT_REPO_DIR="$HOME/projects/DraBornGate"
fi
DKD_REPO_DIR="${1:-$DKD_DEFAULT_REPO_DIR}"
DKD_DOWNLOAD_DIR="/sdcard/Download/DraBornGate_Yedekler"
DKD_BACKUP_BRANCH="backup/draborngate-v0.3.13-before-v0.3.14"
DKD_TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DKD_CURRENT_ZIP="$DKD_DOWNLOAD_DIR/DraBornGate_Before_Rollback_v0.3.14_$DKD_TIMESTAMP.zip"

pkg install -y git nodejs-lts zip unzip ripgrep
termux-setup-storage >/dev/null 2>&1 || true
mkdir -p "$DKD_DOWNLOAD_DIR"
test -d "$DKD_REPO_DIR/.git"
cd "$DKD_REPO_DIR"

echo "[1/5] Geri alma öncesi mevcut v0.3.14 kaynakları yedekleniyor..."
zip -qr "$DKD_CURRENT_ZIP" . \
  -x 'node_modules/*' 'android/*' '.expo/*' 'dist/*' '.git/*' '*.log'

echo "[2/5] GitHub yedek dalı alınıyor..."
git fetch --prune origin
git show-ref --verify --quiet "refs/remotes/origin/$DKD_BACKUP_BRANCH"

echo "[3/5] Yerel main v0.3.13 yedeğine döndürülüyor..."
git checkout main
git reset --hard "origin/$DKD_BACKUP_BRANCH"
git clean -fd -e .env -e .env.local -e node_modules

echo "[4/5] v0.3.13 bağımlılık ve kontrolleri kuruluyor..."
DKD_SKIP_POSTINSTALL_UPDATE=1 npm install --no-audit --no-fund --package-lock=false
npm run typecheck

echo "[5/5] Sürüm doğrulanıyor..."
test "$(node -p 'require("./package.json").version')" = "0.3.13"
test "$(node -p 'require("./app.json").expo.android.versionCode')" = "3"
DKD_ROLLBACK_SHA="$(git rev-parse HEAD)"

printf '\nYerel proje v0.3.13 yedeğine döndü.\nSHA: %s\nGeri alma öncesi ZIP: %s\nProje yolu: %s\nGitHub main değiştirilmedi.\n' "$DKD_ROLLBACK_SHA" "$DKD_CURRENT_ZIP" "$DKD_REPO_DIR"
