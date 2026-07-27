const fs = require('fs');
const path = require('path');

const dkdRoot = path.join(__dirname, '..');

function dkdRead(dkdRelativePath) {
  return fs.readFileSync(path.join(dkdRoot, dkdRelativePath), 'utf8');
}

function dkdWrite(dkdRelativePath, dkdContent) {
  const dkdTarget = path.join(dkdRoot, dkdRelativePath);
  fs.mkdirSync(path.dirname(dkdTarget), { recursive: true });
  fs.writeFileSync(dkdTarget, dkdContent);
}

function dkdReplace(dkdContent, dkdSearch, dkdReplacement, dkdLabel) {
  if (dkdContent.includes(dkdReplacement)) return dkdContent;
  if (!dkdContent.includes(dkdSearch)) {
    throw new Error(`v0.3.12 tamamlama güncellemesi uygulanamadı: ${dkdLabel}`);
  }
  return dkdContent.replace(dkdSearch, dkdReplacement);
}

function dkdCreatePermissionModal() {
  const dkdFile = 'src/components/DkdPermissionModal.tsx';
  const dkdContent = `import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AnimatedPressable } from './Motion';

type DkdPermissionModalProps = {
  visible: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  primaryLabel: string;
  onPrimary: () => void | Promise<void>;
  onClose: () => void;
  working?: boolean;
};

export function DkdPermissionModal({
  visible,
  icon,
  eyebrow,
  title,
  description,
  points,
  primaryLabel,
  onPrimary,
  onClose,
  working = false,
}: DkdPermissionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={dkdStyles.overlay}>
        <View style={dkdStyles.card}>
          <View style={dkdStyles.iconShell}><Ionicons name={icon} size={34} color={colors.cyan} /></View>
          <Text style={dkdStyles.eyebrow}>{eyebrow}</Text>
          <Text style={dkdStyles.title}>{title}</Text>
          <Text style={dkdStyles.description}>{description}</Text>
          <View style={dkdStyles.points}>
            {points.map((dkdPoint) => <View key={dkdPoint} style={dkdStyles.point}><View style={dkdStyles.check}><Ionicons name="checkmark" size={13} color={colors.background} /></View><Text style={dkdStyles.pointText}>{dkdPoint}</Text></View>)}
          </View>
          <AnimatedPressable onPress={() => void onPrimary()} disabled={working}>
            <View style={dkdStyles.primary}>{working ? <ActivityIndicator color={colors.background} /> : <Ionicons name="shield-checkmark" size={20} color={colors.background} />}<Text style={dkdStyles.primaryText}>{working ? 'HAZIRLANIYOR' : primaryLabel}</Text></View>
          </AnimatedPressable>
          <AnimatedPressable onPress={onClose} disabled={working}><Text style={dkdStyles.later}>ŞİMDİ DEĞİL</Text></AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

const dkdStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,5,12,.86)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 430, borderRadius: 28, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#081624', padding: 22, alignItems: 'center' },
  iconShell: { width: 72, height: 72, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(55,216,255,.45)', backgroundColor: 'rgba(55,216,255,.10)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginTop: 14 },
  title: { color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  description: { color: colors.textSoft, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  points: { width: '100%', gap: 9, marginTop: 16, marginBottom: 17 },
  point: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,.025)', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  check: { width: 23, height: 23, borderRadius: 8, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  pointText: { flex: 1, color: colors.textSoft, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  primary: { width: '100%', minHeight: 57, borderRadius: radius.lg, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 14 },
  primaryText: { color: colors.background, fontSize: 12, fontWeight: '900' },
  later: { color: colors.textMuted, fontSize: 11, fontWeight: '900', textAlign: 'center', paddingTop: 15, paddingBottom: 2 },
});
`;
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchNotifications() {
  const dkdFile = 'src/lib/notifications.ts';
  let dkdContent = dkdRead(dkdFile);
  if (!dkdContent.includes('DKD_V0312_MODERN_NOTIFICATION_PERMISSION')) {
    dkdContent = `// DKD_V0312_MODERN_NOTIFICATION_PERMISSION\n${dkdContent}`;
  }
  dkdContent = dkdReplace(
    dkdContent,
    `export async function getGateNotificationSound(): Promise<GateNotificationSoundKey> {`,
    `export async function getGateNotificationPermissionState() {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return { granted: false, canAskAgain: false, status: 'unavailable' };
  const dkdPermission = await Notifications.getPermissionsAsync();
  return { granted: dkdPermission.granted, canAskAgain: dkdPermission.canAskAgain !== false, status: String(dkdPermission.status || 'undetermined') };
}

export async function requestGateNotificationPermission() {
  return prepareGateNotifications(true);
}

export async function getGateNotificationSound(): Promise<GateNotificationSoundKey> {`,
    'notification permission helpers',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `export async function prepareGateNotifications() {`,
    `export async function prepareGateNotifications(dkdRequestPermission = false) {`,
    'prepare notification signature',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return false;`,
    `    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : dkdRequestPermission ? await Notifications.requestPermissionsAsync() : current;
    if (!permission.granted) return false;`,
    'notification native permission request',
  );
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchApp() {
  const dkdFile = 'App.tsx';
  let dkdContent = dkdRead(dkdFile);
  if (!dkdContent.includes('DKD_V0312_PERMISSION_POPUPS')) {
    dkdContent = `// DKD_V0312_PERMISSION_POPUPS\n${dkdContent}`;
  }
  dkdContent = dkdReplace(
    dkdContent,
    `import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';`,
    `import { ActivityIndicator, AppState, Linking, StyleSheet, Text, View } from 'react-native';`,
    'App Linking import',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `import { DkdNotificationBell } from './src/components/DkdNotificationCenter';`,
    `import { DkdNotificationBell } from './src/components/DkdNotificationCenter';
import { DkdPermissionModal } from './src/components/DkdPermissionModal';`,
    'App permission modal import',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `import { useGateRoles } from './src/hooks/useGateRoles';`,
    `import { useGateRoles } from './src/hooks/useGateRoles';
import { getGateNotificationPermissionState, requestGateNotificationPermission } from './src/lib/notifications';`,
    'App notification permission import',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `  const [introPassed, setIntroPassed] = useState(false);`,
    `  const [introPassed, setIntroPassed] = useState(false);
  const [dkdNotificationPermissionOpen, setDkdNotificationPermissionOpen] = useState(false);
  const [dkdNotificationPermissionLocked, setDkdNotificationPermissionLocked] = useState(false);
  const [dkdNotificationPermissionWorking, setDkdNotificationPermissionWorking] = useState(false);`,
    'App permission state',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `  useEffect(() => { if (!session) { setRole(null); setRoleInitialized(false); setTab('home'); setShowCreatePass(false); } }, [session]);`,
    `  useEffect(() => { if (!session) { setRole(null); setRoleInitialized(false); setTab('home'); setShowCreatePass(false); setDkdNotificationPermissionOpen(false); } }, [session]);
  useEffect(() => {
    if (!session || !introPassed) return;
    let dkdActive = true;
    void getGateNotificationPermissionState().then((dkdPermission) => {
      if (!dkdActive || dkdPermission.granted || dkdPermission.status === 'unavailable') return;
      setDkdNotificationPermissionLocked(!dkdPermission.canAskAgain);
      setDkdNotificationPermissionOpen(true);
    });
    return () => { dkdActive = false; };
  }, [introPassed, session?.user.id]);`,
    'App permission effect',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `  const openCourierPasses = () => { setCourierCenterInitialTab('passes'); setShowCreatePass(false); setTab('passes'); };`,
    `  const openCourierPasses = () => { setCourierCenterInitialTab('passes'); setShowCreatePass(false); setTab('passes'); };
  const dkdEnableNotifications = async () => {
    setDkdNotificationPermissionWorking(true);
    try {
      if (dkdNotificationPermissionLocked) {
        await Linking.openSettings();
        setDkdNotificationPermissionOpen(false);
        return;
      }
      const dkdGranted = await requestGateNotificationPermission();
      if (dkdGranted) setDkdNotificationPermissionOpen(false);
      else setDkdNotificationPermissionLocked(true);
    } finally {
      setDkdNotificationPermissionWorking(false);
    }
  };`,
    'App notification permission action',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `  return <AppBackground><SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><View style={styles.screen}>{error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}{render()}{!hideNotificationBell ? <DkdNotificationBell /> : null}</View>{!showCreatePass ? <BottomDock role={role} current={tab} onChange={setTab} /> : null}</SafeAreaView></AppBackground>;`,
    `  return <><AppBackground><SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><View style={styles.screen}>{error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}{render()}{!hideNotificationBell ? <DkdNotificationBell /> : null}</View>{!showCreatePass ? <BottomDock role={role} current={tab} onChange={setTab} /> : null}</SafeAreaView></AppBackground><DkdPermissionModal visible={dkdNotificationPermissionOpen} icon="notifications" eyebrow="BİLDİRİM İZNİ" title="Önemli işlemleri kaçırma" description="Geçiş, paket, destek ve güvenlik hareketlerini cihazında anında gösterebilmemiz için bildirim izni gerekir." points={['Geçiş talebi ve durum değişiklikleri', 'Paket, destek ve hesap işlemleri', 'Seçtiğin DraBornGate zil sesi']} primaryLabel={dkdNotificationPermissionLocked ? 'AYARLARI AÇ' : 'BİLDİRİMLERE İZİN VER'} onPrimary={dkdEnableNotifications} onClose={() => setDkdNotificationPermissionOpen(false)} working={dkdNotificationPermissionWorking} /></>;`,
    'App permission modal render',
  );
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchLocationPicker() {
  const dkdFile = 'src/components/SiteLocationPicker.tsx';
  let dkdContent = dkdRead(dkdFile);
  if (!dkdContent.includes('DKD_V0312_MODERN_LOCATION_PERMISSION')) {
    dkdContent = `// DKD_V0312_MODERN_LOCATION_PERMISSION\n${dkdContent}`;
  }
  dkdContent = dkdReplace(
    dkdContent,
    `import { AnimatedPressable } from './Motion';`,
    `import { AnimatedPressable } from './Motion';
import { DkdPermissionModal } from './DkdPermissionModal';`,
    'location permission modal import',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `  const [expanded, setExpanded] = useState(false);`,
    `  const [expanded, setExpanded] = useState(false);
  const [dkdLocationPermissionOpen, setDkdLocationPermissionOpen] = useState(false);
  const [dkdLocationCanAskAgain, setDkdLocationCanAskAgain] = useState(true);
  const [dkdLocationWorking, setDkdLocationWorking] = useState(false);`,
    'location permission states',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `  const useMyLocation = async () => {
    setSearching(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Konum izni gerekli',
          'Konumumu Kullan özelliği için DraBornGate konum iznini yalnızca uygulama açıkken kullanır.',
          [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Ayarları Aç', onPress: () => void Linking.openSettings() },
          ],
        );
        return;
      }
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) throw new Error('Telefonun konum hizmetini açıp yeniden dene.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPoint({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch (error) {
      Alert.alert('Konum alınamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setSearching(false);
    }
  };`,
    `  const dkdReadCurrentLocation = async () => {
    const dkdServicesEnabled = await Location.hasServicesEnabledAsync();
    if (!dkdServicesEnabled) throw new Error('Telefonun konum hizmetini açıp yeniden dene.');
    const dkdCurrent = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setPoint({ latitude: dkdCurrent.coords.latitude, longitude: dkdCurrent.coords.longitude });
  };

  const useMyLocation = async () => {
    const dkdPermission = await Location.getForegroundPermissionsAsync();
    if (dkdPermission.granted) {
      setSearching(true);
      try { await dkdReadCurrentLocation(); }
      catch (dkdError) { Alert.alert('Konum alınamadı', dkdError instanceof Error ? dkdError.message : 'Tekrar dene.'); }
      finally { setSearching(false); }
      return;
    }
    setDkdLocationCanAskAgain(dkdPermission.canAskAgain !== false);
    setDkdLocationPermissionOpen(true);
  };

  const dkdGrantLocationPermission = async () => {
    setDkdLocationWorking(true);
    try {
      if (!dkdLocationCanAskAgain) {
        await Linking.openSettings();
        setDkdLocationPermissionOpen(false);
        return;
      }
      const dkdPermission = await Location.requestForegroundPermissionsAsync();
      if (!dkdPermission.granted) {
        setDkdLocationCanAskAgain(dkdPermission.canAskAgain !== false);
        return;
      }
      setDkdLocationPermissionOpen(false);
      setSearching(true);
      try { await dkdReadCurrentLocation(); }
      finally { setSearching(false); }
    } catch (dkdError) {
      Alert.alert('Konum alınamadı', dkdError instanceof Error ? dkdError.message : 'Tekrar dene.');
    } finally {
      setDkdLocationWorking(false);
    }
  };`,
    'location custom permission flow',
  );
  dkdContent = dkdReplace(
    dkdContent,
    `      </Modal>
    </View>`,
    `      </Modal>
      <DkdPermissionModal visible={dkdLocationPermissionOpen} icon="location" eyebrow="KONUM İZNİ" title="Konumu güvenli şekilde kullan" description="DraBornGate konumunu yalnızca sen Konumumu Kullan düğmesine bastığında ve uygulama açıkken tek sefer kontrol eder." points={['Arka planda konum takibi yapılmaz', 'Konum yalnızca doğru site noktasını seçmek için kullanılır', 'İzni telefon ayarlarından istediğin zaman kapatabilirsin']} primaryLabel={dkdLocationCanAskAgain ? 'KONUMA İZİN VER' : 'AYARLARI AÇ'} onPrimary={dkdGrantLocationPermission} onClose={() => setDkdLocationPermissionOpen(false)} working={dkdLocationWorking} />
    </View>`,
    'location permission modal render',
  );
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchOperationNotifications() {
  const dkdFile = 'src/store/GateContext.tsx';
  let dkdContent = dkdRead(dkdFile);
  if (!dkdContent.includes('DKD_V0312_COMPLETE_OPERATION_NOTIFICATIONS')) {
    dkdContent = `// DKD_V0312_COMPLETE_OPERATION_NOTIFICATIONS\n${dkdContent}`;
  }
  dkdContent = dkdReplace(
    dkdContent,
    `  dkd_gate_delete_demo_data: { title: 'Örnek veriler silindi', body: 'Sana ait örnek kayıtlar kaldırıldı.' },`,
    `  dkd_gate_delete_demo_data: { title: 'Örnek veriler silindi', body: 'Sana ait örnek kayıtlar kaldırıldı.' },
  dkd_gate_create_courier_pass_v2: { title: 'Geçiş talebi gönderildi', body: 'Kurye geçiş talebin güvenliğe iletildi.' },
  dkd_gate_update_courier_pass_status_v2: { title: 'Geçiş durumu güncellendi', body: 'Kurye geçiş kaydındaki son işlem tamamlandı.' },
  dkd_gate_retry_courier_pass: { title: 'Geçiş talebi yeniden gönderildi', body: 'Talebin yeniden değerlendirilmek üzere güvenliğe iletildi.' },
  dkd_gate_decide_visitor_pass: { title: 'Misafir geçişi güncellendi', body: 'Misafir kodu için seçtiğin işlem kaydedildi.' },`,
    'operation notification coverage',
  );
  dkdWrite(dkdFile, dkdContent);
}

function dkdMain() {
  dkdCreatePermissionModal();
  dkdPatchNotifications();
  dkdPatchApp();
  dkdPatchLocationPicker();
  dkdPatchOperationNotifications();
  console.log('DraBornGate v0.3.12 modern izin ekranları ve işlem bildirimleri uygulandı.');
}

dkdMain();
