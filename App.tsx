import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppTab, BottomDock } from './src/components/BottomDock';
import { AppBackground } from './src/components/UI';
import { APP_VERSION } from './src/config/version';
import { useGateRoles } from './src/hooks/useGateRoles';
import { AuthScreen } from './src/screens/AuthScreen';
import { CourierHome } from './src/screens/CourierHome';
import { CreatePassScreen } from './src/screens/CreatePassScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ManagementAccessGate } from './src/screens/ManagementAccessGate';
import { ManagementProCenter } from './src/screens/ManagementProCenter';
import { PassesScreen } from './src/screens/PassesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ResidentHome } from './src/screens/ResidentHome';
import { SecurityHome } from './src/screens/SecurityHome';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { GateProvider, useGate } from './src/store/GateContext';
import { colors } from './src/theme';
import { UserRole } from './src/types';

function AppContent() {
  const { initialized, session, profile, refreshing, error } = useGate();
  const { roles, loading: rolesLoading, selectRole } = useGateRoles();
  const [role, setRole] = useState<UserRole | null>(null);
  const [tab, setTab] = useState<AppTab>('home');
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [roleInitialized, setRoleInitialized] = useState(false);

  useEffect(() => {
    if (!session || !profile || rolesLoading || roleInitialized) return;
    const preferred = roles.includes(profile.preferredRole) ? profile.preferredRole : roles[0] ?? 'courier';
    setRole(preferred);
    setRoleInitialized(true);
  }, [profile, roleInitialized, roles, rolesLoading, session]);

  useEffect(() => {
    if (role && roles.length && !roles.includes(role)) {
      setRole(roles[0] ?? 'courier');
      setTab('home');
    }
  }, [role, roles]);

  useEffect(() => {
    if (!session) {
      setRole(null);
      setRoleInitialized(false);
      setTab('home');
      setShowCreatePass(false);
    }
  }, [session]);

  const changeRole = async (selected: UserRole) => {
    await selectRole(selected);
    setRole(selected);
    setRoleInitialized(true);
    setTab('home');
    setShowCreatePass(false);
  };

  if (!initialized || (session && (!profile || rolesLoading) && refreshing)) {
    return (
      <AppBackground>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.loadingTitle}>DraBornGate v{APP_VERSION}</Text>
          <Text style={styles.loadingText}>Yetkili rollerin, site kayıtların ve geçiş merkezi hazırlanıyor</Text>
        </View>
      </AppBackground>
    );
  }
  if (!session) return <AuthScreen />;
  if (!role) return <WelcomeScreen roles={roles} onSelectRole={(selected) => void changeRole(selected)} />;

  const render = () => {
    if (showCreatePass && role === 'courier') {
      return (
        <CreatePassScreen
          onBack={() => setShowCreatePass(false)}
          onCreated={() => {
            setShowCreatePass(false);
            setTab('passes');
          }}
        />
      );
    }
    if (tab === 'passes') return role === 'management' ? <ManagementProCenter /> : <PassesScreen role={role} />;
    if (tab === 'history') return <HistoryScreen role={role} />;
    if (tab === 'profile') return <ProfileScreen role={role} onSelectRole={(selected) => void changeRole(selected)} />;
    if (role === 'courier') {
      return (
        <CourierHome
          onCreatePass={() => setShowCreatePass(true)}
          onOpenPasses={() => setTab('passes')}
          onOpenSettings={() => setTab('profile')}
        />
      );
    }
    if (role === 'security') return <SecurityHome />;
    if (role === 'resident') return <ResidentHome onOpenProfile={() => setTab('profile')} />;
    return <ManagementAccessGate />;
  };

  return (
    <AppBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.screen}>
          {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
          {render()}
        </View>
        {!showCreatePass ? <BottomDock role={role} current={tab} onChange={setTab} /> : null}
      </SafeAreaView>
    </AppBackground>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GateProvider>
        <StatusBar style="light" />
        <AppContent />
      </GateProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingTitle: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 16 },
  loadingText: { color: colors.textSoft, fontSize: 14, marginTop: 7, textAlign: 'center' },
  error: { marginHorizontal: 16, marginTop: 6, borderWidth: 1, borderColor: 'rgba(255,101,125,.45)', backgroundColor: 'rgba(255,101,125,.10)', borderRadius: 14, padding: 9 },
  errorText: { color: colors.red, fontSize: 12, fontWeight: '800', textAlign: 'center' },
});
