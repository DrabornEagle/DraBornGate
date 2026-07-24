import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DeliveryPlatform } from '../types';
import { AnimatedPressable } from './Motion';
import { colors, radius } from '../theme';

const platforms: Array<{
  id: DeliveryPlatform;
  title: string;
  subtitle: string;
  background: string;
  foreground: string;
  mark?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: 'DraBornGo',
    title: 'DraBornGo',
    subtitle: 'DraBorn ağı',
    background: '#0C4967',
    foreground: '#37D8FF',
    icon: 'bicycle',
  },
  {
    id: 'Trendyol Go',
    title: 'Trendyol Go',
    subtitle: 'Teslimat ağı',
    background: '#F27A1A',
    foreground: '#FFFFFF',
    mark: 'go',
  },
  {
    id: 'Yemeksepeti',
    title: 'Yemeksepeti',
    subtitle: 'Yemek teslimatı',
    background: '#EA004B',
    foreground: '#FFFFFF',
    mark: 'Y',
  },
  {
    id: 'Getir',
    title: 'Getir',
    subtitle: 'Hızlı teslimat',
    background: '#5D3EBC',
    foreground: '#FFD300',
    mark: 'getir',
  },
  {
    id: 'Diğer',
    title: 'Diğer kurum',
    subtitle: 'Başka bir platform',
    background: '#33495E',
    foreground: '#D7E4EF',
    icon: 'briefcase',
  },
];

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
            <View style={[styles.card, compact && styles.cardCompact, active && styles.cardActive]}>
              <View style={[styles.logo, { backgroundColor: platform.background }]}>
                {platform.icon ? (
                  <Ionicons name={platform.icon} size={compact ? 20 : 23} color={platform.foreground} />
                ) : (
                  <Text
                    style={[
                      styles.mark,
                      platform.id === 'Getir' && styles.getirMark,
                      { color: platform.foreground },
                    ]}
                  >
                    {platform.mark}
                  </Text>
                )}
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, active && styles.titleActive]} numberOfLines={1}>
                  {platform.title}
                </Text>
                {!compact ? <Text style={styles.subtitle}>{platform.subtitle}</Text> : null}
              </View>
              <Ionicons
                name={active ? 'checkmark-circle' : 'ellipse-outline'}
                size={19}
                color={active ? colors.cyan : colors.textMuted}
              />
            </View>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  pressable: { width: '48.5%' },
  card: {
    minHeight: 76,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,.025)',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  cardCompact: { minHeight: 58, padding: 8 },
  cardActive: { borderColor: colors.cyan, backgroundColor: 'rgba(55,216,255,.10)' },
  logo: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  mark: { fontSize: 18, fontWeight: '900', letterSpacing: -.8 },
  getirMark: { fontSize: 12, letterSpacing: -.5 },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.textSoft, fontSize: 12, fontWeight: '900' },
  titleActive: { color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 9, lineHeight: 13, marginTop: 2 },
});
