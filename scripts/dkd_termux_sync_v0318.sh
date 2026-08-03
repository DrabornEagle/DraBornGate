#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

DKD_DEFAULT_REPO_DIR="$HOME/Projects/DraBornGate"
if [ ! -d "$DKD_DEFAULT_REPO_DIR/.git" ] && [ -d "$HOME/projects/DraBornGate/.git" ]; then DKD_DEFAULT_REPO_DIR="$HOME/projects/DraBornGate"; fi
DKD_REPO_DIR="${1:-$DKD_DEFAULT_REPO_DIR}"
DKD_DOWNLOAD_DIR="/sdcard/Download/DraBornGate_Yedekler"
DKD_BACKUP_BRANCH="backup/draborngate-v0.3.17-before-v0.3.18-20260803"
DKD_TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DKD_BACKUP_ZIP="$DKD_DOWNLOAD_DIR/DraBornGate_Local_Before_v0.3.18_Sync_$DKD_TIMESTAMP.zip"

pkg install -y git nodejs-lts zip unzip ripgrep
termux-setup-storage >/dev/null 2>&1 || true
mkdir -p "$DKD_DOWNLOAD_DIR" "$(dirname "$DKD_REPO_DIR")"
if [ ! -d "$DKD_REPO_DIR/.git" ]; then rm -rf "$DKD_REPO_DIR"; git clone https://github.com/DrabornEagle/DraBornGate.git "$DKD_REPO_DIR"; fi
cd "$DKD_REPO_DIR"

echo "[1/6] Mevcut lokal kaynak ZIP olarak yedekleniyor..."
zip -qr "$DKD_BACKUP_ZIP" . -x 'node_modules/*' 'android/*' '.expo/*' 'dist/*' '.git/*' '*.log'
echo "[2/6] GitHub v0.3.17 geri alma dalı doğrulanıyor..."
git remote set-url origin https://github.com/DrabornEagle/DraBornGate.git
git fetch --prune origin
git show-ref --verify --quiet "refs/remotes/origin/$DKD_BACKUP_BRANCH"
echo "[3/6] Projects/DraBornGate GitHub main ile birebir eşitleniyor..."
git checkout main
git reset --hard origin/main
git clean -fd -e .env -e .env.local -e node_modules
echo "[4/6] Bağımlılıklar kuruluyor..."
npm install --no-audit --no-fund --package-lock=false
echo "[5/6] Sürüm, TypeScript ve Google Play politika kontrolleri çalışıyor..."
node scripts/dkd_verify_v0318.js
npm run typecheck
bash scripts/dkd_google_play_policy_gate.sh
echo "[6/6] Lokal ve GitHub eşitliği doğrulanıyor..."
DKD_LOCAL_SHA="$(git rev-parse HEAD)"
DKD_REMOTE_SHA="$(git rev-parse origin/main)"
test "$DKD_LOCAL_SHA" = "$DKD_REMOTE_SHA"
test "$(node -p 'require("./package.json").version')" = "0.3.18"
test "$(node -p 'require("./app.json").expo.android.versionCode')" = "8"
printf '\nDraBornGate v0.3.18 hazır.\nLokal/GitHub SHA: %s\nYedek ZIP: %s\nProje yolu: %s\n' "$DKD_LOCAL_SHA" "$DKD_BACKUP_ZIP" "$DKD_REPO_DIR"
