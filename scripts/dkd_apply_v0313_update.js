const fs = require('fs');
const path = require('path');

const dkdRoot = path.join(__dirname, '..');

function dkdRead(dkdRelativePath) {
  return fs.readFileSync(path.join(dkdRoot, dkdRelativePath), 'utf8');
}

function dkdWrite(dkdRelativePath, dkdContent) {
  fs.writeFileSync(path.join(dkdRoot, dkdRelativePath), dkdContent);
}

function dkdReplace(dkdContent, dkdSearch, dkdReplacement, dkdLabel) {
  if (dkdContent.includes(dkdReplacement)) return dkdContent;
  if (!dkdContent.includes(dkdSearch)) {
    throw new Error(`v0.3.13 güncellemesi uygulanamadı: ${dkdLabel}`);
  }
  return dkdContent.replace(dkdSearch, dkdReplacement);
}

function dkdPatchApp() {
  const dkdFile = 'App.tsx';
  let dkdContent = dkdRead(dkdFile);
  dkdContent = dkdContent.replace('// DKD_V0312_PERMISSION_POPUPS', '// DKD_V0313_PERMISSION_POPUPS');
  dkdContent = dkdReplace(
    dkdContent,
    "import { getGateNotificationPermissionState, requestGateNotificationPermission } from './src/lib/notifications';",
    "import { getGateNotificationPermissionState, requestGateNotificationPermission } from './src/lib/notifications';\nimport { dkdRefreshAdConsent } from './src/lib/dkdAdConsent';",
    'App reklam onayı importu',
  );
  dkdContent = dkdReplace(
    dkdContent,
    "  useEffect(() => { if (!session) return; void refresh(); }, [role, session, showCreatePass, tab]);",
    "  useEffect(() => { if (!introPassed) return; void dkdRefreshAdConsent(); }, [introPassed]);\n  useEffect(() => { if (!session) return; void refresh(); }, [role, session, showCreatePass, tab]);",
    'App başlangıç UMP kontrolü',
  );
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchCourierHome() {
  const dkdFile = 'src/screens/CourierHome.tsx';
  let dkdContent = dkdRead(dkdFile);
  dkdContent = dkdContent.replace('// DKD_V0312_COURIER_HOME', '// DKD_V0313_COURIER_HOME');
  dkdContent = dkdReplace(
    dkdContent,
    "                <Text style={s.heroTitle}>{dkdPassUsage?.unlimited ? 'Sınırsız Geçiş Hakkı' : `Toplam ${dkdPassUsage?.remaining ?? 0} Geçiş Hakkın Kaldı`}</Text>",
    "                <Text style={s.heroTitle}>Artık Vakit Kaybetmek YOK</Text>",
    'Ana sayfa geçiş başlığı',
  );
  dkdContent = dkdReplace(
    dkdContent,
    "                <Text style={s.heroText}>{dkdPassUsage?.unlimited ? 'Profesyonel paketinle geçiş talebi sınırı bulunmuyor.' : `${dkdPassUsage?.plan_remaining ?? 0} paket hakkı ve ${dkdPassUsage?.bonus ?? 0} video ödülü kullanılabilir.`}</Text>",
    "                <Text style={s.heroText}>{dkdPassUsage?.unlimited ? 'Profesyonel paketinle sınırsız ve hızlı geçiş talebi oluşturabilirsin.' : `Toplam ${dkdPassUsage?.remaining ?? 0} geçiş hakkın var • ${dkdPassUsage?.plan_remaining ?? 0} paket hakkı ve ${dkdPassUsage?.bonus ?? 0} video ödülü kullanılabilir.`}</Text>",
    'Ana sayfa geçiş hakkı detayı',
  );
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchCreatePass() {
  const dkdFile = 'src/screens/CreatePassScreen.tsx';
  let dkdContent = dkdRead(dkdFile);
  dkdContent = dkdContent.replace('// DKD_V0312_CREATE_PASS', '// DKD_V0313_CREATE_PASS');
  dkdContent = dkdReplace(
    dkdContent,
    "  const uploadMotion = useRef(new Animated.Value(0)).current;",
    "  const uploadMotion = useRef(new Animated.Value(0)).current;\n  const dkdRightsMotion = useRef(new Animated.Value(0)).current;",
    'Yeni geçiş hak kartı animasyon değeri',
  );
  dkdContent = dkdReplace(
    dkdContent,
    "  const filteredSites = useMemo(() => {",
    `  useEffect(() => {
    const dkdLoop = Animated.loop(Animated.sequence([
      Animated.timing(dkdRightsMotion, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(dkdRightsMotion, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    dkdLoop.start();
    return () => dkdLoop.stop();
  }, [dkdRightsMotion]);

  const filteredSites = useMemo(() => {`,
    'Yeni geçiş hak kartı animasyon döngüsü',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `      <FadeInView delay={35}><View style={s.dkdRightsCard}><View style={s.dkdRightsIcon}><Ionicons name="ticket" size={22} color={colors.cyan} /></View><View style={s.headerCopy}><Text style={s.dkdRightsLabel}>TOPLAM KALAN GEÇİŞ HAKKI</Text><Text style={s.dkdRightsValue}>{dkdPassUsage?.unlimited ? 'Sınırsız' : dkdRightsLoading ? 'Kontrol ediliyor' : String(dkdPassUsage?.remaining ?? 0)}</Text><Text style={s.dkdRightsMeta}>{dkdPassUsage?.unlimited ? 'Profesyonel paket' : \`${dkdPassUsage?.plan_remaining ?? 0} paket hakkı • ${dkdPassUsage?.bonus ?? 0} video ödülü\`}</Text></View></View></FadeInView>`,
    `      <FadeInView delay={35}>
        <Animated.View
          style={[
            s.dkdRightsCard,
            {
              transform: [
                { scale: dkdRightsMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) },
                { translateY: dkdRightsMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
              ],
            },
          ]}
        >
          <Animated.View pointerEvents="none" style={[s.dkdRightsAccentOne, { opacity: dkdRightsMotion.interpolate({ inputRange: [0, 1], outputRange: [.20, .42] }), transform: [{ translateX: dkdRightsMotion.interpolate({ inputRange: [0, 1], outputRange: [-8, 15] }) }] }]} />
          <Animated.View pointerEvents="none" style={[s.dkdRightsAccentTwo, { opacity: dkdRightsMotion.interpolate({ inputRange: [0, 1], outputRange: [.16, .34] }), transform: [{ translateY: dkdRightsMotion.interpolate({ inputRange: [0, 1], outputRange: [7, -8] }) }] }]} />
          <Animated.View style={[s.dkdRightsIcon, { transform: [{ rotate: dkdRightsMotion.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) }] }]}>
            <Ionicons name="ticket" size={25} color={colors.white} />
          </Animated.View>
          <View style={s.headerCopy}>
            <View style={s.dkdRightsTopRow}>
              <Text style={s.dkdRightsLabel}>TOPLAM KALAN GEÇİŞ HAKKI</Text>
              <View style={s.dkdRightsLive}><View style={s.dkdRightsLiveDot} /><Text style={s.dkdRightsLiveText}>ANLIK</Text></View>
            </View>
            <Text style={s.dkdRightsValue}>{dkdPassUsage?.unlimited ? 'Sınırsız' : dkdRightsLoading ? 'Kontrol ediliyor' : String(dkdPassUsage?.remaining ?? 0)}</Text>
            <Text style={s.dkdRightsMeta}>{dkdPassUsage?.unlimited ? 'Profesyonel paket • sınırsız geçiş' : \`${dkdPassUsage?.plan_remaining ?? 0} paket hakkı • ${dkdPassUsage?.bonus ?? 0} video ödülü\`}</Text>
          </View>
        </Animated.View>
      </FadeInView>`,
    'Yeni geçiş hak kartı görünümü',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `  dkdRightsCard: { minHeight: 82, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(55,216,255,.42)', backgroundColor: 'rgba(8,36,54,.84)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  dkdRightsIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(55,216,255,.13)', alignItems: 'center', justifyContent: 'center' },
  dkdRightsLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: .8 },
  dkdRightsValue: { color: colors.cyan, fontSize: 22, fontWeight: '900', marginTop: 2 },
  dkdRightsMeta: { color: colors.textSoft, fontSize: 10, marginTop: 2 },`,
    `  dkdRightsCard: { minHeight: 104, borderRadius: 24, borderWidth: 1.4, borderColor: 'rgba(55,216,255,.68)', backgroundColor: '#0A2E49', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13, overflow: 'hidden' },
  dkdRightsAccentOne: { position: 'absolute', width: 112, height: 112, borderRadius: 56, right: -38, top: -52, backgroundColor: colors.purple },
  dkdRightsAccentTwo: { position: 'absolute', width: 72, height: 72, borderRadius: 36, left: 32, bottom: -49, backgroundColor: colors.green },
  dkdRightsIcon: { width: 57, height: 57, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,.38)', backgroundColor: 'rgba(139,107,255,.72)', alignItems: 'center', justifyContent: 'center' },
  dkdRightsTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dkdRightsLabel: { flex: 1, color: 'rgba(255,255,255,.74)', fontSize: 9, fontWeight: '900', letterSpacing: .8 },
  dkdRightsLive: { minHeight: 23, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(67,231,162,.50)', backgroundColor: 'rgba(67,231,162,.13)', paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  dkdRightsLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  dkdRightsLiveText: { color: colors.green, fontSize: 8, fontWeight: '900', letterSpacing: .5 },
  dkdRightsValue: { color: colors.white, fontSize: 27, lineHeight: 32, fontWeight: '900', marginTop: 3 },
  dkdRightsMeta: { color: colors.cyan, fontSize: 10, lineHeight: 15, fontWeight: '800', marginTop: 2 },`,
    'Yeni geçiş hak kartı stilleri',
  );
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchProfile() {
  const dkdFile = 'src/screens/ProfileScreen.tsx';
  let dkdContent = dkdRead(dkdFile);
  dkdContent = dkdContent.replace('// DKD_V0312_PROFILE', '// DKD_V0313_PROFILE');
  dkdContent = dkdReplace(
    dkdContent,
    "import React, { useEffect, useState } from 'react';",
    "import React, { useEffect, useRef, useState } from 'react';",
    'Profil useRef importu',
  );
  dkdContent = dkdReplace(
    dkdContent,
    "import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';",
    "import { Alert, Animated, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';",
    'Profil Animated importu',
  );
  dkdContent = dkdReplace(
    dkdContent,
    "  const [dkdSupportOpen, setDkdSupportOpen] = useState(false);",
    "  const [dkdSupportOpen, setDkdSupportOpen] = useState(false);\n  const dkdSupportMotion = useRef(new Animated.Value(0)).current;",
    'Destek butonu animasyon değeri',
  );
  dkdContent = dkdReplace(
    dkdContent,
    "  useEffect(() => {\n    setName(gate.profile?.fullName ?? '');",
    `  useEffect(() => {
    const dkdLoop = Animated.loop(Animated.sequence([
      Animated.timing(dkdSupportMotion, { toValue: 1, duration: 1150, useNativeDriver: true }),
      Animated.timing(dkdSupportMotion, { toValue: 0, duration: 1150, useNativeDriver: true }),
    ]));
    dkdLoop.start();
    return () => dkdLoop.stop();
  }, [dkdSupportMotion]);

  useEffect(() => {
    setName(gate.profile?.fullName ?? '');`,
    'Destek butonu animasyon döngüsü',
  );
  dkdContent = dkdContent.replace(
    `{avatarPath && !uploading ? <View style={s.avatarBadge}><Ionicons name="checkmark" size={15} color={colors.background} /></View> : null}`,
    '',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `<AnimatedPressable onPress={() => setDkdSupportOpen(true)}><View style={s.supportButton}><Ionicons name="headset" size={18} color={colors.white} /><Text style={s.supportButtonText}>DESTEK</Text><Ionicons name="arrow-forward" size={17} color={colors.white} /></View></AnimatedPressable>`,
    `<Animated.View style={{ transform: [{ scale: dkdSupportMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) }, { translateX: dkdSupportMotion.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) }] }}><AnimatedPressable onPress={() => setDkdSupportOpen(true)}><View style={s.supportButton}><Ionicons name="headset" size={18} color={colors.white} /><Text style={s.supportButtonText}>DESTEK</Text><Ionicons name="arrow-forward" size={17} color={colors.white} /></View></AnimatedPressable></Animated.View>`,
    'Animasyonlu destek butonu',
  );
  dkdContent = dkdContent.replace(
    `, avatarBadge: { position: 'absolute', right: 4, bottom: 4, width: 25, height: 25, borderRadius: 13, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' }`,
    '',
  );
  dkdWrite(dkdFile, dkdContent);
}

dkdPatchApp();
dkdPatchCourierHome();
dkdPatchCreatePass();
dkdPatchProfile();

console.log('DraBornGate v0.3.13 arayüz ve gizlilik güncellemesi uygulandı.');
