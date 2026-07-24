import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { DeliveryPlatform } from '../types';
import { AnimatedPressable, FloatingView, PulseDot } from './Motion';
import { RacingMotorcycle } from './RacingMotorcycle';

type PlatformItem = {
  id: DeliveryPlatform;
  title: string;
  subtitle: string;
  colors: readonly [string, string];
  foreground: string;
  kind: 'draborngo' | 'uber' | 'text' | 'icon';
  mark?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

const platforms: PlatformItem[] = [
  {
    id: 'DraBornGo',
    title: 'DraBornGo',
    subtitle: 'DraBorn teslimat ağı',
    colors: ['#083E5D', '#145D7A'],
    foreground: '#37D8FF',
    kind: 'draborngo',
  },
  {
    id: 'Trendyol/Uber Eats',
    title: 'Trendyol / Uber Eats',
    subtitle: 'Trendyol ve Uber Eats ağı',
    colors: ['#111111', '#242424'],
    foreground: '#06C167',
    kind: 'uber',
  },
  {
    id: 'Yemeksepeti',
    title: 'Yemeksepeti',
    subtitle: 'Yemek teslimatı',
    colors: ['#C90040', '#EF1457'],
    foreground: '#FFFFFF',
    kind: 'text',
    mark: 'Y',
  },
  {
    id: 'Getir',
    title: 'Getir',
    subtitle: 'Hızlı teslimat',
    colors: ['#4E2CA8', '#6D49C8'],
    foreground: '#FFD300',
    kind: 'text',
    mark: 'getir',
  },
  {
    id: 'Diğer',
    title: 'Diğer kurum',
    subtitle: 'Başka bir teslimat platformu',
    colors: ['#2D4053', '#40576B'],
    foreground: '#D7E4EF',
    kind: 'icon',
    icon: 'briefcase',
  },
];

function PlatformLogo({ platform, compact }: { platform: PlatformItem; compact: boolean }) {
  if (platform.kind === 'draborngo') {
    return <RacingMotorcycle color={platform.foreground} accentColor={colors.white} size={compact ? 42 : 48} />;
  }
  if (platform.kind === 'uber') {
    return (
      <View style={styles.uberMark}>
        <Text style={styles.uberText}>UBER</Text>
        <Text style={styles.eatsText}>EATS</Text>
      </View>
    );
  }
  if (platform.kind === 'icon') {
    return <Ionicons name={platform.icon ?? 'briefcase'} size={compact ? 20 : 23} color={platform.foreground} />;
  }
  return (
    <Text style={[styles.mark, platform.id === 'Getir' && styles.getirMark, { color: platform.foreground }]}>
      {platform.mark}
    </Text>
  );
}

export function DeliveryPlatformPicker({
  value,
  onChange,
  compact = false,
}: {
  value: DeliveryPlatform;
  onChange: (value: DeliveryPlatform) => void;
  compact?: boolean;
}) {
  return (
    <View style={styles.grid}>
      {platforms.map((platform) => {
        const active = value === platform.id;
        return (
          <AnimatedPressable
            key={platform.id}
            containerStyle={styles.pressable}
            onPress={() => onChange(platform.id)}
          >
            <LinearGradient
              colors={active ? [platform.colors[0], platform.colors[1]] : ['rgba(255,255,255,.025)', 'rgba(255,255,255,.012)']}
              style={[styles.card, compact && styles.cardCompact, active && styles.cardActive]}
            >
              <FloatingView distance={active ? 3 : 1} duration={active ? 1250 : 1900} style={[styles.logo, compact && styles.logoCompact]}>
                <LinearGradient colors={platform.colors} style={styles.logoGradient}>
                  <PlatformLogo platform={platform} compact={compact} />
                </LinearGradient>
              </FloatingView>
              <View style={styles.copy}>
                <Text style={[styles.title, active && styles.titleActive]} numberOfLines={2}>{platform.title}</Text>
                {!compact ? <Text style={[styles.subtitle, active && styles.subtitleActive]}>{platform.subtitle}</Text> : null}
              </View>
              {active ? <PulseDot color={platform.foreground} size={8} /> : <Ionicons name="ellipse-outline" size={18} color={colors.textMuted} />}
            </LinearGradient>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  pressable: { width: '48.5%' },
  card: { minHeight: 88, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9, overflow: 'hidden' },
  cardCompact: { minHeight: 68, padding: 8 },
  cardActive: { borderColor: colors.cyan },
  logo: { width: 50, height: 50, borderRadius: 15, overflow: 'hidden' },
  logoCompact: { width: 45, height: 45, borderRadius: 14 },
  logoGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { fontSize: 18, fontWeight: '900', letterSpacing: -.8 },
  getirMark: { fontSize: 12, letterSpacing: -.5 },
  uberMark: { alignItems: 'flex-start', justifyContent: 'center', lineHeight: 12 },
  uberText: { color: colors.white, fontSize: 10, lineHeight: 10, fontWeight: '900', letterSpacing: -.5 },
  eatsText: { color: '#06C167', fontSize: 11, lineHeight: 11, fontWeight: '900', letterSpacing: -.6 },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.textSoft, fontSize: 11, lineHeight: 14, fontWeight: '900' },
  titleActive: { color: colors.white },
  subtitle: { color: colors.textMuted, fontSize: 9, lineHeight: 13, marginTop: 3 },
  subtitleActive: { color: 'rgba(255,255,255,.72)' },
});
