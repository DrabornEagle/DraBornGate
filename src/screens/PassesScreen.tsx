import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AnimatedMotorcycle,
  AnimatedPressable,
  FadeInView,
  FloatingView,
} from '../components/Motion';
import { PassCard } from '../components/PassCard';
import { EmptyState, Panel } from '../components/UI';
import { useDemo } from '../store/DemoContext';
import { colors, gradients, radius, spacing } from '../theme';
import { PassStatus, UserRole } from '../types';

type Filter = 'all' | PassStatus;
const filterLabels: Array<[Filter, string]> = [
  ['all', 'Tümü'],
  ['waiting', 'Bekleyen'],
  ['approved', 'Onaylı'],
  ['completed', 'Biten'],
  ['rejected', 'Red'],
];

export function PassesScreen({ role }: { role: UserRole }) {
  const { passes, courierProfile } = useDemo();
  const [filter, setFilter] = useState<Filter>('all');
  if (role === 'management') return <Rules />;

  const rolePasses =
    role === 'courier'
      ? passes.filter((pass) => pass.courierName === courierProfile.name)
      : passes;
  const visible = rolePasses.filter(
    (pass) => filter === 'all' || pass.status === filter,
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <FadeInView style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            {role === 'courier' ? 'COURIERPASS MERKEZİ' : 'GÜVENLİK KUYRUĞU'}
          </Text>
          <Text style={styles.title}>
            {role === 'courier' ? 'Geçişlerim' : 'Tüm geçişler'}
          </Text>
          <Text style={styles.subtitle}>{rolePasses.length} demo kayıt • cihazda saklanıyor</Text>
        </View>
        <FloatingView style={styles.headerIcon}>
          {role === 'courier' ? (
            <AnimatedMotorcycle color={colors.cyan} size={33} />
          ) : (
            <Ionicons name="shield-checkmark" size={29} color={colors.green} />
          )}
        </FloatingView>
      </FadeInView>

      <FadeInView delay={80}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {filterLabels.map(([value, label]) => {
            const active = filter === value;
            return (
              <AnimatedPressable key={value} onPress={() => setFilter(value)}>
                <LinearGradient
                  colors={
                    active
                      ? ['rgba(29,119,159,.9)', 'rgba(92,66,177,.9)']
                      : ['rgba(13,32,51,.96)', 'rgba(13,32,51,.96)']
                  }
                  style={[styles.filter, active && styles.filterActive]}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {label}
                  </Text>
                  <View style={[styles.count, active && styles.countActive]}>
                    <Text style={styles.countText}>
                      {value === 'all'
                        ? rolePasses.length
                        : rolePasses.filter((pass) => pass.status === value).length}
                    </Text>
                  </View>
                </LinearGradient>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </FadeInView>

      <View style={styles.list}>
        {visible.length ? (
          visible.map((pass, index) => (
            <FadeInView key={pass.id} delay={120 + index * 45}>
              <PassCard pass={pass} />
            </FadeInView>
          ))
        ) : (
          <EmptyState
            icon="file-tray-outline"
            title="Kayıt bulunamadı"
            description="Bu filtrede gösterilecek CourierPass bulunmuyor."
          />
        )}
      </View>
    </ScrollView>
  );
}

function Rules() {
  const rules: Array<[
    keyof typeof Ionicons.glyphMap,
    string,
    string,
    string,
  ]> = [
    ['navigate', 'Kurye giriş saatleri', '07:00–23:30 arasında ana kapıdan giriş', colors.cyan],
    ['camera', 'Sipariş doğrulama', 'Sipariş numarası veya ekran görüntüsü zorunlu', colors.orange],
    ['key', 'Geçiş kodu', 'Onay kodu tek teslimat için geçerlidir', colors.green],
    ['time', 'Maksimum içeride kalma', 'Teslimat için önerilen süre 15 dakika', colors.purple],
    ['shield', 'Şüpheli durum', 'Güvenlik görevlisi talebi reddedebilir', colors.red],
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <FadeInView style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>YÖNETİM POLİTİKALARI</Text>
          <Text style={styles.title}>Geçiş kuralları</Text>
          <Text style={styles.subtitle}>DraBorn Marina Evleri • v0.1 demo</Text>
        </View>
        <FloatingView style={styles.headerIcon}>
          <Ionicons name="document-lock" size={29} color={colors.purple} />
        </FloatingView>
      </FadeInView>

      <FadeInView delay={80}>
        <Panel style={styles.rulePanel} gradient>
          {rules.map(([icon, title, text, tone], index) => (
            <View
              key={title}
              style={[styles.rule, index < rules.length - 1 && styles.ruleBorder]}
            >
              <View style={[styles.ruleNumber, { borderColor: `${tone}45` }]}>
                <Text style={[styles.ruleNumberText, { color: tone }]}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
              </View>
              <FloatingView
                style={[styles.ruleIcon, { backgroundColor: `${tone}16` }]}
                duration={1450 + index * 120}
              >
                <Ionicons name={icon} size={22} color={tone} />
              </FloatingView>
              <View style={styles.ruleCopy}>
                <Text style={styles.ruleTitle}>{title}</Text>
                <Text style={styles.ruleText}>{text}</Text>
              </View>
            </View>
          ))}
        </Panel>
      </FadeInView>

      <FadeInView delay={160}>
        <Panel style={styles.notice} gradient>
          <Ionicons name="information-circle" size={25} color={colors.cyan} />
          <Text style={styles.noticeText}>
            Bu sürümde kurallar demo olarak sabittir. Supabase entegrasyonunda site
            yönetimi bunları düzenleyebilir.
          </Text>
        </Panel>
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.cyan, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.textSoft, fontSize: 13, marginTop: 4, fontWeight: '600' },
  headerIcon: {
    width: 55,
    height: 55,
    borderRadius: 19,
    backgroundColor: 'rgba(55,216,255,.11)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { gap: 9, paddingRight: 15 },
  filter: {
    height: 45,
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterActive: { borderColor: colors.borderStrong },
  filterText: { color: colors.textSoft, fontSize: 13, fontWeight: '800' },
  filterTextActive: { color: colors.white },
  count: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countActive: { backgroundColor: 'rgba(255,255,255,.18)' },
  countText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  list: { gap: 14 },
  rulePanel: { paddingVertical: 4 },
  rule: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 11 },
  ruleBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  ruleNumber: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,.045)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleNumberText: { fontSize: 11, fontWeight: '900' },
  ruleIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleCopy: { flex: 1 },
  ruleTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  ruleText: { color: colors.textSoft, fontSize: 13, lineHeight: 18, marginTop: 5 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderColor: 'rgba(55,216,255,.32)',
  },
  noticeText: { flex: 1, color: colors.textSoft, fontSize: 13, lineHeight: 19 },
});
