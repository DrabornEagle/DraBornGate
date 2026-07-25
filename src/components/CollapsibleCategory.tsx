import { Ionicons } from '@expo/vector-icons';
import React, { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { AnimatedPressable, FadeInView, PulseDot } from './Motion';

export function CollapsibleCategory({
  title,
  subtitle,
  badge,
  icon,
  tone = colors.cyan,
  open,
  onToggle,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  badge?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: string;
  open?: boolean;
  onToggle: () => void;
}>) {
  const isOpen = Boolean(open);
  return <View style={styles.wrap}>
    <AnimatedPressable onPress={onToggle}>
      <View style={[styles.header, isOpen && { borderColor: `${tone}88`, backgroundColor: `${tone}12` }]}>
        <View style={[styles.icon, { backgroundColor: `${tone}20`, borderColor: `${tone}55` }]}>
          <Ionicons name={icon} size={25} color={tone} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {badge ? <View style={[styles.badge, { borderColor: `${tone}55`, backgroundColor: `${tone}16` }]}><PulseDot color={tone} size={6} /><Text style={[styles.badgeText, { color: tone }]}>{badge}</Text></View> : null}
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.chevron, isOpen && { backgroundColor: `${tone}1C` }]}>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={23} color={isOpen ? tone : colors.textMuted} />
        </View>
      </View>
    </AnimatedPressable>
    {isOpen ? <FadeInView distance={8} style={styles.body}>{children}</FadeInView> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  header: { minHeight: 86, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(10,29,47,.92)', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 54, height: 54, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { color: colors.text, fontSize: 19, lineHeight: 25, fontWeight: '900', flexShrink: 1 },
  subtitle: { color: colors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 4, fontWeight: '600' },
  badge: { minHeight: 27, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  chevron: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  body: { gap: 12 },
});
