import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AnimatedPressable } from './Motion';

type DkdPermissionModalProps = {
  visible: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  primaryLabel: string;
  onPrimary: () => void | Promise<void>;
  onClose: () => void;
  working?: boolean;
};

export function DkdPermissionModal({
  visible,
  icon,
  eyebrow,
  title,
  description,
  points,
  primaryLabel,
  onPrimary,
  onClose,
  working = false,
}: DkdPermissionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={dkdStyles.overlay}>
        <View style={dkdStyles.card}>
          <View style={dkdStyles.iconShell}><Ionicons name={icon} size={34} color={colors.cyan} /></View>
          <Text style={dkdStyles.eyebrow}>{eyebrow}</Text>
          <Text style={dkdStyles.title}>{title}</Text>
          <Text style={dkdStyles.description}>{description}</Text>
          <View style={dkdStyles.points}>
            {points.map((dkdPoint) => <View key={dkdPoint} style={dkdStyles.point}><View style={dkdStyles.check}><Ionicons name="checkmark" size={13} color={colors.background} /></View><Text style={dkdStyles.pointText}>{dkdPoint}</Text></View>)}
          </View>
          <AnimatedPressable onPress={() => void onPrimary()} disabled={working}>
            <View style={dkdStyles.primary}>{working ? <ActivityIndicator color={colors.background} /> : <Ionicons name="shield-checkmark" size={20} color={colors.background} />}<Text style={dkdStyles.primaryText}>{working ? 'HAZIRLANIYOR' : primaryLabel}</Text></View>
          </AnimatedPressable>
          <AnimatedPressable onPress={onClose} disabled={working}><Text style={dkdStyles.later}>ŞİMDİ DEĞİL</Text></AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

const dkdStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,5,12,.86)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 430, borderRadius: 28, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#081624', padding: 22, alignItems: 'center' },
  iconShell: { width: 72, height: 72, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(55,216,255,.45)', backgroundColor: 'rgba(55,216,255,.10)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginTop: 14 },
  title: { color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  description: { color: colors.textSoft, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  points: { width: '100%', gap: 9, marginTop: 16, marginBottom: 17 },
  point: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,.025)', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  check: { width: 23, height: 23, borderRadius: 8, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  pointText: { flex: 1, color: colors.textSoft, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  primary: { width: '100%', minHeight: 57, borderRadius: radius.lg, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 14 },
  primaryText: { color: colors.background, fontSize: 12, fontWeight: '900' },
  later: { color: colors.textMuted, fontSize: 11, fontWeight: '900', textAlign: 'center', paddingTop: 15, paddingBottom: 2 },
});
