const fs = require('fs');
const path = require('path');

function patchFile(relativePath, replacements) {
  const target = path.join(__dirname, '..', relativePath);
  let source = fs.readFileSync(target, 'utf8');
  for (const [before, after] of replacements) {
    if (source.includes(before)) source = source.replace(before, after);
  }
  fs.writeFileSync(target, source);
}

function applyPatch() {
  patchFile('src/screens/ManagementHomeV031.tsx', [
    [
      '<FadeInView style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>SİTE YÖNETİM MERKEZİ</Text><Text style={styles.title}>DraBornGate v{APP_VERSION}</Text><Text style={styles.subtitle}>Kurye Geçişi • Ziyaretçi Geçişi • Kurallar • Aidat ve Finans</Text></View><LiveBadge label="CANLI" /></FadeInView>',
      '<FadeInView style={styles.header}><View style={styles.headerCopy}><View style={styles.managementTitleRow}><Text style={styles.eyebrow}>SİTE YÖNETİM MERKEZİ</Text><LiveBadge label="CANLI" compact /></View><Text style={styles.title}>DraBornGate v{APP_VERSION}</Text><Text style={styles.subtitle}>Kurye Geçişi • Ziyaretçi Geçişi • Kurallar • Aidat ve Finans</Text></View></FadeInView>',
    ],
    [
      'headerCopy: { flex: 1 }, eyebrow:',
      "headerCopy: { flex: 1 }, managementTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, eyebrow:",
    ],
  ]);

  patchFile('src/screens/CourierHome.tsx', [
    [
      "<LinearGradient colors={tracking ? ['rgba(255,179,92,.28)', 'rgba(255,101,125,.18)'] : ['rgba(55,216,255,.26)', 'rgba(139,107,255,.22)']} style={s.secondaryButton}><Ionicons name={tracking ? 'pause' : 'locate'} size={21} color={tracking ? colors.orange : colors.cyan} /><Text style={[s.secondaryText, tracking && { color: colors.orange }]}>",
      "<LinearGradient colors={tracking ? [colors.orange, colors.red] : [colors.cyan, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.secondaryButton}><Ionicons name={tracking ? 'pause' : 'locate'} size={22} color={colors.background} /><Text style={s.secondaryText}>",
    ],
    [
      "secondaryButton: { minHeight: 56, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 7 }, secondaryText: { color: colors.cyan, fontSize: 10, fontWeight: '900', textAlign: 'center' },",
      "secondaryButton: { minHeight: 58, borderRadius: 19, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.72)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 9 }, secondaryText: { color: colors.background, fontSize: 11, lineHeight: 15, fontWeight: '900', textAlign: 'center' },",
    ],
  ]);
}

if (require.main === module) applyPatch();
module.exports = { applyPatch };
