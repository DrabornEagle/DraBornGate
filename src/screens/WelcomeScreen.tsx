import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, gradients, radius, spacing } from '../theme';
import { UserRole } from '../types';
import { AnimatedPressable, FadeInView, PulseDot } from '../components/Motion';
import { AppBackground } from '../components/UI';

const roleCards: Array<{
  role: UserRole;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  badge: string;
}> = [
  {
    role: 'courier',
    title: 'Kurye Girişi',
    description: 'Sipariş ekranını tara, geçiş talebini oluştur ve kapı kodunu al.',
    icon: 'bicycle',
    tone: colors.cyan,
    badge: 'CourierPass',
  },
  {
    role: 'security',
    title: 'Güvenlik Paneli',
    description: 'Yaklaşan kuryeleri canlı sırada gör, doğrula ve geçişi yönet.',
    icon: 'shield-checkmark',
    tone: colors.green,
    badge: 'Gate Control',
  },
  {
    role: 'management',
    title: 'Site Yönetimi',
    description: 'Kapı yoğunluğu, teslimat performansı ve site kurallarını izle.',
    icon: 'business',
    tone: colors.purple,
    badge: 'Control Center',
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
          <LinearGradient colors={gradients.primary} style={styles.logoShell}>
            <View style={styles.logoInner}>
              <Ionicons name="shield-half" size={48} color={colors.text} />
              <View style={styles.gateLine} />
            </View>
          </LinearGradient>
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
                <View style={styles.roleCard}>
                  <View style={[styles.roleIcon, { backgroundColor: `${item.tone}1A` }]}>
                    <Ionicons name={item.icon} size={28} color={item.tone} />
                  </View>
                  <View style={styles.roleBody}>
                    <View style={styles.roleTitleRow}>
                      <Text style={styles.roleTitle}>{item.title}</Text>
                      <Text style={[styles.roleBadge, { color: item.tone }]}>{item.badge}</Text>
                    </View>
                    <Text style={styles.roleDescription}>{item.description}</Text>
                  </View>
                  <View style={styles.chevron}>
                    <Ionicons name="arrow-forward" size={18} color={colors.text} />
                  </View>
                </View>
              </AnimatedPressable>
            </FadeInView>
          ))}
        </View>

        <FadeInView delay={520} style={styles.footer}>
          <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
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
    paddingTop: 22,
    paddingBottom: 18,
    justifyContent: 'center',
  },
  topBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(67,231,162,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(67,231,162,0.2)',
    marginBottom: 22,
  },
  topBadgeText: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoShell: {
    width: 94,
    height: 94,
    borderRadius: 30,
    padding: 2,
    transform: [{ rotate: '2deg' }],
  },
  logoInner: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateLine: {
    position: 'absolute',
    bottom: 19,
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.cyan,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginTop: 16,
  },
  version: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: 4,
  },
  subtitle: {
    color: colors.textSoft,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 330,
    marginTop: 12,
  },
  roles: {
    gap: 11,
  },
  roleCard: {
    minHeight: 94,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(13,32,51,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    gap: 12,
  },
  roleIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
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
    fontSize: 16,
    fontWeight: '800',
  },
  roleBadge: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  roleDescription: {
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  chevron: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 22,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});
