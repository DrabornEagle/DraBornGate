import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, gradients, radius } from '../theme';
import { UserRole } from '../types';

export type AppTab = 'home' | 'passes' | 'history' | 'profile';

const tabs: AppTab[] = ['home', 'passes', 'history', 'profile'];

const labels: Record<AppTab, string> = {
  home: 'Ana Sayfa',
  passes: 'Geçişler',
  history: 'Kayıtlar',
  profile: 'Profil',
};

const icons: Record<AppTab, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
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
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <LinearGradient
        colors={gradients.panelColorful}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.dock}
      >
        {tabs.map((tab) => {
          const label =
            role === 'security' && tab === 'passes'
              ? 'Kuyruk'
              : role === 'management' && tab === 'passes'
                ? 'Kurallar'
                : labels[tab];

          return (
            <DockItem
              key={tab}
              tab={tab}
              label={label}
              active={tab === current}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(tab);
              }}
            />
          );
        })}
      </LinearGradient>
    </View>
  );
}

function DockItem({
  tab,
  label,
  active,
  onPress,
}: {
  tab: AppTab;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: active ? 1 : 0,
      damping: 18,
      stiffness: 210,
      mass: 0.72,
      useNativeDriver: true,
    }).start();
  }, [active, progress]);

  const animatePress = (pressed: boolean) => {
    Animated.spring(pressScale, {
      toValue: pressed ? 0.92 : 1,
      damping: 16,
      stiffness: 360,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.itemSlot}>
      <Animated.View style={[styles.animatedItem, { transform: [{ scale: pressScale }] }]}>
        <Animated.View
          style={[
            styles.activeMotion,
            {
              transform: [
                {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.035],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -2],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable
            onPress={onPress}
            onPressIn={() => animatePress(true)}
            onPressOut={() => animatePress(false)}
            style={styles.pressable}
            android_ripple={{ color: 'rgba(55,216,255,0.10)', borderless: false }}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activeSurface,
                {
                  opacity: progress,
                  transform: [
                    {
                      scale: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.82, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activeLine,
                {
                  opacity: progress,
                  transform: [
                    {
                      scaleX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Ionicons
              name={icons[tab]}
              size={active ? 24 : 22}
              color={active ? colors.cyan : colors.textMuted}
            />
            <Text
              numberOfLines={1}
              style={[styles.label, active && styles.labelActive]}
            >
              {label}
            </Text>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activeDot,
                {
                  opacity: progress,
                  transform: [
                    {
                      scale: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 9,
    zIndex: 50,
    elevation: 20,
  },
  dock: {
    width: '100%',
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.xl,
    padding: 7,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  itemSlot: {
    width: '25%',
    flexBasis: '25%',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  animatedItem: {
    width: '100%',
    height: 62,
  },
  activeMotion: {
    width: '100%',
    height: '100%',
  },
  pressable: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  activeSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: 'rgba(55,216,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(55,216,255,0.29)',
  },
  activeLine: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: colors.cyan,
  },
  activeDot: {
    position: 'absolute',
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: colors.cyan,
  },
  label: {
    maxWidth: '100%',
    paddingHorizontal: 2,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '800',
    textAlign: 'center',
  },
  labelActive: {
    color: colors.cyan,
    fontWeight: '900',
  },
});
