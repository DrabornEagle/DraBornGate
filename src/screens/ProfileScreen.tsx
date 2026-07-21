import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AnimatedMotorcycle,
  AnimatedPressable,
  FadeInView,
  FloatingView,
} from '../components/Motion';
import { Panel, SectionTitle } from '../components/UI';
import { useDemo } from '../store/DemoContext';
import { colors, gradients, radius, spacing } from '../theme';
import { UserRole } from '../types';

const labels: Record<UserRole, string> = {
  courier: 'Kurye Hesabı',
  security: 'Güvenlik Görevlisi',
  management: 'Site Yönetimi',
};

export function ProfileScreen({
  role,
  onSwitchRole,
}: {
  role: UserRole;
  onSwitchRole: () => void;
}) {
  const { courierProfile, resetDemo } = useDemo();
  const name =
    role === 'courier'
      ? courierProfile.name
      : role === 'security'
        ? 'Selim Kaya'
        : 'DraBorn Marina Yönetimi';

  const reset = () =>
    Alert.alert(
      'Demo verileri sıfırlansın mı?',
      'Eklenen talepler silinir ve örnek veriler geri yüklenir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: async () => {
            await resetDemo();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );

  const heroGradient =
    role === 'courier'
      ? gradients.courier
      : role === 'security'
        ? gradients.security
        : gradients.management;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <FadeInView>
        <LinearGradient colors={heroGradient} style={styles.hero}>
          <View style={styles.heroOrb} />
          <FloatingView style={styles.avatar} distance={6} duration={1750}>
            {role === 'courier' ? (
              <AnimatedMotorcycle color={colors.white} size={45} />
            ) : (
              <Ionicons
                name={role === 'security' ? 'shield' : 'business'}
                size={39}
                color={colors.white}
              />
            )}
          </FloatingView>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.role}>{labels[role]}</Text>
          <View style={styles.verified}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Text style={styles.verifiedText}>Demo hesap doğrulandı</Text>
          </View>
        </LinearGradient>
      </FadeInView>

      <FadeInView delay={90}>
        <SectionTitle title="Hesap bilgileri" />
        <Panel style={styles.info} gradient>
          <Info icon="person" label="Ad Soyad" value={name} />
          <Info
            icon="call"
            label="Telefon"
            value={role === 'courier' ? courierProfile.phone : '0555 700 01 07'}
          />
          <Info icon="id-card" label="Yetki" value={labels[role]} />
          {role === 'courier' ? (
            <Info icon="navigate" label="Motosiklet plakası" value={courierProfile.plate} />
          ) : null}
        </Panel>
      </FadeInView>

      <FadeInView delay={160}>
        <SectionTitle title="Uygulama ve demo" />
        <View style={styles.menu}>
          <Menu
            icon="swap-horizontal"
            title="Rol değiştir"
            detail="Kurye, güvenlik veya yönetim görünümüne geç"
            tone={colors.cyan}
            onPress={onSwitchRole}
          />
          <Menu
            icon="notifications"
            title="Bildirim tercihleri"
            detail="Geçiş ve onay uyarıları"
            tone={colors.orange}
          />
          <Menu
            icon="lock-closed"
            title="Gizlilik ve veri"
            detail="Tüm demo verileri yalnızca bu cihazda"
            tone={colors.green}
          />
          <Menu
            icon="refresh"
            title="Demo verilerini sıfırla"
            detail="Başlangıç örneklerini geri yükle"
            tone={colors.red}
            onPress={reset}
          />
        </View>
      </FadeInView>

      <FadeInView delay={230} style={styles.version}>
        <FloatingView style={styles.versionIcon}>
          <Ionicons name="shield-half" size={24} color={colors.cyan} />
        </FloatingView>
        <Text style={styles.versionName}>DraBornGate v0.1.0</Text>
        <Text style={styles.versionText}>CourierPass Demo • Supabase kullanılmıyor</Text>
      </FadeInView>
    </ScrollView>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <FloatingView style={styles.infoIcon} distance={2}>
        <Ionicons name={icon} size={20} color={colors.cyan} />
      </FloatingView>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Menu({
  icon,
  title,
  detail,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  tone: string;
  onPress?: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} disabled={!onPress}>
      <Panel style={[styles.menuRow, { borderColor: `${tone}3D` }]} gradient>
        <FloatingView style={[styles.menuIcon, { backgroundColor: `${tone}1B` }]}>
          <Ionicons name={icon} size={23} color={tone} />
        </FloatingView>
        <View style={styles.menuCopy}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuDetail}>{detail}</Text>
        </View>
        <Ionicons name="chevron-forward" size={21} color={colors.textMuted} />
      </Panel>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 22 },
  hero: {
    borderRadius: radius.xl,
    alignItems: 'center',
    padding: 27,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.22)',
    overflow: 'hidden',
  },
  heroOrb: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 210,
    right: -125,
    top: -120,
    borderWidth: 28,
    borderColor: 'rgba(255,255,255,.055)',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.white, fontSize: 25, fontWeight: '900', marginTop: 14 },
  role: {
    color: 'rgba(255,255,255,.85)',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 5,
  },
  verified: {
    height: 35,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    marginTop: 12,
    backgroundColor: 'rgba(6,16,29,.28)',
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  verifiedText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  info: { paddingVertical: 4 },
  infoRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: 'rgba(55,216,255,.11)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  infoValue: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 4 },
  menu: { gap: 10 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: { flex: 1 },
  menuTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  menuDetail: { color: colors.textSoft, fontSize: 13, lineHeight: 18, marginTop: 4 },
  version: { alignItems: 'center', paddingVertical: 12 },
  versionIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: 'rgba(55,216,255,.1)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionName: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 9 },
  versionText: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
