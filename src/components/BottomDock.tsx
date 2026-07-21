import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { UserRole } from '../types';
import { AnimatedPressable } from './Motion';

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
  const tabs: AppTab[] =
    role === 'management'
      ? ['home', 'passes', 'history', 'profile']
      : ['home', 'passes', 'history', 'profile'];

  return (
    <View style={styles.wrapper}>
      <View style={styles.dock}>
        {tabs.map((tab) => {
          const active = tab === current;
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
                <Ionicons
                  name={icons[tab]}
                  size={active ? 21 : 20}
                  color={active ? colors.cyan : colors.textMuted}
                />
                <Text style={[styles.label, active && styles.labelActive]}>
                  {role === 'security' && tab === 'passes'
                    ? 'Kuyruk'
                    : role === 'management' && tab === 'passes'
                      ? 'Kurallar'
                      : labels[tab]}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 10,
  },
  dock: {
    flexDirection: 'row',
    backgroundColor: 'rgba(9, 25, 41, 0.98)',
    borderRadius: radius.xl,
    padding: 7,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  itemWrap: {
    flex: 1,
  },
  item: {
    height: 54,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemActive: {
    backgroundColor: 'rgba(55, 216, 255, 0.1)',
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.cyan,
  },
});
