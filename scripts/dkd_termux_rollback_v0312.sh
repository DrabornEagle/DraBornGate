#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

DKD_REPO_DIR="${1:-$HOME/DraBornGate}"
DKD_BACKUP_BRANCH="backup/draborngate-v0.3.12-before-v0.3.13"

pkg install -y git nodejs-lts
cd "$DKD_REPO_DIR"

git fetch --prune origin
git show-ref --verify --quiet "refs/remotes/origin/$DKD_BACKUP_BRANCH"
git checkout main
git reset --hard "origin/$DKD_BACKUP_BRANCH"
git clean -fd -e .env -e .env.local -e node_modules
npm install --no-audit --no-fund --package-lock=false
npm run typecheck

printf '\nYerel DraBornGate v0.3.12 yedeğine döndürüldü.\nSHA: %s\n' "$(git rev-parse HEAD)"
printf 'GitHub main dalını da geri almak gerekirse ayrıca şu komutu çalıştır:\n'
printf 'git push --force-with-lease origin main\n'
