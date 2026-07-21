import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { PropsWithChildren, useEffect, useRef } from 'react';
import {
  Animated,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, gradients, radius, spacing } from '../theme';
import { PassStatus } from '../types';
import { PulseDot } from './Motion';

export function AppBackground({ children }: PropsWithChildren) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 5500,
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 5500,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [drift]);

  return (
    <View style={styles.background}>
      <Animated.View
        style={[
          styles.orb,
          styles.orbCyan,
          {
            transform: [
              {
                translateY: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-16, 20],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orbPurple,
          {
            transform: [
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, -22],
                }),
              },
            ],
          },
        ]}
      />
      {children}
    </View>
  );
}

export function Panel({
  children,
  style,
  gradient = false,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; gradient?: boolean }>) {
  if (gradient) {
    return (
      <LinearGradient colors={gradients.panel} style={[styles.panel, style]}>
        {children}
      </LinearGradient>
    );
  }

  return <View style={[styles.panel, style]}>{children}</View>;
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

const statusMeta: Record<
  PassStatus,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  waiting: { label: 'Onay bekliyor', color: colors.orange, icon: 'time' },
  approved: { label: 'Onaylandı', color: colors.green, icon: 'shield-checkmark' },
  rejected: { label: 'Reddedildi', color: colors.red, icon: 'close-circle' },
  arrived: { label: 'Kapıda', color: colors.cyan, icon: 'navigate' },
  completed: { label: 'Tamamlandı', color: colors.purple, icon: 'checkmark-done' },
};

export function StatusPill({ status }: { status: PassStatus }) {
  const meta = statusMeta[status];
  return (
    <View style={[styles.statusPill, { borderColor: `${meta.color}55` }]}>
      <Ionicons name={meta.icon} size={14} color={meta.color} />
      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

export function LiveBadge({ label = 'CANLI' }: { label?: string }) {
  return (
    <View style={styles.liveBadge}>
      <PulseDot color={colors.green} />
      <Text style={styles.liveText}>{label}</Text>
    </View>
  );
}

export function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
}) {
  return (
    <Panel style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${tone}1F` }]}>
        <Ionicons name={icon} size={19} color={tone} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Panel>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <Panel style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.cyan} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 260,
    opacity: 0.12,
  },
  orbCyan: {
    backgroundColor: colors.cyan,
    right: -150,
    top: -70,
  },
  orbPurple: {
    backgroundColor: colors.purple,
    left: -180,
    bottom: 70,
  },
  panel: {
    backgroundColor: 'rgba(13, 32, 51, 0.94)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionAction: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.035)',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  liveBadge: {
    paddingHorizontal: 10,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(67, 231, 162, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(67, 231, 162, 0.26)',
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  liveText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  metricCard: {
    flex: 1,
    minHeight: 116,
    padding: 13,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.textSoft,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(55, 216, 255, 0.12)',
    marginBottom: 14,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyDescription: {
    color: colors.textSoft,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 260,
  },
});
