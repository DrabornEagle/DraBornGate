#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

DKD_REPO_DIR="${1:-$HOME/projects/DraBornGate}"
DKD_DOWNLOAD_DIR="/sdcard/Download/DraBornGate_Yedekler"
DKD_BACKUP_BRANCH="backup/draborngate-v0.3.13-before-v0.3.14"
DKD_TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DKD_BACKUP_ZIP="$DKD_DOWNLOAD_DIR/DraBornGate_Backup_v0.3.13_before_v0.3.14_$DKD_TIMESTAMP.zip"

pkg install -y git nodejs-lts zip unzip ripgrep
termux-setup-storage >/dev/null 2>&1 || true
mkdir -p "$DKD_DOWNLOAD_DIR" "$(dirname "$DKD_REPO_DIR")"

if [ ! -d "$DKD_REPO_DIR/.git" ]; then
  rm -rf "$DKD_REPO_DIR"
  git clone https://github.com/DrabornEagle/DraBornGate.git "$DKD_REPO_DIR"
fi

cd "$DKD_REPO_DIR"

echo "[1/6] Mevcut yerel kaynak yedekleniyor..."
zip -qr "$DKD_BACKUP_ZIP" . \
  -x 'node_modules/*' 'android/*' '.expo/*' 'dist/*' '.git/*' '*.log'
printf 'Yedek: %s\n' "$DKD_BACKUP_ZIP"

echo "[2/6] GitHub v0.3.13 yedek dalı doğrulanıyor..."
git fetch --prune origin
git show-ref --verify --quiet "refs/remotes/origin/$DKD_BACKUP_BRANCH"

echo "[3/6] Projects/DraBornGate main dalı GitHub main ile birebir eşitleniyor..."
git checkout main
git reset --hard origin/main
git clean -fd -e .env -e .env.local -e node_modules

echo "[4/6] Bağımlılıklar kuruluyor..."
npm install --no-audit --no-fund --package-lock=false

echo "[5/6] Sürüm, TypeScript ve Google Play politika kontrolü çalıştırılıyor..."
node scripts/dkd_verify_v0314.js
npm run typecheck
bash scripts/dkd_google_play_policy_gate.sh

echo "[6/6] Yerel ve GitHub eşitliği doğrulanıyor..."
DKD_LOCAL_SHA="$(git rev-parse HEAD)"
DKD_REMOTE_SHA="$(git rev-parse origin/main)"
test "$DKD_LOCAL_SHA" = "$DKD_REMOTE_SHA"
test "$(node -p 'require("./package.json").version')" = "0.3.14"
test "$(node -p 'require("./app.json").expo.android.versionCode')" = "4"
git status --short

printf '\nDraBornGate v0.3.14 hazır.\nYerel/GitHub SHA: %s\nYedek ZIP: %s\n' "$DKD_LOCAL_SHA" "$DKD_BACKUP_ZIP"
