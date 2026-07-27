#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

DKD_DEFAULT_REPO_DIR="$HOME/Projects/DraBornGate"
if [ ! -d "$DKD_DEFAULT_REPO_DIR/.git" ] && [ -d "$HOME/projects/DraBornGate/.git" ]; then
  DKD_DEFAULT_REPO_DIR="$HOME/projects/DraBornGate"
fi
DKD_REPO_DIR="${1:-$DKD_DEFAULT_REPO_DIR}"
DKD_DOWNLOAD_DIR="/sdcard/Download/DraBornGate_Yedekler"
DKD_BACKUP_BRANCH="backup/draborngate-v0.3.14-before-v0.3.15-billing-state-fix"
DKD_LOCAL_ROLLBACK_BRANCH="rollback/draborngate-v0.3.14"
DKD_TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DKD_BACKUP_ZIP="$DKD_DOWNLOAD_DIR/DraBornGate_Local_Before_v0.3.14_Rollback_$DKD_TIMESTAMP.zip"

pkg install -y git nodejs-lts zip unzip ripgrep
termux-setup-storage >/dev/null 2>&1 || true
mkdir -p "$DKD_DOWNLOAD_DIR"

if [ ! -d "$DKD_REPO_DIR/.git" ]; then
  echo "DraBornGate Git deposu bulunamadı: $DKD_REPO_DIR" >&2
  exit 1
fi

cd "$DKD_REPO_DIR"

echo "[1/5] Mevcut v0.3.15 yerel kaynak yedekleniyor..."
zip -qr "$DKD_BACKUP_ZIP" . \
  -x 'node_modules/*' 'android/*' '.expo/*' 'dist/*' '.git/*' '*.log'
printf 'Yedek: %s\n' "$DKD_BACKUP_ZIP"

echo "[2/5] v0.3.14 güvenlik dalı alınıyor..."
git remote set-url origin https://github.com/DrabornEagle/DraBornGate.git
git fetch --prune origin
git show-ref --verify --quiet "refs/remotes/origin/$DKD_BACKUP_BRANCH"

echo "[3/5] Yalnızca yerel proje v0.3.14 geri alma dalına geçiriliyor..."
git checkout -B "$DKD_LOCAL_ROLLBACK_BRANCH" "origin/$DKD_BACKUP_BRANCH"
git clean -fd -e .env -e .env.local -e node_modules

echo "[4/5] v0.3.14 bağımlılık ve kaynak kontrolleri çalıştırılıyor..."
npm install --no-audit --no-fund --package-lock=false
node scripts/dkd_verify_v0314.js
npm run typecheck
bash scripts/dkd_google_play_policy_gate.sh

echo "[5/5] Geri alma doğrulanıyor..."
test "$(node -p 'require("./package.json").version')" = "0.3.14"
test "$(node -p 'require("./app.json").expo.android.versionCode')" = "4"
DKD_LOCAL_SHA="$(git rev-parse HEAD)"
DKD_BACKUP_SHA="$(git rev-parse "origin/$DKD_BACKUP_BRANCH")"
test "$DKD_LOCAL_SHA" = "$DKD_BACKUP_SHA"

printf '\nDraBornGate yerel proje v0.3.14 sürümüne geri alındı.\nSHA: %s\nYedek ZIP: %s\nGitHub main değiştirilmedi.\nTekrar güncel sürüme dönmek için:\ncd "%s" && git checkout main && git fetch origin main && git reset --hard origin/main\n' "$DKD_LOCAL_SHA" "$DKD_BACKUP_ZIP" "$DKD_REPO_DIR"