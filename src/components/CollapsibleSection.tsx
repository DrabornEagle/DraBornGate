import { Ionicons } from '@expo/vector-icons';
import React, { PropsWithChildren, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { AnimatedPressable } from './Motion';

export function CollapsibleSection({ title, subtitle, icon, tone = colors.cyan, initiallyOpen = false, children }: PropsWithChildren<{ title: string; subtitle?: string; icon: keyof typeof Ionicons.glyphMap; tone?: string; initiallyOpen?: boolean }>) {
  const [open, setOpen] = useState(initiallyOpen);
  const rotation = useRef(new Animated.Value(initiallyOpen ? 1 : 0)).current;
  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.spring(rotation, { toValue: next ? 1 : 0, damping: 18, stiffness: 220, useNativeDriver: true }).start();
  };
  return <View style={s.wrapper}>
    <AnimatedPressable onPress={toggle}>
      <View style={[s.header, { borderColor: `${tone}55`, backgroundColor: `${tone}0D` }]}>
        <View style={[s.icon, { backgroundColor: `${tone}1A` }]}><Ionicons name={icon} size={23} color={tone} /></View>
        <View style={s.copy}><Text style={s.title}>{title}</Text>{subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}</View>
        <Animated.View style={{ transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}><Ionicons name="chevron-down" size={22} color={tone} /></Animated.View>
      </View>
    </AnimatedPressable>
    {open ? <View style={s.content}>{children}</View> : null}
  </View>;
}

const s = StyleSheet.create({
  wrapper: { gap: 10 },
  header: { minHeight: 72, borderRadius: radius.lg, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 17, fontWeight: '900' },
  subtitle: { color: colors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 3 },
  content: { gap: 12 },
});
