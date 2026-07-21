import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, gradients, radius } from '../theme';
import { UserRole } from '../types';
import { AnimatedPressable, PulseDot } from './Motion';

export type AppTab = 'home' | 'passes' | 'history' | 'profile';

const labels: Record<AppTab, string> = {
  home: 'Ana Sayfa',
  passes: 'Geçişler',
  history: 'Kayıtlar',
  profile: 'Profil',
};

const icons: Record<AppTab, keyof typeof Ionicons.glyphMap> = {
  home: 'grid',
  passes: 'shield-checkmark',
  history: 'time',
  profile: 'person',
};

export function BottomDock({
  role,
  current,
  onChange,
}: {
  role: UserRole;
  current: AppTab;
  onChange: (tab: AppTab) => void;
}) {
  const tabs: AppTab[] = ['home', 'passes', 'history', 'profile'];

  return (
    <View style={styles.wrapper}>
      <LinearGradient colors={gradients.panelColorful} style={styles.dock}>
        {tabs.map((tab) => {
          const active = tab === current;
          const label =
            role === 'security' && tab === 'passes'
              ? 'Kuyruk'
              : role === 'management' && tab === 'passes'
                ? 'Kurallar'
                : labels[tab];

          return (
            <AnimatedPressable
              key={tab}
              containerStyle={styles.itemWrap}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(tab);
              }}
            >
              <View style={[styles.item, active && styles.itemActive]}>
                {active ? <View style={styles.activeLine} /> : null}
                <Ionicons
                  name={icons[tab]}
                  size={active ? 23 : 21}
                  color={active ? colors.cyan : colors.textMuted}
                />
                <View style={styles.labelRow}>
                  {active ? <PulseDot color={colors.cyan} size={5} /> : null}
                  <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
                </View>
              </View>
            </AnimatedPressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 9,
  },
  dock: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    padding: 7,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  itemWrap: { flex: 1 },
  item: {
    height: 61,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    overflow: 'hidden',
  },
  itemActive: {
    backgroundColor: 'rgba(55, 216, 255, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(55,216,255,0.24)',
  },
  activeLine: {
    position: 'absolute',
    top: 0,
    width: 30,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: colors.cyan,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '800',
  },
  labelActive: {
    color: colors.cyan,
    fontWeight: '900',
  },
});
