import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, gradients, radius } from '../theme';
import { UserRole } from '../types';

export type AppTab = 'home' | 'passes' | 'history' | 'profile';
const tabs: AppTab[] = ['home', 'passes', 'history', 'profile'];
const icons: Record<AppTab, keyof typeof Ionicons.glyphMap> = { home: 'home', passes: 'shield-checkmark', history: 'time', profile: 'person' };

function label(role: UserRole, tab: AppTab) {
  if (tab === 'home') return 'Ana Sayfa';
  if (tab === 'history') return role === 'resident' ? 'Bildirimler' : 'Kayıtlar';
  if (tab === 'profile') return 'Profil';
  if (role === 'security') return 'Kuyruk';
  if (role === 'management') return 'Kurallar';
  if (role === 'resident') return 'Misafir/Aidat';
  return 'Geçişler';
}

export function BottomDock({ role, current, onChange }: { role: UserRole; current: AppTab; onChange: (tab: AppTab) => void }) {
  return <View style={s.wrapper} pointerEvents="box-none"><LinearGradient colors={gradients.panelColorful} style={s.dock}>{tabs.map((tab) => <DockItem key={tab} tab={tab} label={label(role, tab)} active={current === tab} onPress={() => { void Haptics.selectionAsync(); onChange(tab); }} />)}</LinearGradient></View>;
}

function DockItem({ tab, label: text, active, onPress }: { tab: AppTab; label: string; active: boolean; onPress: () => void }) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;
  useEffect(() => { Animated.spring(progress, { toValue: active ? 1 : 0, damping: 18, stiffness: 210, mass: .72, useNativeDriver: true }).start(); }, [active, progress]);
  const scalePress = (value: number) => Animated.spring(press, { toValue: value, damping: 16, stiffness: 360, useNativeDriver: true }).start();
  return <View style={s.slot}><Animated.View style={[s.item, { transform: [{ scale: press }, { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }]}><Pressable onPress={onPress} onPressIn={() => scalePress(.92)} onPressOut={() => scalePress(1)} style={s.pressable}><Animated.View pointerEvents="none" style={[s.surface, { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [.84, 1] }) }] }]} /><Animated.View pointerEvents="none" style={[s.line, { opacity: progress }]} /><Ionicons name={icons[tab]} size={active ? 24 : 22} color={active ? colors.cyan : colors.textMuted} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.75} style={[s.label, active && s.activeLabel]}>{text}</Text><Animated.View pointerEvents="none" style={[s.dot, { opacity: progress }]} /></Pressable></Animated.View></View>;
}

const s = StyleSheet.create({
  wrapper: { position: 'absolute', left: 12, right: 12, bottom: 9, zIndex: 50, elevation: 20 },
  dock: { width: '100%', minHeight: 76, flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.xl, padding: 7, borderWidth: 1, borderColor: colors.borderStrong, overflow: 'hidden' },
  slot: { width: '25%', flexBasis: '25%', flexGrow: 0, flexShrink: 0, minWidth: 0, paddingHorizontal: 2 }, item: { width: '100%', height: 62 },
  pressable: { width: '100%', height: '100%', borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden' },
  surface: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 20, backgroundColor: 'rgba(55,216,255,.13)', borderWidth: 1, borderColor: 'rgba(55,216,255,.29)' },
  line: { position: 'absolute', top: 0, width: 32, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.cyan },
  dot: { position: 'absolute', bottom: 5, width: 5, height: 5, borderRadius: 5, backgroundColor: colors.cyan },
  label: { width: '100%', paddingHorizontal: 1, fontSize: 10, color: colors.textMuted, fontWeight: '800', textAlign: 'center' }, activeLabel: { color: colors.cyan, fontWeight: '900' },
});
