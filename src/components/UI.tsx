import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, gradients, radius, spacing } from '../theme';
import { PassStatus } from '../types';
import { FloatingView, PulseDot } from './Motion';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export function AppBackground({ children }: PropsWithChildren) {
  const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 5200, useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 5200, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [motion]);
  return <View style={s.background}>
    <Animated.View style={[s.orb, s.cyanOrb, { transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [-18, 24] }) }, { scale: motion.interpolate({ inputRange: [0, 1], outputRange: [.94, 1.08] }) }] }]} />
    <Animated.View style={[s.orb, s.purpleOrb, { transform: [{ translateX: motion.interpolate({ inputRange: [0, 1], outputRange: [15, -24] }) }] }]} />
    <Animated.View style={[s.orb, s.orangeOrb, { opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [.04, .11] }) }]} />
    {children}
  </View>;
}

export function Panel({ children, style, gradient = false }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; gradient?: boolean }>) {
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(enter, { toValue: 1, damping: 18, stiffness: 130, mass: .75, useNativeDriver: true }).start(); }, [enter]);
  const animated = { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [.988, 1] }) }] };
  if (gradient) return <AnimatedGradient colors={gradients.panelColorful} style={[s.panel, style, animated]}><View style={s.accent} />{children}</AnimatedGradient>;
  return <Animated.View style={[s.panel, style, animated]}><View style={s.accent} />{children}</Animated.View>;
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{action ? <Text style={s.sectionAction}>{action}</Text> : null}</View>;
}

const statusMeta: Record<PassStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  waiting: { label: 'Onay bekliyor', color: colors.orange, icon: 'time' },
  approved: { label: 'Onaylandı', color: colors.green, icon: 'shield-checkmark' },
  rejected: { label: 'Reddedildi', color: colors.red, icon: 'close-circle' },
  arrived: { label: 'Kapıda', color: colors.cyan, icon: 'navigate' },
  completed: { label: 'Tamamlandı', color: colors.purple, icon: 'checkmark-done' },
  cancelled: { label: 'İptal edildi', color: colors.red, icon: 'trash' },
  expired: { label: 'Süresi doldu', color: colors.textMuted, icon: 'hourglass' },
};

export function StatusPill({ status }: { status: PassStatus }) {
  const meta = statusMeta[status];
  return <View style={[s.status, { borderColor: `${meta.color}66`, backgroundColor: `${meta.color}14` }]}><PulseDot color={meta.color} size={7} /><Ionicons name={meta.icon} size={14} color={meta.color} /><Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text></View>;
}

export function LiveBadge({ label = 'CANLI' }: { label?: string }) {
  return <View style={s.live}><PulseDot color={colors.green} /><Text style={s.liveText}>{label}</Text></View>;
}

export function MetricCard({ label, value, icon, tone }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; tone: string }) {
  return <Panel style={[s.metric, { borderColor: `${tone}45` }]} gradient><FloatingView distance={4} duration={1500} style={[s.metricIcon, { backgroundColor: `${tone}25` }]}><Ionicons name={icon} size={22} color={tone} /></FloatingView><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></Panel>;
}

export function EmptyState({ icon, title, description }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }) {
  return <Panel style={s.empty} gradient><FloatingView style={s.emptyIcon}><Ionicons name={icon} size={31} color={colors.cyan} /></FloatingView><Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyText}>{description}</Text></Panel>;
}

const s = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  orb: { position: 'absolute', width: 270, height: 270, borderRadius: 270, opacity: .1 }, cyanOrb: { backgroundColor: colors.cyan, right: -150, top: -70 }, purpleOrb: { backgroundColor: colors.purple, left: -180, bottom: 70 }, orangeOrb: { backgroundColor: colors.orange, right: -180, bottom: -90 },
  panel: { backgroundColor: 'rgba(13,32,51,.95)', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, padding: spacing.md, overflow: 'hidden' }, accent: { position: 'absolute', left: 18, right: 18, top: 0, height: 2, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: 'rgba(55,216,255,.34)' },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }, sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -.35 }, sectionAction: { color: colors.cyan, fontSize: 13, fontWeight: '900' },
  status: { minHeight: 34, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: 5, alignItems: 'center' }, statusText: { fontSize: 11, fontWeight: '900' },
  live: { paddingHorizontal: 11, height: 35, borderRadius: radius.pill, backgroundColor: 'rgba(67,231,162,.13)', borderWidth: 1, borderColor: 'rgba(67,231,162,.38)', flexDirection: 'row', gap: 7, alignItems: 'center' }, liveText: { color: colors.green, fontSize: 11, fontWeight: '900', letterSpacing: .6 },
  metric: { flex: 1, minHeight: 124, padding: 13 }, metricIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 11 }, metricValue: { color: colors.text, fontSize: 24, fontWeight: '900' }, metricLabel: { color: colors.textSoft, fontSize: 12, lineHeight: 16, marginTop: 4, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 28 }, emptyIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(55,216,255,.14)', marginBottom: 14 }, emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900' }, emptyText: { color: colors.textSoft, fontSize: 14, textAlign: 'center', marginTop: 7, lineHeight: 21, maxWidth: 290 },
});
