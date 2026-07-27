#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

DKD_REPO="$HOME/projects/DraBornGate"
DKD_BACKUP_BRANCH="backup/draborngate-v0.3.11-before-v0.3.12"
DKD_STAMP="$(date +%Y%m%d_%H%M%S)"
DKD_SAFETY_BACKUP="/sdcard/Download/DraBornGate-v0.3.12-before-rollback-${DKD_STAMP}.zip"
DKD_PUSH_REMOTE="${1:-}"

pkg install -y git nodejs-lts zip unzip
termux-setup-storage >/dev/null 2>&1 || true
cd "$DKD_REPO"

zip -r "$DKD_SAFETY_BACKUP" . \
  -x '.git/*' 'node_modules/*' 'android/*' 'dist/*' '.expo/*' >/dev/null

git remote set-url origin https://github.com/DrabornEagle/DraBornGate.git
git fetch origin main "$DKD_BACKUP_BRANCH" --prune
git checkout main
git reset --hard "origin/$DKD_BACKUP_BRANCH"
git clean -fd -e .env -e .env.local
rm -rf node_modules android dist .expo
npm install --no-audit --no-fund
npm run typecheck

test "$(node -p "require('./package.json').version")" = "0.3.11"

if [ "$DKD_PUSH_REMOTE" = "--github" ]; then
  git push --force-with-lease origin HEAD:main
  git fetch origin main
  test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
fi

printf '\nDraBornGate v0.3.11 geri yüklendi.\n'
printf 'Geri alma öncesi v0.3.12 yedeği: %s\n' "$DKD_SAFETY_BACKUP"
if [ "$DKD_PUSH_REMOTE" = "--github" ]; then
  printf 'GitHub main de v0.3.11 yedeğine geri alındı.\n'
else
  printf 'Yalnızca lokal repo geri alındı. GitHub için komutu --github ile çalıştır.\n'
fi
