import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AnimatedMotorcycle,
  AnimatedPressable,
  FadeInView,
  FloatingView,
  PulseDot,
} from '../components/Motion';
import { AppBackground } from '../components/UI';
import { colors, gradients, radius, spacing } from '../theme';
import { UserRole } from '../types';

const roleCards: Array<{
  role: UserRole;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  badge: string;
  gradient: readonly [string, string, string];
}> = [
  {
    role: 'courier',
    title: 'Kurye Girişi',
    description: 'Sipariş ekranını tara, geçiş talebini oluştur ve kapı kodunu al.',
    icon: 'navigate',
    tone: colors.cyan,
    badge: 'CourierPass',
    gradient: ['rgba(13,83,121,.98)', 'rgba(43,48,112,.98)', 'rgba(16,32,55,.98)'],
  },
  {
    role: 'security',
    title: 'Güvenlik Paneli',
    description: 'Yaklaşan kuryeleri canlı sırada gör, doğrula ve geçişi yönet.',
    icon: 'shield-checkmark',
    tone: colors.green,
    badge: 'Gate Control',
    gradient: ['rgba(18,91,76,.98)', 'rgba(20,67,77,.98)', 'rgba(16,32,55,.98)'],
  },
  {
    role: 'management',
    title: 'Site Yönetimi',
    description: 'Kapı yoğunluğu, teslimat performansı ve site kurallarını izle.',
    icon: 'business',
    tone: colors.magenta,
    badge: 'Control Center',
    gradient: ['rgba(92,54,133,.98)', 'rgba(72,43,99,.98)', 'rgba(16,32,55,.98)'],
  },
];

export function WelcomeScreen({ onSelectRole }: { onSelectRole: (role: UserRole) => void }) {
  return (
    <AppBackground>
      <View style={styles.container}>
        <FadeInView style={styles.topBadge}>
          <PulseDot color={colors.green} />
          <Text style={styles.topBadgeText}>DEMO SİSTEM AKTİF</Text>
        </FadeInView>

        <FadeInView delay={80} style={styles.hero}>
          <FloatingView distance={7} duration={1900}>
            <LinearGradient colors={gradients.primary} style={styles.logoShell}>
              <View style={styles.logoInner}>
                <Ionicons name="shield-half" size={51} color={colors.text} />
                <View style={styles.gateLine} />
              </View>
            </LinearGradient>
          </FloatingView>
          <Text style={styles.title}>DraBornGate</Text>
          <Text style={styles.version}>KURYE × GÜVENLİK • v0.1</Text>
          <Text style={styles.subtitle}>
            Sitelerde kurye geçişini hızlı, kontrollü ve güvenli hale getiren akıllı demo.
          </Text>
        </FadeInView>

        <View style={styles.roles}>
          {roleCards.map((item, index) => (
            <FadeInView key={item.role} delay={180 + index * 90}>
              <AnimatedPressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onSelectRole(item.role);
                }}
              >
                <LinearGradient
                  colors={item.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.roleCard, { borderColor: `${item.tone}70` }]}
                >
                  <View style={[styles.roleRail, { backgroundColor: item.tone }]} />
                  <View
                    style={[
                      styles.roleIcon,
                      {
                        backgroundColor: `${item.tone}20`,
                        borderColor: `${item.tone}55`,
                      },
                    ]}
                  >
                    {item.role === 'courier' ? (
                      <AnimatedMotorcycle color={item.tone} size={34} />
                    ) : (
                      <FloatingView distance={3} duration={1550 + index * 120}>
                        <Ionicons name={item.icon} size={31} color={item.tone} />
                      </FloatingView>
                    )}
                  </View>
                  <View style={styles.roleBody}>
                    <View style={styles.roleTitleRow}>
                      <Text style={styles.roleTitle}>{item.title}</Text>
                      <Text style={[styles.roleBadge, { color: item.tone }]}>{item.badge}</Text>
                    </View>
                    <Text style={styles.roleDescription}>{item.description}</Text>
                  </View>
                  <View style={[styles.chevron, { borderColor: `${item.tone}45` }]}>
                    <Ionicons name="arrow-forward" size={20} color={item.tone} />
                  </View>
                </LinearGradient>
              </AnimatedPressable>
            </FadeInView>
          ))}
        </View>

        <FadeInView delay={520} style={styles.footer}>
          <Ionicons name="lock-closed" size={15} color={colors.textMuted} />
          <Text style={styles.footerText}>Veritabanı yok • Veriler yalnızca bu cihazda</Text>
        </FadeInView>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
    paddingBottom: 18,
    justifyContent: 'center',
  },
  topBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(67,231,162,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(67,231,162,0.34)',
    marginBottom: 20,
  },
  topBadgeText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoShell: {
    width: 98,
    height: 98,
    borderRadius: 31,
    padding: 2,
    transform: [{ rotate: '2deg' }],
  },
  logoInner: {
    flex: 1,
    borderRadius: 29,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateLine: {
    position: 'absolute',
    bottom: 19,
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cyan,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginTop: 15,
  },
  version: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 5,
  },
  subtitle: {
    color: colors.textSoft,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 345,
    marginTop: 11,
    fontWeight: '600',
  },
  roles: {
    gap: 12,
  },
  roleCard: {
    minHeight: 104,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 13,
    overflow: 'hidden',
  },
  roleRail: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  roleIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBody: {
    flex: 1,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roleTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  roleDescription: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    fontWeight: '600',
  },
  chevron: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
