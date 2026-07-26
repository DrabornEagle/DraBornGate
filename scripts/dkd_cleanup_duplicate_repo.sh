#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

CANONICAL_DIR="$HOME/projects/DraBornGate"
DUPLICATE_DIR="$HOME/DraBornGate"
DOWNLOAD_DIR="$HOME/storage/downloads"
STAMP="$(date +%Y%m%d-%H%M%S)"

pkg install -y zip >/dev/null

if [ ! -d "$CANONICAL_DIR/.git" ]; then
  echo "HATA: Ana repo bulunamadı: $CANONICAL_DIR"
  echo "Hiçbir klasör silinmedi."
  exit 1
fi

CANONICAL_ORIGIN="$(git -C "$CANONICAL_DIR" remote get-url origin 2>/dev/null || true)"
case "$CANONICAL_ORIGIN" in
  *DrabornEagle/DraBornGate.git|*DrabornEagle/DraBornGate)
    ;;
  *)
    echo "HATA: Ana klasör DraBornGate GitHub reposu olarak doğrulanamadı."
    echo "Hiçbir klasör silinmedi."
    exit 1
    ;;
esac

if [ ! -d "$DOWNLOAD_DIR" ]; then
  echo "Termux depolama iznini onayla."
  termux-setup-storage
  sleep 2
fi
mkdir -p "$DOWNLOAD_DIR"

if [ -d "$DUPLICATE_DIR" ]; then
  BACKUP_FILE="$DOWNLOAD_DIR/DraBornGate-yanlis-klasor-yedegi-$STAMP.zip"
  cd "$HOME"
  zip -qr "$BACKUP_FILE" DraBornGate \
    -x 'DraBornGate/node_modules/*' \
       'DraBornGate/.expo/*' \
       'DraBornGate/android/.gradle/*' \
       'DraBornGate/android/app/build/*' \
       'DraBornGate/.git/objects/*'
  rm -rf -- "$DUPLICATE_DIR"
  echo "Yanlış klasör yedeklendi: $BACKUP_FILE"
  echo "Yanlış klasör silindi: $DUPLICATE_DIR"
else
  echo "Yanlış klasör zaten yok: $DUPLICATE_DIR"
fi

echo
echo "Kalan DraBornGate klasörleri:"
find "$HOME" -maxdepth 3 -type d -name DraBornGate -print | sort

echo
echo "Korunan tek ana repo: $CANONICAL_DIR"
