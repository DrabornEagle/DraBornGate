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
import { FloatingView, PulseDot } from './Motion';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function AppBackground({ children }: PropsWithChildren) {
  const drift = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const driftAnimation = Animated.loop(
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
    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 3200,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 3200,
          useNativeDriver: true,
        }),
      ]),
    );
    driftAnimation.start();
    breatheAnimation.start();
    return () => {
      driftAnimation.stop();
      breatheAnimation.stop();
    };
  }, [breathe, drift]);

  const orbScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.08],
  });

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
              { scale: orbScale },
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
              { scale: orbScale },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orbOrange,
          {
            opacity: breathe.interpolate({
              inputRange: [0, 1],
              outputRange: [0.045, 0.11],
            }),
            transform: [
              {
                translateY: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, -20],
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
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      damping: 18,
      stiffness: 130,
      mass: 0.75,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const animatedStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
      {
        scale: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

  if (gradient) {
    return (
      <AnimatedLinearGradient
        colors={gradients.panelColorful}
        style={[styles.panel, style, animatedStyle]}
      >
        <View style={styles.panelAccent} />
        {children}
      </AnimatedLinearGradient>
    );
  }

  return (
    <Animated.View style={[styles.panel, style, animatedStyle]}>
      <View style={styles.panelAccent} />
      {children}
    </Animated.View>
  );
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
    <View
      style={[
        styles.statusPill,
        {
          borderColor: `${meta.color}66`,
          backgroundColor: `${meta.color}14`,
        },
      ]}
    >
      <PulseDot color={meta.color} size={7} />
      <Ionicons name={meta.icon} size={15} color={meta.color} />
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
    <Panel style={[styles.metricCard, { borderColor: `${tone}45` }]} gradient>
      <FloatingView
        distance={4}
        duration={1500}
        style={[styles.metricIcon, { backgroundColor: `${tone}25` }]}
      >
        <Ionicons name={icon} size={22} color={tone} />
      </FloatingView>
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
    <Panel style={styles.emptyState} gradient>
      <FloatingView style={styles.emptyIcon}>
        <Ionicons name={icon} size={31} color={colors.cyan} />
      </FloatingView>
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
    width: 270,
    height: 270,
    borderRadius: 270,
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
  orbOrange: {
    backgroundColor: colors.orange,
    right: -180,
    bottom: -90,
  },
  panel: {
    backgroundColor: 'rgba(13, 32, 51, 0.95)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    overflow: 'hidden',
  },
  panelAccent: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 0,
    height: 2,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: 'rgba(55,216,255,0.34)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  sectionAction: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '800',
  },
  statusPill: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  liveBadge: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(67, 231, 162, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(67, 231, 162, 0.38)',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  liveText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  metricCard: {
    flex: 1,
    minHeight: 126,
    padding: 14,
  },
  metricIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 4,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(55, 216, 255, 0.14)',
    marginBottom: 15,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  emptyDescription: {
    color: colors.textSoft,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 22,
    maxWidth: 290,
  },
});
