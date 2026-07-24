import fs from 'node:fs';

function replaceOrThrow(file, before, after) {
  const current = fs.readFileSync(file, 'utf8');
  if (!current.includes(before)) throw new Error(`${file}: expected block not found`);
  fs.writeFileSync(file, current.replace(before, after));
}

replaceOrThrow(
  'src/types.ts',
  "export type DeliveryPlatform = 'Trendyol Go' | 'Yemeksepeti' | 'Getir' | 'DraBornGo' | 'Diğer';",
  "export type DeliveryPlatform = 'Trendyol/Uber Eats' | 'Yemeksepeti' | 'Getir' | 'DraBornGo' | 'Diğer';",
);

{
  const file = 'src/store/GateContext.tsx';
  const current = fs.readFileSync(file, 'utf8');
  if (!current.includes("'Trendyol Go'")) throw new Error(`${file}: old platform token not found`);
  fs.writeFileSync(file, current.replaceAll("'Trendyol Go'", "'Trendyol/Uber Eats'"));
}

replaceOrThrow('src/components/SiteLocationPicker.tsx', 'backgroundColor: colors.panel', 'backgroundColor: colors.surface');

replaceOrThrow(
  'src/screens/ProfileScreen.tsx',
  "import { pickProfilePhoto, uploadProfilePhotoAsset } from '../lib/gateMedia';\nimport { useGate } from '../store/GateContext';",
  "import { pickProfilePhoto, uploadProfilePhotoAsset } from '../lib/gateMedia';\nimport { supabase } from '../lib/supabase';\nimport { useGate } from '../store/GateContext';",
);
replaceOrThrow(
  'src/screens/ProfileScreen.tsx',
  "const { error } = await (await import('../lib/supabase')).supabase.rpc('dkd_gate_set_avatar', { p_avatar_url: path });",
  "const { error } = await supabase.rpc('dkd_gate_set_avatar', { p_avatar_url: path });",
);

replaceOrThrow(
  'src/screens/ManagementHomeV021.tsx',
  "import { AnimatedPressable, FadeInView } from '../components/Motion';\nimport { EmptyState, LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';",
  "import { DateField } from '../components/DateField';\nimport { AnimatedPressable, FadeInView } from '../components/Motion';\nimport { GateMapPoint, SiteLocationPicker } from '../components/SiteLocationPicker';\nimport { EmptyState, LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';",
);
replaceOrThrow(
  'src/screens/ManagementHomeV021.tsx',
  "import { addSiteMember, createGateSite, upsertSiteGate } from '../lib/managementActions';",
  "import { addSiteMember, updateGateSite, upsertSiteGate } from '../lib/managementActions';",
);
replaceOrThrow(
  'src/screens/ManagementHomeV021.tsx',
  "  const [siteLatitude, setSiteLatitude] = useState('');\n  const [siteLongitude, setSiteLongitude] = useState('');",
  "  const [siteLocation, setSiteLocation] = useState<GateMapPoint>();",
);
replaceOrThrow(
  'src/screens/ManagementHomeV021.tsx',
  "  const [financeVisible, setFinanceVisible] = useState(true);\n\n  const perform = async",
  "  const [financeVisible, setFinanceVisible] = useState(true);\n\n  useEffect(() => {\n    if (!site) return;\n    setSiteName(site.name);\n    setSiteAddress(site.address ?? '');\n    setCity(site.city ?? '');\n    setSiteLocation(site.latitude != null && site.longitude != null ? { latitude: site.latitude, longitude: site.longitude } : undefined);\n  }, [site?.id, site?.name, site?.address, site?.city, site?.latitude, site?.longitude]);\n\n  const perform = async",
);
replaceOrThrow(
  'src/screens/ManagementHomeV021.tsx',
  "  const createSite = () => perform(async () => {\n    const id = await createGateSite({\n      name: siteName.trim(),\n      address: siteAddress.trim(),\n      city: city.trim(),\n      latitude: siteLatitude ? Number(siteLatitude) : undefined,\n      longitude: siteLongitude ? Number(siteLongitude) : undefined,\n    });\n    setSelectedSiteId(id);\n    setSiteName('');\n    setSiteAddress('');\n  }, 'Site oluşturuldu. Şimdi kapı ve kullanıcı ekleyebilirsin.', loadManagedSites);",
  "  const saveSite = () => {\n    if (!siteId) return Alert.alert('Site bulunamadı', 'Onaydan sonra oluşturulan siteyi görmek için ekranı yenile.');\n    void perform(() => updateGateSite({\n      siteId,\n      name: siteName.trim(),\n      address: siteAddress.trim(),\n      city: city.trim(),\n      latitude: siteLocation?.latitude,\n      longitude: siteLocation?.longitude,\n    }), 'Site adı, adresi ve harita konumu güncellendi.', loadManagedSites);\n  };",
);
replaceOrThrow(
  'src/screens/ManagementHomeV021.tsx',
  "          <SectionTitle title=\"Yeni site oluştur\" />\n          <Panel style={styles.form} gradient>\n            <Field label=\"Site adı\" value={siteName} onChangeText={setSiteName} />\n            <Field label=\"Adres\" value={siteAddress} onChangeText={setSiteAddress} multiline />\n            <View style={styles.row}>\n              <Field label=\"Şehir\" value={city} onChangeText={setCity} />\n              <Field label=\"Enlem\" value={siteLatitude} onChangeText={setSiteLatitude} keyboardType=\"decimal-pad\" />\n              <Field label=\"Boylam\" value={siteLongitude} onChangeText={setSiteLongitude} keyboardType=\"decimal-pad\" />\n            </View>\n            <ActionButton title=\"SİTE OLUŞTUR\" icon=\"business\" onPress={createSite} disabled={!siteName.trim()} />\n          </Panel>",
  "          <SectionTitle title=\"Oluşan siteyi düzenle\" />\n          {site ? (\n            <Panel style={styles.form} gradient>\n              <Panel style={styles.notice}>\n                <Ionicons name=\"checkmark-circle\" size={23} color={colors.green} />\n                <Text style={styles.noticeText}>Site, başvuruda verdiğin bilgilerle otomatik oluşturuldu. Buradan detaylarını ve harita pinini güncelleyebilirsin.</Text>\n              </Panel>\n              <Field label=\"Site / Apartman adı\" value={siteName} onChangeText={setSiteName} />\n              <Field label=\"Adres\" value={siteAddress} onChangeText={setSiteAddress} multiline />\n              <Field label=\"Şehir\" value={city} onChangeText={setCity} />\n              <SiteLocationPicker value={siteLocation} address={siteAddress} city={city} onChange={setSiteLocation} />\n              <ActionButton title=\"SİTE BİLGİLERİNİ GÜNCELLE\" icon=\"save\" onPress={saveSite} disabled={!siteName.trim() || !siteAddress.trim() || !siteLocation} />\n            </Panel>\n          ) : (\n            <Panel style={styles.notice} gradient>\n              <Ionicons name=\"sync\" size={24} color={colors.orange} />\n              <Text style={styles.noticeText}>Onaylanan başvuruya ait site hazırlanıyor. Ekranı aşağı çekerek yenile.</Text>\n            </Panel>\n          )}",
);
replaceOrThrow(
  'src/screens/ManagementHomeV021.tsx',
  "              <View style={styles.row}><Field label=\"Başlangıç tarihi\" value={ruleStart} onChangeText={setRuleStart} /><Field label=\"Bitiş tarihi (isteğe bağlı)\" value={ruleEnd} onChangeText={setRuleEnd} /></View>",
  "              <View style={styles.row}><DateField label=\"Başlangıç tarihi\" value={ruleStart} onChange={setRuleStart} /><DateField label=\"Bitiş tarihi (isteğe bağlı)\" value={ruleEnd} onChange={setRuleEnd} optional /></View>",
);

{
  const oldPath = '.github/workflows/dkd_validate_v0_3_0.yml';
  const newPath = '.github/workflows/dkd_validate_v0_3_1.yml';
  let workflow = fs.readFileSync(oldPath, 'utf8');
  workflow = workflow
    .replaceAll('v0.3.0', 'v0.3.1')
    .replaceAll('release/v0.3.0', 'release/v0.3.1')
    .replaceAll('v0_3_0', 'v0_3_1')
    .replace('draborngate-v0-3-validate', 'draborngate-v0-3-1-validate');
  fs.writeFileSync(newPath, workflow);
  fs.unlinkSync(oldPath);
}

console.log('DraBornGate v0.3.1 targeted patches applied.');
