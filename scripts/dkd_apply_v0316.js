'use strict';

const fs = require('fs');

function dkdRead(dkdPath) {
  return fs.readFileSync(dkdPath, 'utf8');
}

function dkdWrite(dkdPath, dkdContent) {
  fs.writeFileSync(dkdPath, dkdContent, 'utf8');
}

function dkdReplace(dkdPath, dkdBefore, dkdAfter) {
  const dkdSource = dkdRead(dkdPath);
  if (dkdSource.includes(dkdAfter)) return false;
  if (!dkdSource.includes(dkdBefore)) {
    throw new Error(`${dkdPath}: beklenen v0.3.15 kaynak parçası bulunamadı.`);
  }
  dkdWrite(dkdPath, dkdSource.replace(dkdBefore, dkdAfter));
  return true;
}

function dkdReplaceAll(dkdPath, dkdBefore, dkdAfter) {
  const dkdSource = dkdRead(dkdPath);
  if (!dkdSource.includes(dkdBefore)) return false;
  dkdWrite(dkdPath, dkdSource.split(dkdBefore).join(dkdAfter));
  return true;
}

const dkdChanged = new Set();
const dkdTrack = (dkdPath, dkdDidChange) => { if (dkdDidChange) dkdChanged.add(dkdPath); };

// Kayıt ekranı: ortak hesap ve alt şema açıklamalarını kaldır, rol kartlarını renklendir ve canlandır.
const dkdAuthPath = 'src/screens/AuthScreen.tsx';
dkdTrack(dkdAuthPath, dkdReplace(dkdAuthPath,
  "import { AnimatedPressable, FadeInView, FloatingView, PulseDot } from '../components/Motion';",
  "import { AnimatedPressable, FadeInView, FloatingView } from '../components/Motion';",
));
dkdTrack(dkdAuthPath, dkdReplace(dkdAuthPath,
  "import { Ionicons } from '@expo/vector-icons';",
  "// DKD_V0316_AUTH_ROLE_CARDS\nimport { Ionicons } from '@expo/vector-icons';",
));
dkdTrack(dkdAuthPath, dkdReplace(dkdAuthPath,
  "    <FadeInView style={styles.status}><PulseDot color={colors.green} /><Text style={styles.statusText}>DRABORNGO ORTAK HESAP SİSTEMİ</Text></FadeInView>\n",
  '',
));
dkdTrack(dkdAuthPath, dkdReplace(dkdAuthPath,
  "    </Panel></FadeInView><FadeInView delay={210} style={styles.note}><Ionicons name=\"shield-checkmark\" size={18} color={colors.green} /><Text style={styles.noteText}>DraBornGate verileri ayrı şemada tutulur; yalnızca kullanıcı kimliği DraBornGo ile ortaktır.</Text></FadeInView>\n",
  "    </Panel></FadeInView>\n",
));
const dkdOldRoleChoice = "function RoleChoice({ active, title, text, icon, motorcycle, tone, onPress }: { active: boolean; title: string; text: string; icon?: keyof typeof Ionicons.glyphMap; motorcycle?: boolean; tone: string; onPress: () => void }) { return <AnimatedPressable containerStyle={styles.roleWrap} onPress={onPress}><LinearGradient colors={active ? [`${tone}35`, 'rgba(14,32,50,.98)'] : ['rgba(255,255,255,.025)', 'rgba(255,255,255,.012)']} style={[styles.role, active && { borderColor: tone }]}>{motorcycle ? <RacingMotorcycle color={tone} accentColor={colors.white} size={45} /> : <Ionicons name={icon!} size={27} color={active ? tone : colors.textMuted} />}<Text style={[styles.roleTitle, active && { color: tone }]}>{title}</Text><Text style={styles.roleText}>{text}</Text></LinearGradient></AnimatedPressable>; }";
const dkdNewRoleChoice = `function RoleChoice({ active, title, text, icon, motorcycle, tone, onPress }: { active: boolean; title: string; text: string; icon?: keyof typeof Ionicons.glyphMap; motorcycle?: boolean; tone: string; onPress: () => void }) {
  const dkdRoleMotion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { dkdRoleMotion.stopAnimation(); dkdRoleMotion.setValue(0); return; }
    const dkdRoleLoop = Animated.loop(Animated.sequence([
      Animated.timing(dkdRoleMotion, { toValue: 1, duration: 1150, useNativeDriver: true }),
      Animated.timing(dkdRoleMotion, { toValue: 0, duration: 1150, useNativeDriver: true }),
    ]));
    dkdRoleLoop.start();
    return () => dkdRoleLoop.stop();
  }, [active, dkdRoleMotion]);
  const dkdRoleGradient = active
    ? [\`${tone}58\`, 'rgba(55,50,116,.98)', 'rgba(9,29,48,.99)']
    : [\`${tone}25\`, 'rgba(21,45,74,.96)', 'rgba(8,25,42,.99)'];
  return <Animated.View style={[styles.roleWrap, active && { transform: [{ scale: dkdRoleMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) }] }]}><AnimatedPressable onPress={onPress}><LinearGradient colors={dkdRoleGradient as [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.role, { borderColor: active ? tone : \`${tone}55\` }]}><Animated.View pointerEvents="none" style={[styles.roleAura, { backgroundColor: tone, opacity: active ? dkdRoleMotion.interpolate({ inputRange: [0, 1], outputRange: [.10, .30] }) : .08 }]} /><Animated.View pointerEvents="none" style={[styles.roleShine, { opacity: active ? .22 : .08, transform: [{ translateX: active ? dkdRoleMotion.interpolate({ inputRange: [0, 1], outputRange: [-80, 150] }) : -80 }, { rotate: '-18deg' }] }]} /><View style={[styles.roleIcon, { backgroundColor: \`${tone}20\`, borderColor: \`${tone}70\` }]}>{motorcycle ? <RacingMotorcycle color={tone} accentColor={colors.white} size={47} /> : <Ionicons name={icon!} size={29} color={tone} />}</View><Text style={[styles.roleTitle, { color: active ? tone : colors.text }]}>{title}</Text><Text style={styles.roleText}>{text}</Text>{active ? <View style={[styles.roleSelected, { backgroundColor: \`${tone}24\`, borderColor: \`${tone}75\` }]}><Ionicons name="checkmark-circle" size={13} color={tone} /><Text style={[styles.roleSelectedText, { color: tone }]}>SEÇİLDİ</Text></View> : null}</LinearGradient></AnimatedPressable></Animated.View>;
}`;
dkdTrack(dkdAuthPath, dkdReplace(dkdAuthPath, dkdOldRoleChoice, dkdNewRoleChoice));
dkdTrack(dkdAuthPath, dkdReplace(dkdAuthPath,
  "roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, roleWrap: { width: '48%' }, role: { minHeight: 105, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 11, alignItems: 'center', justifyContent: 'center' }, roleTitle: { color: colors.textSoft, fontSize: 13, fontWeight: '900', marginTop: 5 }, roleText: { color: colors.textMuted, fontSize: 9, marginTop: 3, textAlign: 'center' },",
  "roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, roleWrap: { width: '48%' }, role: { minHeight: 124, borderRadius: 20, borderWidth: 1, padding: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, roleAura: { position: 'absolute', width: 112, height: 112, borderRadius: 112, right: -44, top: -52 }, roleShine: { position: 'absolute', top: -24, bottom: -24, width: 30, backgroundColor: 'rgba(255,255,255,.72)' }, roleIcon: { width: 58, height: 58, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, roleTitle: { color: colors.textSoft, fontSize: 13, fontWeight: '900', marginTop: 6 }, roleText: { color: colors.textSoft, opacity: .78, fontSize: 9, marginTop: 3, textAlign: 'center' }, roleSelected: { minHeight: 23, borderRadius: 12, borderWidth: 1, paddingHorizontal: 7, marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 4 }, roleSelectedText: { fontSize: 7, fontWeight: '900', letterSpacing: .5 },",
));

// Kurye ana ekranı: paket/video hak kırılımı metnini kaldır.
const dkdCourierHomePath = 'src/screens/CourierHome.tsx';
dkdTrack(dkdCourierHomePath, dkdReplace(dkdCourierHomePath,
  '// DKD_V0313_COURIER_HOME',
  '// DKD_V0316_COURIER_HOME',
));
dkdTrack(dkdCourierHomePath, dkdReplace(dkdCourierHomePath,
  "<Text style={s.heroText}>{dkdPassUsage?.unlimited ? 'Profesyonel paketinle sınırsız ve hızlı geçiş talebi oluşturabilirsin.' : `Toplam ${dkdPassUsage?.remaining ?? 0} geçiş hakkın var • ${dkdPassUsage?.plan_remaining ?? 0} paket hakkı ve ${dkdPassUsage?.bonus ?? 0} video ödülü kullanılabilir.`}</Text>",
  "<Text style={s.heroText}>{dkdPassUsage?.unlimited ? 'Profesyonel paketinle sınırsız ve hızlı geçiş talebi oluşturabilirsin.' : `Toplam ${dkdPassUsage?.remaining ?? 0} geçiş hakkın var.`}</Text>",
));

// Site sakini merkezi: CANLI rozetini başlığın yanına taşı.
const dkdResidentPath = 'src/screens/ResidentHome.tsx';
dkdTrack(dkdResidentPath, dkdReplace(dkdResidentPath,
  "    <View style={s.header}><View><Text style={s.eyebrow}>SİTE SAKİNİ MERKEZİ</Text><Text style={s.title}>{gate.profile?.fullName.split(' ')[0] || 'Sakin'} 👋</Text><Text style={s.sub}>{site?.name} • {resident.block} / Kat {resident.floor} / Daire {resident.apartment}</Text></View><LiveBadge label=\"SAKİN\" /></View>",
  "    <View style={s.header}><View><View style={s.eyebrowRow}><Text style={s.eyebrow}>SİTE SAKİNİ MERKEZİ</Text><LiveBadge label=\"CANLI\" compact /></View><Text style={s.title}>{gate.profile?.fullName.split(' ')[0] || 'Sakin'} 👋</Text><Text style={s.sub}>{site?.name} • {resident.block} / Kat {resident.floor} / Daire {resident.apartment}</Text></View></View>",
));
dkdTrack(dkdResidentPath, dkdReplace(dkdResidentPath,
  "content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 18 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow:",
  "content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 18 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, eyebrow:",
));

// Kurye paketleri: her paket seçiminde Google Play alanına tek animasyonlu kaydırma.
const dkdCourierCenterPath = 'src/screens/CourierCenterV032.tsx';
dkdTrack(dkdCourierCenterPath, dkdReplace(dkdCourierCenterPath,
  '// DKD_V0312_COURIER_CENTER',
  '// DKD_V0316_COURIER_CENTER',
));
dkdTrack(dkdCourierCenterPath, dkdReplace(dkdCourierCenterPath,
  "  const [loading, setLoading] = useState(false);\n",
  "  const [loading, setLoading] = useState(false);\n  const dkdPackagesScrollRef = useRef<ScrollView>(null);\n",
));
dkdTrack(dkdCourierCenterPath, dkdReplace(dkdCourierCenterPath,
  "  const hasCourierPackage = Boolean(\n    center?.subscription\n      && ['active', 'trialing'].includes(center.subscription.status)\n      && center.effective_plan?.code !== 'courier_starter',\n  );\n\n  return (",
  "  const hasCourierPackage = Boolean(\n    center?.subscription\n      && ['active', 'trialing'].includes(center.subscription.status)\n      && center.effective_plan?.code !== 'courier_starter',\n  );\n\n  const dkdSelectPlan = (dkdPlanCode: string) => {\n    setSelected(dkdPlanCode);\n    setTimeout(() => dkdPackagesScrollRef.current?.scrollToEnd({ animated: true }), 180);\n  };\n\n  return (",
));
dkdTrack(dkdCourierCenterPath, dkdReplace(dkdCourierCenterPath,
  "        <ScrollView\n          refreshControl=",
  "        <ScrollView\n          ref={dkdPackagesScrollRef}\n          refreshControl=",
));
dkdTrack(dkdCourierCenterPath, dkdReplace(dkdCourierCenterPath,
  "<AnimatedPressable onPress={() => setSelected(plan.code)}>",
  "<AnimatedPressable onPress={() => dkdSelectPlan(plan.code)}>",
));

// Google Play abonelik butonu: modern, renkli ve sürekli hafif animasyonlu görünüm.
const dkdBillingPath = 'src/components/GooglePlaySubscriptionButton.tsx';
dkdTrack(dkdBillingPath, dkdReplace(dkdBillingPath,
  '// DKD_V0315_PLAY_BILLING',
  '// DKD_V0316_PLAY_BILLING',
));
dkdTrack(dkdBillingPath, dkdReplace(dkdBillingPath,
  "import React, { useEffect, useMemo, useState } from 'react';",
  "import React, { useEffect, useMemo, useRef, useState } from 'react';",
));
dkdTrack(dkdBillingPath, dkdReplace(dkdBillingPath,
  "import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';",
  "import { ActivityIndicator, Alert, Animated, Linking, StyleSheet, Text, View } from 'react-native';",
));
dkdTrack(dkdBillingPath, dkdReplace(dkdBillingPath,
  "  const [dkdQueryInProgress, setDkdQueryInProgress] = useState(false);\n\n  useEffect(() => {",
  "  const [dkdQueryInProgress, setDkdQueryInProgress] = useState(false);\n  const dkdButtonMotion = useRef(new Animated.Value(0)).current;\n\n  useEffect(() => {\n    const dkdButtonLoop = Animated.loop(Animated.sequence([\n      Animated.timing(dkdButtonMotion, { toValue: 1, duration: 1450, useNativeDriver: true }),\n      Animated.timing(dkdButtonMotion, { toValue: 0, duration: 1450, useNativeDriver: true }),\n    ]));\n    dkdButtonLoop.start();\n    return () => dkdButtonLoop.stop();\n  }, [dkdButtonMotion]);\n\n  useEffect(() => {",
));
const dkdOldBillingReturn = `  return <View style={s.wrapper}>
    <AnimatedPressable onPress={() => void purchase()} disabled={!connected || purchaseInProgress}>
      <LinearGradient colors={gradients.success} style={s.button}>{purchaseInProgress || dkdQueryInProgress ? <ActivityIndicator color={colors.background} /> : <Ionicons name="logo-google-playstore" size={22} color={colors.background} />}<Text style={s.buttonText}>{purchaseInProgress ? 'GOOGLE PLAY AÇILIYOR' : dkdQueryInProgress ? 'PAKETLER SORGULANIYOR' : 'GOOGLE PLAY İLE ABONE OL'}</Text></LinearGradient>
    </AnimatedPressable>
    <AnimatedPressable onPress={() => void Linking.openURL('https://play.google.com/store/account/subscriptions?package=com.draborneagle.draborngate')}><Text style={s.manage}>Mevcut abonelikleri yönet veya iptal et</Text></AnimatedPressable>
  </View>;`;
const dkdNewBillingReturn = `  return <View style={s.wrapper}>
    <Animated.View style={{ transform: [{ scale: dkdButtonMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }) }] }}>
      <AnimatedPressable onPress={() => void purchase()} disabled={!connected || purchaseInProgress}>
        <LinearGradient colors={['#31E6A1', '#25B7FF', '#796BFF', '#E45DFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.button}>
          <Animated.View pointerEvents="none" style={[s.buttonAura, { opacity: dkdButtonMotion.interpolate({ inputRange: [0, 1], outputRange: [.12, .34] }), transform: [{ scale: dkdButtonMotion.interpolate({ inputRange: [0, 1], outputRange: [.82, 1.18] }) }] }]} />
          <Animated.View pointerEvents="none" style={[s.buttonShine, { transform: [{ translateX: dkdButtonMotion.interpolate({ inputRange: [0, 1], outputRange: [-90, 360] }) }, { rotate: '-18deg' }] }]} />
          <View style={s.playIcon}>{purchaseInProgress || dkdQueryInProgress ? <ActivityIndicator color={colors.white} /> : <Ionicons name="logo-google-playstore" size={24} color={colors.white} />}</View>
          <View style={s.buttonCopy}><Text style={s.buttonText}>{purchaseInProgress ? 'GOOGLE PLAY AÇILIYOR' : dkdQueryInProgress ? 'PAKETLER SORGULANIYOR' : 'GOOGLE PLAY İLE ABONE OL'}</Text><Text style={s.buttonSub}>GÜVENLİ ÖDEME • PLAY STORE</Text></View>
          <Ionicons name="arrow-forward-circle" size={25} color={colors.white} />
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
    <AnimatedPressable onPress={() => void Linking.openURL('https://play.google.com/store/account/subscriptions?package=com.draborneagle.draborngate')}><Text style={s.manage}>Mevcut abonelikleri yönet veya iptal et</Text></AnimatedPressable>
  </View>;`;
dkdTrack(dkdBillingPath, dkdReplace(dkdBillingPath, dkdOldBillingReturn, dkdNewBillingReturn));
const dkdOldBillingStyles = "const s = StyleSheet.create({ wrapper: { gap: 9 }, button: { minHeight: 56, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 12 }, buttonText: { color: colors.background, fontSize: 12, fontWeight: '900' }, manage: { color: colors.cyan, fontSize: 10, fontWeight: '800', textAlign: 'center' }, free: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(67,231,162,.4)', backgroundColor: 'rgba(67,231,162,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, freeText: { color: colors.green, fontWeight: '900', fontSize: 11 }, test: { minHeight: 65, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,179,92,.4)', backgroundColor: 'rgba(255,179,92,.07)', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1 }, testTitle: { color: colors.orange, fontWeight: '900', fontSize: 11 }, testText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 } });";
const dkdNewBillingStyles = "const s = StyleSheet.create({ wrapper: { gap: 9 }, button: { minHeight: 68, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,.42)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, overflow: 'hidden' }, buttonAura: { position: 'absolute', width: 150, height: 150, borderRadius: 150, right: -54, top: -72, backgroundColor: colors.white }, buttonShine: { position: 'absolute', top: -30, bottom: -30, width: 38, backgroundColor: 'rgba(255,255,255,.24)' }, playIcon: { width: 43, height: 43, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,.45)', backgroundColor: 'rgba(2,7,13,.18)', alignItems: 'center', justifyContent: 'center' }, buttonCopy: { flex: 1 }, buttonText: { color: colors.white, fontSize: 12.5, fontWeight: '900', letterSpacing: .25 }, buttonSub: { color: 'rgba(255,255,255,.78)', fontSize: 7.5, fontWeight: '900', letterSpacing: .65, marginTop: 3 }, manage: { color: colors.cyan, fontSize: 10, fontWeight: '800', textAlign: 'center' }, free: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(67,231,162,.4)', backgroundColor: 'rgba(67,231,162,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, freeText: { color: colors.green, fontWeight: '900', fontSize: 11 }, test: { minHeight: 65, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,179,92,.4)', backgroundColor: 'rgba(255,179,92,.07)', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1 }, testTitle: { color: colors.orange, fontWeight: '900', fontSize: 11 }, testText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 } });";
dkdTrack(dkdBillingPath, dkdReplace(dkdBillingPath, dkdOldBillingStyles, dkdNewBillingStyles));

// Google Play politika kapısını v0.3.16 ve yeni UI denetimleriyle yükselt.
const dkdPolicyPath = 'scripts/dkd_google_play_policy_gate.sh';
let dkdPolicy = dkdRead(dkdPolicyPath);
if (!dkdPolicy.includes('DKD_V0316_POLICY_GATE')) {
  dkdPolicy = dkdPolicy.replace('#!/usr/bin/env bash', '#!/usr/bin/env bash\n# DKD_V0316_POLICY_GATE');
  dkdPolicy = dkdPolicy.split('0.3.15').join('0.3.16');
  dkdPolicy = dkdPolicy.replace('EXPECTED_VERSION_CODE=5', 'EXPECTED_VERSION_CODE=6');
  dkdPolicy = dkdPolicy.replace("ANDROID_VERSION_CODE = 5", "ANDROID_VERSION_CODE = 6");
  dkdPolicy = dkdPolicy.replace("app.android?.versionCode !== 5", "app.android?.versionCode !== 6");
  dkdPolicy = dkdPolicy.replace("app.extra?.androidVersionCode !== 5", "app.extra?.androidVersionCode !== 6");
  dkdPolicy = dkdPolicy.replace('DKD_V0315_PLAY_BILLING', 'DKD_V0316_PLAY_BILLING');
  dkdPolicy = dkdPolicy.replace(
    "const courier = fs.readFileSync('src/screens/CourierCenterV032.tsx', 'utf8');",
    "const courier = fs.readFileSync('src/screens/CourierCenterV032.tsx', 'utf8');\nconst courierHome = fs.readFileSync('src/screens/CourierHome.tsx', 'utf8');\nconst authScreen = fs.readFileSync('src/screens/AuthScreen.tsx', 'utf8');\nconst residentHome = fs.readFileSync('src/screens/ResidentHome.tsx', 'utf8');",
  );
  dkdPolicy = dkdPolicy.replace(
    "if (!billing.includes(\"supabase.functions.invoke('dkd-gate-play-verify'\")) fail('Sunucu tarafı Google Play doğrulaması eksik.');",
    "if (!billing.includes(\"supabase.functions.invoke('dkd-gate-play-verify'\")) fail('Sunucu tarafı Google Play doğrulaması eksik.');\nif (!billing.includes('dkdButtonMotion') || !billing.includes('buttonShine')) fail('Modern animasyonlu Google Play abonelik butonu eksik.');\nif (!courier.includes('dkdPackagesScrollRef') || !courier.includes('scrollToEnd({ animated: true })')) fail('Kurye paket seçiminden abonelik alanına otomatik kaydırma eksik.');\nif (courierHome.includes('paket hakkı ve') || courierHome.includes('video ödülü kullanılabilir')) fail('Kaldırılması istenen paket/video hak metni hâlâ görünüyor.');\nif (authScreen.includes('DRABORNGO ORTAK HESAP SİSTEMİ')) fail('Ortak hesap üst etiketi kaldırılmamış.');\nif (authScreen.includes('DraBornGate verileri ayrı şemada tutulur')) fail('Kayıt ekranı alt şema açıklaması kaldırılmamış.');\nif (!authScreen.includes('DKD_V0316_AUTH_ROLE_CARDS') || !authScreen.includes('dkdRoleMotion')) fail('Modern animasyonlu hesap türü kartları eksik.');\nif (!residentHome.includes('SİTE SAKİNİ MERKEZİ</Text><LiveBadge label=\\\"CANLI\\\" compact')) fail('Site sakini CANLI rozeti başlığın yanında değil.');",
  );
  dkdWrite(dkdPolicyPath, dkdPolicy);
  dkdChanged.add(dkdPolicyPath);
}

console.log(`DraBornGate v0.3.16 kaynak yükseltmesi tamamlandı. Değişen dosya sayısı: ${dkdChanged.size}`);
for (const dkdPath of [...dkdChanged].sort()) console.log(`- ${dkdPath}`);
