#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
pkg update -y
pkg install -y git nodejs-lts zip unzip
cd "$HOME"
STAMP="$(date +%Y%m%d-%H%M%S)"
if [ -d DraBornGate ]; then
  zip -qr "$HOME/storage/downloads/DraBornGate-v0.3.7-backup-$STAMP.zip" DraBornGate -x 'DraBornGate/node_modules/*' 'DraBornGate/.expo/*' 'DraBornGate/android/.gradle/*' 'DraBornGate/android/app/build/*'
else
  git clone https://github.com/DrabornEagle/DraBornGate.git DraBornGate
fi
cd DraBornGate
git fetch --all --prune
git reset --hard origin/main
git clean -fd
npm install --no-audit --no-fund
npm run typecheck
printf '\nDraBornGate lokal repo GitHub main ile eşitlendi. Sürüm: '
node -p 'require("./package.json").version'
