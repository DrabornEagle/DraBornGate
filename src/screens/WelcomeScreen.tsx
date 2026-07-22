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

const cards: Array<{ role: UserRole; title: string; text: string; icon: keyof typeof Ionicons.glyphMap; tone: string; gradient: readonly [string, string, string] }> = [
  { role: 'courier', title: 'Kurye Girişi', text: 'OCR, CourierPass ve AirPass ile geçiş talebini yönet.', icon: 'navigate', tone: colors.cyan, gradient: ['rgba(13,83,121,.98)', 'rgba(43,48,112,.98)', 'rgba(16,32,55,.98)'] },
  { role: 'security', title: 'Güvenlik Paneli', text: 'Kurye ve misafir kodlarını kapı bazında doğrula.', icon: 'shield-checkmark', tone: colors.green, gradient: ['rgba(18,91,76,.98)', 'rgba(20,67,77,.98)', 'rgba(16,32,55,.98)'] },
  { role: 'resident', title: 'Site Sakini', text: 'Kuryelerini gör, VisitorPass oluştur ve aidatlarını takip et.', icon: 'home', tone: colors.orange, gradient: ['rgba(112,70,27,.98)', 'rgba(79,53,45,.98)', 'rgba(16,32,55,.98)'] },
  { role: 'management', title: 'Site Yönetimi', text: 'Kurallar, aidat, gelir-gider ve günlük geçişleri yönet.', icon: 'business', tone: colors.magenta, gradient: ['rgba(92,54,133,.98)', 'rgba(72,43,99,.98)', 'rgba(16,32,55,.98)'] },
];

export function WelcomeScreen({ onSelectRole }: { onSelectRole: (role: UserRole) => void }) {
  return <AppBackground><ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}><FadeInView style={s.badge}><PulseDot color={colors.green} /><Text style={s.badgeText}>SUPABASE OTURUMU AÇIK</Text></FadeInView><FadeInView delay={60} style={s.hero}><LinearGradient colors={gradients.courier} style={s.logo}><RacingMotorcycle color={colors.cyan} accentColor={colors.white} size={90} /></LinearGradient><Text style={s.title}>Rolünü seç</Text><Text style={s.version}>DraBornGate v{APP_VERSION}</Text><Text style={s.sub}>Görünüm seçimi uygulamaya aittir; gerçek işlem yetkileri site üyeliği ve RLS üzerinden doğrulanır.</Text></FadeInView><View style={s.cards}>{cards.map((x, i) => <FadeInView key={x.role} delay={130 + i * 60}><AnimatedPressable onPress={() => onSelectRole(x.role)}><LinearGradient colors={x.gradient} style={[s.card, { borderColor: `${x.tone}70` }]}><View style={[s.icon, { backgroundColor: `${x.tone}20` }]}>{x.role === 'courier' ? <RacingMotorcycle color={x.tone} size={56} /> : <Ionicons name={x.icon} size={30} color={x.tone} />}</View><View style={s.copy}><Text style={s.cardTitle}>{x.title}</Text><Text style={s.cardText}>{x.text}</Text></View><Ionicons name="arrow-forward" size={21} color={x.tone} /></LinearGradient></AnimatedPressable></FadeInView>)}</View></ScrollView></AppBackground>;
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingVertical: 30, gap: 18 },
  badge: { alignSelf: 'center', height: 36, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(67,231,162,.35)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeText: { color: colors.green, fontSize: 10, fontWeight: '900' }, hero: { alignItems: 'center' },
  logo: { width: 112, height: 98, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 33, fontWeight: '900', marginTop: 14 }, version: { color: colors.cyan, fontSize: 12, fontWeight: '900', marginTop: 4 },
  sub: { color: colors.textSoft, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 }, cards: { gap: 10 },
  card: { minHeight: 88, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 11 },
  icon: { width: 58, height: 56, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, cardText: { color: colors.textSoft, fontSize: 12, lineHeight: 17, marginTop: 4 },
});
