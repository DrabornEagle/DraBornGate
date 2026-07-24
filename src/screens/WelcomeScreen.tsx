import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, FadeInView, PulseDot } from '../components/Motion';
import { RacingMotorcycle } from '../components/RacingMotorcycle';
import { AppBackground } from '../components/UI';
import { APP_VERSION } from '../config/version';
import { colors, gradients, radius, spacing } from '../theme';
import { UserRole } from '../types';

const cards: Array<{
  role: UserRole;
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  gradient: readonly [string, string, string];
}> = [
  {
    role: 'courier',
    title: 'Kurye Girişi',
    text: 'Görsel okuma, kurye geçişi ve akıllı geçiş taleplerini yönet.',
    icon: 'navigate',
    tone: colors.cyan,
    gradient: ['rgba(13,83,121,.98)', 'rgba(43,48,112,.98)', 'rgba(16,32,55,.98)'],
  },
  {
    role: 'security',
    title: 'Güvenlik Paneli',
    text: 'Kurye ve misafir geçiş kodlarını kapı bazında doğrula.',
    icon: 'shield-checkmark',
    tone: colors.green,
    gradient: ['rgba(18,91,76,.98)', 'rgba(20,67,77,.98)', 'rgba(16,32,55,.98)'],
  },
  {
    role: 'resident',
    title: 'Site Sakini',
    text: 'Kuryelerini gör, misafir geçişi oluştur ve aidatlarını takip et.',
    icon: 'home',
    tone: colors.orange,
    gradient: ['rgba(112,70,27,.98)', 'rgba(79,53,45,.98)', 'rgba(16,32,55,.98)'],
  },
  {
    role: 'management',
    title: 'Site Yönetimi',
    text: 'Kurallar, aidat, gelir-gider ve günlük geçişleri yönet.',
    icon: 'business',
    tone: colors.magenta,
    gradient: ['rgba(92,54,133,.98)', 'rgba(72,43,99,.98)', 'rgba(16,32,55,.98)'],
  },
];

export function WelcomeScreen({ onSelectRole }: { onSelectRole: (role: UserRole) => void }) {
  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <FadeInView style={styles.badge}>
          <PulseDot color={colors.green} />
          <Text style={styles.badgeText}>ORTAK HESAP OTURUMU AÇIK</Text>
        </FadeInView>
        <FadeInView delay={60} style={styles.hero}>
          <LinearGradient colors={gradients.courier} style={styles.logo}>
            <RacingMotorcycle color={colors.cyan} accentColor={colors.white} size={90} />
          </LinearGradient>
          <Text style={styles.title}>Rolünü seç</Text>
          <Text style={styles.version}>DraBornGate v{APP_VERSION}</Text>
          <Text style={styles.sub}>Bu yönetim aracı yalnızca Admin hesabında görünür. Gerçek işlem yetkileri site üyeliği ve veritabanı güvenlik kurallarıyla doğrulanır.</Text>
        </FadeInView>
        <View style={styles.cards}>
          {cards.map((item, index) => (
            <FadeInView key={item.role} delay={130 + index * 60}>
              <AnimatedPressable onPress={() => onSelectRole(item.role)}>
                <LinearGradient colors={item.gradient} style={[styles.card, { borderColor: `${item.tone}70` }]}>
                  <View style={[styles.icon, { backgroundColor: `${item.tone}20` }]}>
                    {item.role === 'courier'
                      ? <RacingMotorcycle color={item.tone} size={56} />
                      : <Ionicons name={item.icon} size={30} color={item.tone} />}
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardText}>{item.text}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={21} color={item.tone} />
                </LinearGradient>
              </AnimatedPressable>
            </FadeInView>
          ))}
        </View>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingVertical: 30, gap: 18 },
  badge: { alignSelf: 'center', minHeight: 38, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(67,231,162,.35)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeText: { color: colors.green, fontSize: 11, fontWeight: '900' },
  hero: { alignItems: 'center' },
  logo: { width: 112, height: 98, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 14 },
  version: { color: colors.cyan, fontSize: 13, fontWeight: '900', marginTop: 4 },
  sub: { color: colors.textSoft, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  cards: { gap: 10 },
  card: { minHeight: 92, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 13, gap: 11 },
  icon: { width: 58, height: 56, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  cardText: { color: colors.textSoft, fontSize: 13, lineHeight: 18, marginTop: 4 },
});
