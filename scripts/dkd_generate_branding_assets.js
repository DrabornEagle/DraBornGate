const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.join(__dirname, '..');
const BRANDING = path.join(ROOT, 'assets', 'branding');
const SOURCE = path.join(BRANDING, 'draborngate-app-icon.png');
const SAFE_ICON = path.join(BRANDING, 'draborngate-app-icon-safe.png');
const FOREGROUND_ICON = path.join(BRANDING, 'draborngate-app-icon-foreground.png');
const BLANK_SPLASH = path.join(BRANDING, 'draborngate-splash-blank.png');
const TRANSPARENT_SPLASH = path.join(BRANDING, 'draborngate-splash-transparent.png');

function createCanvas(width, height, rgba) {
  const png = new PNG({ width, height });
  for (let index = 0; index < png.data.length; index += 4) {
    png.data[index] = rgba[0];
    png.data[index + 1] = rgba[1];
    png.data[index + 2] = rgba[2];
    png.data[index + 3] = rgba[3];
  }
  return png;
}

function blendPixel(target, targetIndex, source, sourceIndex) {
  const alpha = source.data[sourceIndex + 3] / 255;
  const inverse = 1 - alpha;
  target.data[targetIndex] = Math.round(source.data[sourceIndex] * alpha + target.data[targetIndex] * inverse);
  target.data[targetIndex + 1] = Math.round(source.data[sourceIndex + 1] * alpha + target.data[targetIndex + 1] * inverse);
  target.data[targetIndex + 2] = Math.round(source.data[sourceIndex + 2] * alpha + target.data[targetIndex + 2] * inverse);
  target.data[targetIndex + 3] = Math.round((alpha + target.data[targetIndex + 3] / 255 * inverse) * 255);
}

function drawScaled(source, target, scale) {
  const drawWidth = Math.max(1, Math.round(target.width * scale));
  const drawHeight = Math.max(1, Math.round(target.height * scale));
  const offsetX = Math.floor((target.width - drawWidth) / 2);
  const offsetY = Math.floor((target.height - drawHeight) / 2);

  for (let y = 0; y < drawHeight; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor(y * source.height / drawHeight));
    for (let x = 0; x < drawWidth; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor(x * source.width / drawWidth));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const targetIndex = ((offsetY + y) * target.width + offsetX + x) * 4;
      blendPixel(target, targetIndex, source, sourceIndex);
    }
  }
}

function writePng(target, png) {
  fs.writeFileSync(target, PNG.sync.write(png, { colorType: 6, inputColorType: 6 }));
}

function ensureBrandingAssets() {
  fs.mkdirSync(BRANDING, { recursive: true });
  if (!fs.existsSync(SOURCE)) throw new Error(`DraBornGate kaynak ikonu bulunamadı: ${SOURCE}`);

  const source = PNG.sync.read(fs.readFileSync(SOURCE));

  const safe = createCanvas(1024, 1024, [2, 7, 13, 255]);
  drawScaled(source, safe, 0.76);
  writePng(SAFE_ICON, safe);

  const foreground = createCanvas(1024, 1024, [0, 0, 0, 0]);
  drawScaled(source, foreground, 0.62);
  writePng(FOREGROUND_ICON, foreground);

  writePng(BLANK_SPLASH, createCanvas(16, 16, [2, 7, 13, 255]));
  writePng(TRANSPARENT_SPLASH, createCanvas(16, 16, [0, 0, 0, 0]));
}

if (require.main === module) ensureBrandingAssets();
module.exports = { ensureBrandingAssets };
