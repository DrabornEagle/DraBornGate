import fs from 'node:fs';
import path from 'node:path';

// DraBornGate v0.3.2 tek seferlik görünür metin temizliği.
const replacements = new Map([
  ['CourierPass + AirPass + VisitorPass', 'Kurye Geçişi + Akıllı Geçiş + Ziyaretçi Geçişi'],
  [">CourierPass<", ">Kurye Geçişi<"],
  [">VisitorPass<", ">Ziyaretçi Geçişi<"],
  ['AirPass güvenliğe gönderildi', 'Akıllı Geçiş güvenliğe gönderildi'],
  ['erişilebilir CourierPass yok.', 'erişilebilir kurye geçişi yok.'],
  ['VisitorPass bilgilerini görmek', 'Ziyaretçi geçişi bilgilerini görmek'],
  ['AirPass oranı', 'Akıllı Geçiş oranı'],
  ['AirPass', 'Akıllı Geçiş'],
  ['CourierPass', 'Kurye Geçişi'],
  ['VisitorPass', 'Ziyaretçi Geçişi'],
]);

const textExtensions = new Set(['.tsx', '.ts']);
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (textExtensions.has(path.extname(entry.name))) {
      const source = fs.readFileSync(full, 'utf8');
      let next = source;
      for (const [from, to] of replacements) {
        if (from === 'AirPass' || from === 'CourierPass' || from === 'VisitorPass') continue;
        next = next.split(from).join(to);
      }
      if (next !== source) fs.writeFileSync(full, next);
    }
  }
}
walk('src/screens');

const lockPath = 'package-lock.json';
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  lock.version = '0.3.2';
  if (lock.packages?.['']) lock.packages[''].version = '0.3.2';
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}
