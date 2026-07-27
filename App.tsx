// DKD_V0312_PERMISSION_POPUPS
// DKD_V0312_APP
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppTab, BottomDock } from './src/components/BottomDock';
import { DkdNotificationBell } from './src/components/DkdNotificationCenter';
import { DkdPermissionModal } from './src/components/DkdPermissionModal';
import { AppBackground } from './src/components/UI';
import { APP_VERSION } from './src/config/version';
import { useGateRoles } from './src/hooks/useGateRoles';
import { getGateNotificationPermissionState, requestGateNotificationPermission } from './src/lib/notifications';
import { AuthScreen } from './src/screens/AuthScreen';
import { CourierCenterV032 } from './src/screens/CourierCenterV032';
import { CourierHome } from './src/screens/CourierHome';
import { CreatePassScreen } from './src/screens/CreatePassScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { LaunchScreen } from './src/screens/LaunchScreen';
import { ManagementAccessGate } from './src/screens/ManagementAccessGate';
import { ManagementProCenter } from './src/screens/ManagementProCenter';
import { PassesScreen } from './src/screens/PassesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ResidentHome } from './src/screens/ResidentHome';
import { SecurityHome } from './src/screens/SecurityHome';
import { SiteRoleAccessGate } from './src/screens/SiteRoleAccessGate';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { GateProvider, useGate } from './src/store/GateContext';
import { colors } from './src/theme';
import { UserRole } from './src/types';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 0, fade: false });

function AppContent() {
  const { initialized, session, profile, refreshing, error, refresh } = useGate();
  const { roles, loading: rolesLoading, selectRole } = useGateRoles();
  const [role, setRole] = useState<UserRole | null>(null);
  const [tab, setTab] = useState<AppTab>('home');
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [courierCenterInitialTab, setCourierCenterInitialTab] = useState<'passes' | 'packages'>('passes');
  const [roleInitialized, setRoleInitialized] = useState(false);
  const [introPassed, setIntroPassed] = useState(false);
  const [dkdNotificationPermissionOpen, setDkdNotificationPermissionOpen] = useState(false);
  const [dkdNotificationPermissionLocked, setDkdNotificationPermissionLocked] = useState(false);
  const [dkdNotificationPermissionWorking, setDkdNotificationPermissionWorking] = useState(false);

  useEffect(() => { if (!session || !profile || rolesLoading || roleInitialized) return; const preferred = roles.includes(profile.preferredRole) ? profile.preferredRole : roles[0] ?? 'courier'; setRole(preferred); setRoleInitialized(true); }, [profile, roleInitialized, roles, rolesLoading, session]);
  useEffect(() => { if (role && roles.length && !roles.includes(role)) { setRole(roles[0] ?? null); setTab('home'); } }, [role, roles]);
  useEffect(() => { if (!session) { setRole(null); setRoleInitialized(false); setTab('home'); setShowCreatePass(false); setDkdNotificationPermissionOpen(false); } }, [session]);
  useEffect(() => {
    if (!session || !introPassed) return;
    let dkdActive = true;
    void getGateNotificationPermissionState().then((dkdPermission) => {
      if (!dkdActive || dkdPermission.granted || dkdPermission.status === 'unavailable') return;
      setDkdNotificationPermissionLocked(!dkdPermission.canAskAgain);
      setDkdNotificationPermissionOpen(true);
    });
    return () => { dkdActive = false; };
  }, [introPassed, session?.user.id]);
  useEffect(() => { if (!session) return; void refresh(); }, [role, session, showCreatePass, tab]);
  useEffect(() => {
    if (!session) return;
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 20000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [refresh, session]);

  const changeRole = async (selected: UserRole) => { await selectRole(selected); setRole(selected); setRoleInitialized(true); setTab('home'); setShowCreatePass(false); await refresh(); };
  const openCourierPackages = () => { setCourierCenterInitialTab('packages'); setShowCreatePass(false); setTab('passes'); };
  const openCourierPasses = () => { setCourierCenterInitialTab('passes'); setShowCreatePass(false); setTab('passes'); };
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
  };
  if (!introPassed) return <LaunchScreen onStart={() => setIntroPassed(true)} />;
  if (!initialized || (session && (!profile || rolesLoading) && refreshing)) return <AppBackground><View style={styles.loading}><ActivityIndicator size="large" color={colors.cyan} /><Text style={styles.loadingTitle}>DraBornGate v{APP_VERSION}</Text><Text style={styles.loadingText}>Yetkili rollerin, site kayıtların ve geçiş merkezi hazırlanıyor</Text></View></AppBackground>;
  if (!session) return <AuthScreen />;
  if (!role) return <WelcomeScreen roles={roles} onSelectRole={(selected) => void changeRole(selected)} />;
  const render = () => {
    if (showCreatePass && role === 'courier') return <CreatePassScreen onBack={() => setShowCreatePass(false)} onOpenPackages={openCourierPackages} onCreated={() => { setShowCreatePass(false); setCourierCenterInitialTab('passes'); setTab('passes'); void refresh(); }} />;
    if (tab === 'passes') { if (role === 'management') return <ManagementProCenter />; if (role === 'courier') return <CourierCenterV032 initialTab={courierCenterInitialTab} />; return <PassesScreen role={role} />; }
    if (tab === 'history') return <HistoryScreen role={role} />;
    if (tab === 'profile') return <ProfileScreen role={role} onSelectRole={(selected) => void changeRole(selected)} />;
    if (role === 'courier') return <CourierHome onCreatePass={() => setShowCreatePass(true)} onOpenPasses={openCourierPasses} onOpenSettings={() => setTab('profile')} />;
    if (role === 'security') return <SiteRoleAccessGate role="security"><SecurityHome /></SiteRoleAccessGate>;
    if (role === 'resident') return <SiteRoleAccessGate role="resident"><ResidentHome onOpenProfile={() => setTab('profile')} /></SiteRoleAccessGate>;
    return <ManagementAccessGate />;
  };
  const hideNotificationBell = showCreatePass || (role === 'courier' && tab === 'passes');
  return <><AppBackground><SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><View style={styles.screen}>{error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}{render()}{!hideNotificationBell ? <DkdNotificationBell /> : null}</View>{!showCreatePass ? <BottomDock role={role} current={tab} onChange={setTab} /> : null}</SafeAreaView></AppBackground><DkdPermissionModal visible={dkdNotificationPermissionOpen} icon="notifications" eyebrow="BİLDİRİM İZNİ" title="Önemli işlemleri kaçırma" description="Geçiş, paket, destek ve güvenlik hareketlerini cihazında anında gösterebilmemiz için bildirim izni gerekir." points={['Geçiş talebi ve durum değişiklikleri', 'Paket, destek ve hesap işlemleri', 'Seçtiğin DraBornGate zil sesi']} primaryLabel={dkdNotificationPermissionLocked ? 'AYARLARI AÇ' : 'BİLDİRİMLERE İZİN VER'} onPrimary={dkdEnableNotifications} onClose={() => setDkdNotificationPermissionOpen(false)} working={dkdNotificationPermissionWorking} /></>;
}

export default function App() {
  const hideNativeSplash = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return <View style={styles.root} onLayout={hideNativeSplash}><SafeAreaProvider><GateProvider><StatusBar style="light" /><AppContent /></GateProvider></SafeAreaProvider></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#02070D' }, safe: { flex: 1 }, screen: { flex: 1 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, loadingTitle: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 16 }, loadingText: { color: colors.textSoft, fontSize: 14, marginTop: 7, textAlign: 'center' }, error: { marginHorizontal: 16, marginTop: 6, borderWidth: 1, borderColor: 'rgba(255,101,125,.45)', backgroundColor: 'rgba(255,101,125,.10)', borderRadius: 14, padding: 9 }, errorText: { color: colors.red, fontSize: 12, fontWeight: '800', textAlign: 'center' } });
