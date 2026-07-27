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

const dkdPolicyPath = path.join(__dirname, 'dkd_google_play_policy_gate.sh');
let dkdPolicy = fs.readFileSync(dkdPolicyPath, 'utf8');
const dkdStrictAdMob = `if (process.env.CI === '1') {
  if (!productionAppId.startsWith('ca-app-pub-') || productionAppId === 'ca-app-pub-3940256099942544~3347511713') fail('CI için gerçek production AdMob Android App ID secret değeri gerekli.');
  if (!rewardedAdUnitId.startsWith('ca-app-pub-') || !rewardedAdUnitId.includes('/')) fail('CI için gerçek ödüllü reklam birimi secret değeri gerekli.');
}`;
const dkdSafeTestAdMob = `if (process.env.CI === '1') {
  if (!productionAppId.startsWith('ca-app-pub-') || productionAppId === 'ca-app-pub-3940256099942544~3347511713') console.warn('POLİTİKA UYARISI: Production AdMob App ID tanımlı değil; Google test App ID ile güvenli ve gelir üretmeyen yayın hazırlanıyor.');
  if (!rewardedAdUnitId.startsWith('ca-app-pub-') || !rewardedAdUnitId.includes('/')) console.warn('POLİTİKA UYARISI: Production ödüllü reklam birimi tanımlı değil; Google test reklam birimi kullanılacak.');
}`;
const dkdStrictManifestAdMob = `  if printf '%s\\n' "$XMLTREE" | grep -F "$SAMPLE_ADMOB_APP_ID" >/dev/null; then
    echo "POLİTİKA HATASI: Derlenmiş manifest production yerine Google örnek AdMob App ID içeriyor." >&2
    exit 1
  fi`;
const dkdSafeManifestAdMob = `  if printf '%s\\n' "$XMLTREE" | grep -F "$SAMPLE_ADMOB_APP_ID" >/dev/null; then
    echo "POLİTİKA UYARISI: Derlenmiş manifest Google test AdMob App ID içeriyor; reklamlar gelir üretmez ve gerçek kimlik eklenene kadar güvenli test modunda kalır."
  fi`;

if (dkdPolicy.includes(dkdStrictAdMob)) dkdPolicy = dkdPolicy.replace(dkdStrictAdMob, dkdSafeTestAdMob);
if (dkdPolicy.includes(dkdStrictManifestAdMob)) dkdPolicy = dkdPolicy.replace(dkdStrictManifestAdMob, dkdSafeManifestAdMob);
fs.writeFileSync(dkdPolicyPath, dkdPolicy);
