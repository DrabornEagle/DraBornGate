import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppTab, BottomDock } from './src/components/BottomDock';
import { AppBackground } from './src/components/UI';
import { AuthScreen } from './src/screens/AuthScreen';
import { CourierHome } from './src/screens/CourierHome';
import { CreatePassScreen } from './src/screens/CreatePassScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ManagementHome } from './src/screens/ManagementHome';
import { PassesScreen } from './src/screens/PassesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SecurityHome } from './src/screens/SecurityHome';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { GateProvider, useGate } from './src/store/GateContext';
import { colors } from './src/theme';
import { UserRole } from './src/types';

function AppContent() {
  const { initialized, session, profile, refreshing } = useGate();
  const [role, setRole] = useState<UserRole | null>(null);
  const [tab, setTab] = useState<AppTab>('home');
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [roleInitialized, setRoleInitialized] = useState(false);
  useEffect(() => {
    if (session && profile && !roleInitialized) {
      setRole(profile.preferredRole);
      setRoleInitialized(true);
    }
  }, [profile, roleInitialized, session]);
  useEffect(() => {
    if (!session) {
      setRole(null);
      setRoleInitialized(false);
      setTab('home');
      setShowCreatePass(false);
    }
  }, [session]);
  if (!initialized || (session && !profile && refreshing)) return <AppBackground><View style={styles.loading}><ActivityIndicator size="large" color={colors.cyan} /><Text style={styles.loadingTitle}>DraBornGate</Text><Text style={styles.loadingText}>Supabase güvenlik sistemi hazırlanıyor</Text></View></AppBackground>;
  if (!session) return <AuthScreen />;
  if (!role) return <WelcomeScreen onSelectRole={(selected) => { setRole(selected); setRoleInitialized(true); setTab('home'); }} />;
  const render = () => {
    if (showCreatePass && role === 'courier') return <CreatePassScreen onBack={() => setShowCreatePass(false)} onCreated={() => { setShowCreatePass(false); setTab('passes'); }} />;
    if (tab === 'passes') return <PassesScreen role={role} />;
    if (tab === 'history') return <HistoryScreen role={role} />;
    if (tab === 'profile') return <ProfileScreen role={role} onSwitchRole={() => { setRole(null); setTab('home'); }} />;
    if (role === 'courier') return <CourierHome onCreatePass={() => setShowCreatePass(true)} onOpenPasses={() => setTab('passes')} onOpenSettings={() => setTab('profile')} />;
    if (role === 'security') return <SecurityHome />;
    return <ManagementHome />;
  };
  return <AppBackground><SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><View style={styles.screen}>{render()}</View>{!showCreatePass ? <BottomDock role={role} current={tab} onChange={setTab} /> : null}</SafeAreaView></AppBackground>;
}
export default function App() { return <SafeAreaProvider><GateProvider><StatusBar style="light" /><AppContent /></GateProvider></SafeAreaProvider>; }
const styles = StyleSheet.create({ safe: { flex: 1 }, screen: { flex: 1 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, loadingTitle: { color: colors.text, fontSize: 27, fontWeight: '900', marginTop: 16 }, loadingText: { color: colors.textSoft, fontSize: 13, marginTop: 6 } });
