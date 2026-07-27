const fs = require('fs');
const path = require('path');

const dkdTarget = path.join(__dirname, 'dkd_apply_v0313_update.js');
let dkdSource = fs.readFileSync(dkdTarget, 'utf8');

const dkdBroken = '\\`${dkdPassUsage?.plan_remaining ?? 0} paket hakkı • ${dkdPassUsage?.bonus ?? 0} video ödülü\\`';
const dkdFixed = '\\`\\${dkdPassUsage?.plan_remaining ?? 0} paket hakkı • \\${dkdPassUsage?.bonus ?? 0} video ödülü\\`';

if (dkdSource.includes(dkdBroken)) {
  dkdSource = dkdSource.replaceAll(dkdBroken, dkdFixed);
  fs.writeFileSync(dkdTarget, dkdSource);
}

require(dkdTarget);
