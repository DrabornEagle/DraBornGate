const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'screens', 'ManagementHomeV031.tsx');

function applyPatch() {
  let source = fs.readFileSync(target, 'utf8');

  const oldHeader = '<FadeInView style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>SİTE YÖNETİM MERKEZİ</Text><Text style={styles.title}>DraBornGate v{APP_VERSION}</Text><Text style={styles.subtitle}>Kurye Geçişi • Ziyaretçi Geçişi • Kurallar • Aidat ve Finans</Text></View><LiveBadge label="CANLI" /></FadeInView>';
  const newHeader = '<FadeInView style={styles.header}><View style={styles.headerCopy}><View style={styles.managementTitleRow}><Text style={styles.eyebrow}>SİTE YÖNETİM MERKEZİ</Text><LiveBadge label="CANLI" compact /></View><Text style={styles.title}>DraBornGate v{APP_VERSION}</Text><Text style={styles.subtitle}>Kurye Geçişi • Ziyaretçi Geçişi • Kurallar • Aidat ve Finans</Text></View></FadeInView>';

  if (source.includes(oldHeader)) source = source.replace(oldHeader, newHeader);

  const oldStyle = "headerCopy: { flex: 1 }, eyebrow:";
  const newStyle = "headerCopy: { flex: 1 }, managementTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, eyebrow:";
  if (source.includes(oldStyle)) source = source.replace(oldStyle, newStyle);

  fs.writeFileSync(target, source);
}

if (require.main === module) applyPatch();
module.exports = { applyPatch };
