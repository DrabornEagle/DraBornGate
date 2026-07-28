'use strict';

const fs = require('fs');

function dkdRead(dkdPath) {
  return fs.readFileSync(dkdPath, 'utf8');
}

function dkdWrite(dkdPath, dkdSource) {
  fs.writeFileSync(dkdPath, dkdSource, 'utf8');
}

function dkdReplaceOnce(dkdSource, dkdBefore, dkdAfter, dkdLabel) {
  if (dkdSource.includes(dkdAfter)) return dkdSource;
  if (!dkdSource.includes(dkdBefore)) throw new Error(`${dkdLabel}: beklenen kaynak parçası bulunamadı.`);
  return dkdSource.replace(dkdBefore, dkdAfter);
}

function dkdReplaceBetween(dkdSource, dkdStart, dkdEnd, dkdReplacement, dkdLabel) {
  if (dkdSource.includes(dkdReplacement)) return dkdSource;
  const dkdStartIndex = dkdSource.indexOf(dkdStart);
  if (dkdStartIndex < 0) throw new Error(`${dkdLabel}: başlangıç parçası bulunamadı.`);
  const dkdEndIndex = dkdSource.indexOf(dkdEnd, dkdStartIndex);
  if (dkdEndIndex < 0) throw new Error(`${dkdLabel}: bitiş parçası bulunamadı.`);
  return dkdSource.slice(0, dkdStartIndex) + dkdReplacement + dkdSource.slice(dkdEndIndex);
}

function dkdUpdate(dkdPath, dkdTransform) {
  const dkdBefore = dkdRead(dkdPath);
  const dkdAfter = dkdTransform(dkdBefore);
  if (dkdAfter !== dkdBefore) {
    dkdWrite(dkdPath, dkdAfter);
    console.log(`Güncellendi: ${dkdPath}`);
  } else {
    console.log(`Zaten güncel: ${dkdPath}`);
  }
}

dkdUpdate('src/screens/AuthScreen.tsx', (dkdSource) => {
  dkdSource = dkdReplaceOnce(
    dkdSource,
    "import { AnimatedPressable, FadeInView, FloatingView, PulseDot } from '../components/Motion';",
    "import { AnimatedPressable, FadeInView, FloatingView } from '../components/Motion';",
    'Auth Motion import',
  );
  if (!dkdSource.includes('// DKD_V0316_AUTH_ROLE_CARDS')) {
    dkdSource = dkdReplaceOnce(
      dkdSource,
      "import { Ionicons } from '@expo/vector-icons';",
      "// DKD_V0316_AUTH_ROLE_CARDS\nimport { Ionicons } from '@expo/vector-icons';",
      'Auth marker',
    );
  }
  dkdSource = dkdSource.replace(
    '    <FadeInView style={styles.status}><PulseDot color={colors.green} /><Text style={styles.statusText}>DRABORNGO ORTAK HESAP SİSTEMİ</Text></FadeInView>\n',
    '',
  );
  dkdSource = dkdSource.replace(
    '    </Panel></FadeInView><FadeInView delay={210} style={styles.note}><Ionicons name="shield-checkmark" size={18} color={colors.green} /><Text style={styles.noteText}>DraBornGate verileri ayrı şemada tutulur; yalnızca kullanıcı kimliği DraBornGo ile ortaktır.</Text></FadeInView>\n',
    '    </Panel></FadeInView>\n',
  );

  const dkdRoleChoice = [
    "function RoleChoice({ active, title, text, icon, motorcycle, tone, onPress }: { active: boolean; title: string; text: string; icon?: keyof typeof Ionicons.glyphMap; motorcycle?: boolean; tone: string; onPress: () => void }) {",
    "  const dkdRoleMotion = useRef(new Animated.Value(0)).current;",
    "  useEffect(() => {",
    "    if (!active) { dkdRoleMotion.stopAnimation(); dkdRoleMotion.setValue(0); return; }",
    "    const dkdRoleLoop = Animated.loop(Animated.sequence([",
    "      Animated.timing(dkdRoleMotion, { toValue: 1, duration: 1150, useNativeDriver: true }),",
    "      Animated.timing(dkdRoleMotion, { toValue: 0, duration: 1150, useNativeDriver: true }),",
    "    ]));",
    "    dkdRoleLoop.start();",
    "    return () => dkdRoleLoop.stop();",
    "  }, [active, dkdRoleMotion]);",
    "  const dkdRoleGradient = active",
    "    ? [`${tone}58`, 'rgba(55,50,116,.98)', 'rgba(9,29,48,.99)']",
    "    : [`${tone}25`, 'rgba(21,45,74,.96)', 'rgba(8,25,42,.99)'];",
    "  return <Animated.View style={[styles.roleWrap, active && { transform: [{ scale: dkdRoleMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) }] }]}><AnimatedPressable onPress={onPress}><LinearGradient colors={dkdRoleGradient as [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.role, { borderColor: active ? tone : `${tone}55` }]}><Animated.View pointerEvents=\"none\" style={[styles.roleAura, { backgroundColor: tone, opacity: active ? dkdRoleMotion.interpolate({ inputRange: [0, 1], outputRange: [.10, .30] }) : .08 }]} /><Animated.View pointerEvents=\"none\" style={[styles.roleShine, { opacity: active ? .22 : .08, transform: [{ translateX: active ? dkdRoleMotion.interpolate({ inputRange: [0, 1], outputRange: [-80, 150] }) : -80 }, { rotate: '-18deg' }] }]} /><View style={[styles.roleIcon, { backgroundColor: `${tone}20`, borderColor: `${tone}70` }]}>{motorcycle ? <RacingMotorcycle color={tone} accentColor={colors.white} size={47} /> : <Ionicons name={icon!} size={29} color={tone} />}</View><Text style={[styles.roleTitle, { color: active ? tone : colors.text }]}>{title}</Text><Text style={styles.roleText}>{text}</Text>{active ? <View style={[styles.roleSelected, { backgroundColor: `${tone}24`, borderColor: `${tone}75` }]}><Ionicons name=\"checkmark-circle\" size={13} color={tone} /><Text style={[styles.roleSelectedText, { color: tone }]}>SEÇİLDİ</Text></View> : null}</LinearGradient></AnimatedPressable></Animated.View>;",
    "}",
    "",
  ].join('\n');

  if (!dkdSource.includes('const dkdRoleMotion = useRef')) {
    dkdSource = dkdReplaceBetween(
      dkdSource,
      'function RoleChoice(',
      '\n\nconst styles = StyleSheet.create({',
      dkdRoleChoice,
      'Auth RoleChoice',
    );
  }

  dkdSource = dkdReplaceOnce(
    dkdSource,
    "roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, roleWrap: { width: '48%' }, role: { minHeight: 105, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 11, alignItems: 'center', justifyContent: 'center' }, roleTitle: { color: colors.textSoft, fontSize: 13, fontWeight: '900', marginTop: 5 }, roleText: { color: colors.textMuted, fontSize: 9, marginTop: 3, textAlign: 'center' },",
    "roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, roleWrap: { width: '48%' }, role: { minHeight: 124, borderRadius: 20, borderWidth: 1, padding: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, roleAura: { position: 'absolute', width: 112, height: 112, borderRadius: 112, right: -44, top: -52 }, roleShine: { position: 'absolute', top: -24, bottom: -24, width: 30, backgroundColor: 'rgba(255,255,255,.72)' }, roleIcon: { width: 58, height: 58, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, roleTitle: { color: colors.textSoft, fontSize: 13, fontWeight: '900', marginTop: 6 }, roleText: { color: colors.textSoft, opacity: .78, fontSize: 9, marginTop: 3, textAlign: 'center' }, roleSelected: { minHeight: 23, borderRadius: 12, borderWidth: 1, paddingHorizontal: 7, marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 4 }, roleSelectedText: { fontSize: 7, fontWeight: '900', letterSpacing: .5 },",
    'Auth role styles',
  );
  if (dkdSource.includes('DRABORNGO ORTAK HESAP SİSTEMİ') || dkdSource.includes('DraBornGate verileri ayrı şemada tutulur')) {
    throw new Error('Auth kaldırılacak metinlerden biri kaynakta kaldı.');
  }
  return dkdSource;
});

dkdUpdate('src/screens/CourierHome.tsx', (dkdSource) => {
  dkdSource = dkdSource.replace('// DKD_V0313_COURIER_HOME', '// DKD_V0316_COURIER_HOME');
  dkdSource = dkdReplaceOnce(
    dkdSource,
    "<Text style={s.heroText}>{dkdPassUsage?.unlimited ? 'Profesyonel paketinle sınırsız ve hızlı geçiş talebi oluşturabilirsin.' : `Toplam ${dkdPassUsage?.remaining ?? 0} geçiş hakkın var • ${dkdPassUsage?.plan_remaining ?? 0} paket hakkı ve ${dkdPassUsage?.bonus ?? 0} video ödülü kullanılabilir.`}</Text>",
    "<Text style={s.heroText}>{dkdPassUsage?.unlimited ? 'Profesyonel paketinle sınırsız ve hızlı geçiş talebi oluşturabilirsin.' : `Toplam ${dkdPassUsage?.remaining ?? 0} geçiş hakkın var.`}</Text>",
    'CourierHome hak metni',
  );
  return dkdSource;
});

dkdUpdate('src/screens/ResidentHome.tsx', (dkdSource) => {
  dkdSource = dkdReplaceOnce(
    dkdSource,
    '    <View style={s.header}><View><Text style={s.eyebrow}>SİTE SAKİNİ MERKEZİ</Text><Text style={s.title}>{gate.profile?.fullName.split(\' \')[0] || \'Sakin\'} 👋</Text><Text style={s.sub}>{site?.name} • {resident.block} / Kat {resident.floor} / Daire {resident.apartment}</Text></View><LiveBadge label="SAKİN" /></View>',
    '    <View style={s.header}><View><View style={s.eyebrowRow}><Text style={s.eyebrow}>SİTE SAKİNİ MERKEZİ</Text><LiveBadge label="CANLI" compact /></View><Text style={s.title}>{gate.profile?.fullName.split(\' \')[0] || \'Sakin\'} 👋</Text><Text style={s.sub}>{site?.name} • {resident.block} / Kat {resident.floor} / Daire {resident.apartment}</Text></View></View>',
    'Resident header',
  );
  dkdSource = dkdReplaceOnce(
    dkdSource,
    "content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 18 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow:",
    "content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 18 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, eyebrow:",
    'Resident styles',
  );
  return dkdSource;
});

dkdUpdate('src/screens/CourierCenterV032.tsx', (dkdSource) => {
  dkdSource = dkdSource.replace('// DKD_V0312_COURIER_CENTER', '// DKD_V0316_COURIER_CENTER');
  dkdSource = dkdReplaceOnce(
    dkdSource,
    "  const [loading, setLoading] = useState(false);\n",
    "  const [loading, setLoading] = useState(false);\n  const dkdPackagesScrollRef = useRef<ScrollView>(null);\n",
    'CourierCenter scroll ref',
  );
  dkdSource = dkdReplaceOnce(
    dkdSource,
    "  const hasCourierPackage = Boolean(\n    center?.subscription\n      && ['active', 'trialing'].includes(center.subscription.status)\n      && center.effective_plan?.code !== 'courier_starter',\n  );\n\n  return (",
    "  const hasCourierPackage = Boolean(\n    center?.subscription\n      && ['active', 'trialing'].includes(center.subscription.status)\n      && center.effective_plan?.code !== 'courier_starter',\n  );\n\n  const dkdSelectPlan = (dkdPlanCode: string) => {\n    setSelected(dkdPlanCode);\n    setTimeout(() => dkdPackagesScrollRef.current?.scrollToEnd({ animated: true }), 180);\n  };\n\n  return (",
    'CourierCenter select handler',
  );
  dkdSource = dkdReplaceOnce(
    dkdSource,
    "        <ScrollView\n          refreshControl=",
    "        <ScrollView\n          ref={dkdPackagesScrollRef}\n          refreshControl=",
    'CourierCenter ScrollView ref',
  );
  dkdSource = dkdReplaceOnce(
    dkdSource,
    '<AnimatedPressable onPress={() => setSelected(plan.code)}>',
    '<AnimatedPressable onPress={() => dkdSelectPlan(plan.code)}>',
    'CourierCenter plan press',
  );
  return dkdSource;
});

dkdUpdate('src/components/GooglePlaySubscriptionButton.tsx', (dkdSource) => {
  dkdSource = dkdSource.replace('// DKD_V0315_PLAY_BILLING', '// DKD_V0316_PLAY_BILLING');
  dkdSource = dkdReplaceOnce(
    dkdSource,
    "import React, { useEffect, useMemo, useState } from 'react';",
    "import React, { useEffect, useMemo, useRef, useState } from 'react';",
    'Billing React import',
  );
  dkdSource = dkdReplaceOnce(
    dkdSource,
    "import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';",
    "import { ActivityIndicator, Alert, Animated, Linking, StyleSheet, Text, View } from 'react-native';",
    'Billing Animated import',
  );
  dkdSource = dkdReplaceOnce(
    dkdSource,
    "  const [dkdQueryInProgress, setDkdQueryInProgress] = useState(false);\n\n  useEffect(() => {",
    "  const [dkdQueryInProgress, setDkdQueryInProgress] = useState(false);\n  const dkdButtonMotion = useRef(new Animated.Value(0)).current;\n\n  useEffect(() => {\n    const dkdButtonLoop = Animated.loop(Animated.sequence([\n      Animated.timing(dkdButtonMotion, { toValue: 1, duration: 1450, useNativeDriver: true }),\n      Animated.timing(dkdButtonMotion, { toValue: 0, duration: 1450, useNativeDriver: true }),\n    ]));\n    dkdButtonLoop.start();\n    return () => dkdButtonLoop.stop();\n  }, [dkdButtonMotion]);\n\n  useEffect(() => {",
    'Billing motion',
  );

  const dkdBillingReturn = [
    "  return <View style={s.wrapper}>",
    "    <Animated.View style={{ transform: [{ scale: dkdButtonMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }) }] }}>",
    "      <AnimatedPressable onPress={() => void purchase()} disabled={!connected || purchaseInProgress}>",
    "        <LinearGradient colors={['#31E6A1', '#25B7FF', '#796BFF', '#E45DFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.button}>",
    "          <Animated.View pointerEvents=\"none\" style={[s.buttonAura, { opacity: dkdButtonMotion.interpolate({ inputRange: [0, 1], outputRange: [.12, .34] }), transform: [{ scale: dkdButtonMotion.interpolate({ inputRange: [0, 1], outputRange: [.82, 1.18] }) }] }]} />",
    "          <Animated.View pointerEvents=\"none\" style={[s.buttonShine, { transform: [{ translateX: dkdButtonMotion.interpolate({ inputRange: [0, 1], outputRange: [-90, 360] }) }, { rotate: '-18deg' }] }]} />",
    "          <View style={s.playIcon}>{purchaseInProgress || dkdQueryInProgress ? <ActivityIndicator color={colors.white} /> : <Ionicons name=\"logo-google-playstore\" size={24} color={colors.white} />}</View>",
    "          <View style={s.buttonCopy}><Text style={s.buttonText}>{purchaseInProgress ? 'GOOGLE PLAY AÇILIYOR' : dkdQueryInProgress ? 'PAKETLER SORGULANIYOR' : 'GOOGLE PLAY İLE ABONE OL'}</Text><Text style={s.buttonSub}>GÜVENLİ ÖDEME • PLAY STORE</Text></View>",
    "          <Ionicons name=\"arrow-forward-circle\" size={25} color={colors.white} />",
    "        </LinearGradient>",
    "      </AnimatedPressable>",
    "    </Animated.View>",
    "    <AnimatedPressable onPress={() => void Linking.openURL('https://play.google.com/store/account/subscriptions?package=com.draborneagle.draborngate')}><Text style={s.manage}>Mevcut abonelikleri yönet veya iptal et</Text></AnimatedPressable>",
    "  </View>;",
  ].join('\n');

  if (!dkdSource.includes('style={s.buttonAura')) {
    dkdSource = dkdReplaceBetween(
      dkdSource,
      '  return <View style={s.wrapper}>',
      '\n}\n\nconst s = StyleSheet.create(',
      `${dkdBillingReturn}\n}`,
      'Billing return',
    );
  }

  dkdSource = dkdReplaceOnce(
    dkdSource,
    "const s = StyleSheet.create({ wrapper: { gap: 9 }, button: { minHeight: 56, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 12 }, buttonText: { color: colors.background, fontSize: 12, fontWeight: '900' }, manage: { color: colors.cyan, fontSize: 10, fontWeight: '800', textAlign: 'center' }, free: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(67,231,162,.4)', backgroundColor: 'rgba(67,231,162,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, freeText: { color: colors.green, fontWeight: '900', fontSize: 11 }, test: { minHeight: 65, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,179,92,.4)', backgroundColor: 'rgba(255,179,92,.07)', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1 }, testTitle: { color: colors.orange, fontWeight: '900', fontSize: 11 }, testText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 } });",
    "const s = StyleSheet.create({ wrapper: { gap: 9 }, button: { minHeight: 68, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,.42)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, overflow: 'hidden' }, buttonAura: { position: 'absolute', width: 150, height: 150, borderRadius: 150, right: -54, top: -72, backgroundColor: colors.white }, buttonShine: { position: 'absolute', top: -30, bottom: -30, width: 38, backgroundColor: 'rgba(255,255,255,.24)' }, playIcon: { width: 43, height: 43, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,.45)', backgroundColor: 'rgba(2,7,13,.18)', alignItems: 'center', justifyContent: 'center' }, buttonCopy: { flex: 1 }, buttonText: { color: colors.white, fontSize: 12.5, fontWeight: '900', letterSpacing: .25 }, buttonSub: { color: 'rgba(255,255,255,.78)', fontSize: 7.5, fontWeight: '900', letterSpacing: .65, marginTop: 3 }, manage: { color: colors.cyan, fontSize: 10, fontWeight: '800', textAlign: 'center' }, free: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(67,231,162,.4)', backgroundColor: 'rgba(67,231,162,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, freeText: { color: colors.green, fontWeight: '900', fontSize: 11 }, test: { minHeight: 65, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,179,92,.4)', backgroundColor: 'rgba(255,179,92,.07)', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1 }, testTitle: { color: colors.orange, fontWeight: '900', fontSize: 11 }, testText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 } });",
    'Billing styles',
  );
  return dkdSource;
});

dkdUpdate('scripts/dkd_google_play_policy_gate.sh', (dkdSource) => {
  if (dkdSource.includes('DKD_V0316_POLICY_GATE')) return dkdSource;
  dkdSource = dkdSource.replace('#!/usr/bin/env bash', '#!/usr/bin/env bash\n# DKD_V0316_POLICY_GATE');
  dkdSource = dkdSource.split('0.3.15').join('0.3.16');
  dkdSource = dkdSource.replace('EXPECTED_VERSION_CODE=5', 'EXPECTED_VERSION_CODE=6');
  dkdSource = dkdSource.replace("ANDROID_VERSION_CODE = 5", "ANDROID_VERSION_CODE = 6");
  dkdSource = dkdSource.replace("app.android?.versionCode !== 5", "app.android?.versionCode !== 6");
  dkdSource = dkdSource.replace("app.extra?.androidVersionCode !== 5", "app.extra?.androidVersionCode !== 6");
  dkdSource = dkdSource.replace('DKD_V0315_PLAY_BILLING', 'DKD_V0316_PLAY_BILLING');
  dkdSource = dkdReplaceOnce(
    dkdSource,
    "const courier = fs.readFileSync('src/screens/CourierCenterV032.tsx', 'utf8');",
    "const courier = fs.readFileSync('src/screens/CourierCenterV032.tsx', 'utf8');\nconst courierHome = fs.readFileSync('src/screens/CourierHome.tsx', 'utf8');\nconst authScreen = fs.readFileSync('src/screens/AuthScreen.tsx', 'utf8');\nconst residentHome = fs.readFileSync('src/screens/ResidentHome.tsx', 'utf8');",
    'Policy source reads',
  );
  dkdSource = dkdReplaceOnce(
    dkdSource,
    "if (!billing.includes(\"supabase.functions.invoke('dkd-gate-play-verify'\")) fail('Sunucu tarafı Google Play doğrulaması eksik.');",
    [
      "if (!billing.includes(\"supabase.functions.invoke('dkd-gate-play-verify'\")) fail('Sunucu tarafı Google Play doğrulaması eksik.');",
      "if (!billing.includes('dkdButtonMotion') || !billing.includes('buttonShine')) fail('Modern animasyonlu Google Play abonelik butonu eksik.');",
      "if (!courier.includes('dkdPackagesScrollRef') || !courier.includes('scrollToEnd({ animated: true })')) fail('Kurye paket seçiminden abonelik alanına otomatik kaydırma eksik.');",
      "if (courierHome.includes('paket hakkı ve') || courierHome.includes('video ödülü kullanılabilir')) fail('Kaldırılması istenen paket/video hak metni hâlâ görünüyor.');",
      "if (authScreen.includes('DRABORNGO ORTAK HESAP SİSTEMİ')) fail('Ortak hesap üst etiketi kaldırılmamış.');",
      "if (authScreen.includes('DraBornGate verileri ayrı şemada tutulur')) fail('Kayıt ekranı alt şema açıklaması kaldırılmamış.');",
      "if (!authScreen.includes('DKD_V0316_AUTH_ROLE_CARDS') || !authScreen.includes('dkdRoleMotion')) fail('Modern animasyonlu hesap türü kartları eksik.');",
      "if (!residentHome.includes('SİTE SAKİNİ MERKEZİ</Text><LiveBadge label=\"CANLI\" compact')) fail('Site sakini CANLI rozeti başlığın yanında değil.');",
    ].join('\n'),
    'Policy v0.3.16 assertions',
  );
  return dkdSource;
});

console.log('DraBornGate v0.3.16 kaynak yükseltmesi tamamlandı.');
