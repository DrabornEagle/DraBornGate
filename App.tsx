import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BottomDock, AppTab } from './src/components/BottomDock';
import { AnimatedMotorcycle, FloatingView, PulseDot } from './src/components/Motion';
import { AppBackground } from './src/components/UI';
import { CourierHome } from './src/screens/CourierHome';
import { CreatePassScreen } from './src/screens/CreatePassScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ManagementHome } from './src/screens/ManagementHome';
import { PassesScreen } from './src/screens/PassesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SecurityHome } from './src/screens/SecurityHome';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { DemoProvider, useDemo } from './src/store/DemoContext';
import { colors } from './src/theme';
import { UserRole } from './src/types';

function AppContent() {
  const { hydrated } = useDemo();
  const [role, setRole] = useState<UserRole | null>(null);
  const [tab, setTab] = useState<AppTab>('home');
  const [showCreatePass, setShowCreatePass] = useState(false);

  if (!hydrated) {
    return (
      <AppBackground>
        <View style={styles.loading}>
          <FloatingView style={styles.loadingLogo} distance={7} duration={1500}>
            <AnimatedMotorcycle color={colors.cyan} size={48} />
          </FloatingView>
          <Text style={styles.loadingTitle}>DraBornGate</Text>
          <View style={styles.loadingRow}>
            <PulseDot color={colors.green} />
            <Text style={styles.loadingText}>Demo güvenlik sistemi hazırlanıyor</Text>
          </View>
        </View>
      </AppBackground>
    );
  }

  if (!role) {
    return (
      <WelcomeScreen
        onSelectRole={(selectedRole) => {
          setRole(selectedRole);
          setTab('home');
        }}
      />
    );
  }

  const renderCurrentScreen = () => {
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

    if (tab === 'passes') return <PassesScreen role={role} />;
    if (tab === 'history') return <HistoryScreen role={role} />;
    if (tab === 'profile') {
      return (
        <ProfileScreen
          role={role}
          onSwitchRole={() => {
            setRole(null);
            setTab('home');
          }}
        />
      );
    }

    if (role === 'courier') {
      return (
        <CourierHome
          onCreatePass={() => setShowCreatePass(true)}
          onOpenPasses={() => setTab('passes')}
        />
      );
    }
    if (role === 'security') return <SecurityHome />;
    return <ManagementHome />;
  };

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.screen}>{renderCurrentScreen()}</View>
        {!showCreatePass ? (
          <BottomDock role={role} current={tab} onChange={setTab} />
        ) : null}
      </SafeAreaView>
    </AppBackground>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DemoProvider>
        <StatusBar style="light" />
        <AppContent />
      </DemoProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingLogo: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: '700',
  },
});
