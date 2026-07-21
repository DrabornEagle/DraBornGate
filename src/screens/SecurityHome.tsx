import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AnimatedMotorcycle,
  AnimatedPressable,
  FadeInView,
  FloatingView,
} from '../components/Motion';
import { PassCard } from '../components/PassCard';
import { LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';
import { useDemo } from '../store/DemoContext';
import { colors, gradients, radius, spacing } from '../theme';
import { CourierPass } from '../types';

type Filter = 'waiting' | 'approved' | 'all';

export function SecurityHome() {
  const { passes, updatePassStatus } = useDemo();
  const [filter, setFilter] = useState<Filter>('waiting');
  const visible = passes.filter((pass) =>
    filter === 'all'
      ? !['completed', 'rejected'].includes(pass.status)
      : pass.status === filter,
  );
  const waiting = passes.filter((pass) => pass.status === 'waiting').length;
  const approved = passes.filter((pass) => pass.status === 'approved').length;

  const approve = (pass: CourierPass) => {
    updatePassStatus(pass.id, 'approved');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const reject = (pass: CourierPass) =>
    Alert.alert('Talebi reddet', `${pass.courierName} için geçiş reddedilsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet',
        style: 'destructive',
        onPress: () =>
          updatePassStatus(pass.id, 'rejected', 'Güvenlik doğrulaması başarısız'),
      },
    ]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <FadeInView style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>GÜVENLİK OPERASYONU</Text>
          <Text style={styles.title}>DraBorn Marina</Text>
          <Text style={styles.subtitle}>A Kapısı • Selim Kaya vardiyada</Text>
        </View>
        <LiveBadge />
      </FadeInView>

      <FadeInView delay={70}>
        <LinearGradient
          colors={gradients.security}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <FloatingView style={styles.heroIcon} distance={5} duration={1600}>
            <Ionicons name="shield-checkmark" size={36} color={colors.white} />
          </FloatingView>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>KAPI GÜVENLİK SKORU</Text>
            <Text style={styles.heroValue}>%98.4</Text>
            <Text style={styles.heroText}>Tüm sistemler aktif • Ortalama onay 18 saniye</Text>
          </View>
          <View style={styles.motorShell}>
            <AnimatedMotorcycle color={colors.white} size={38} />
          </View>
        </LinearGradient>
      </FadeInView>

      <FadeInView delay={130} style={styles.metrics}>
        <MetricCard label="Bekleyen" value={String(waiting)} icon="time" tone={colors.orange} />
        <MetricCard label="Onaylı" value={String(approved)} icon="checkmark-circle" tone={colors.green} />
        <MetricCard label="Bugün" value="18" icon="speedometer" tone={colors.cyan} />
      </FadeInView>

      <FadeInView delay={190}>
        <SectionTitle title="Canlı kurye kuyruğu" action={`${visible.length} kayıt`} />
        <View style={styles.filters}>
          {(['waiting', 'approved', 'all'] as Filter[]).map((item) => (
            <AnimatedPressable
              key={item}
              containerStyle={styles.filterWrap}
              onPress={() => setFilter(item)}
            >
              <LinearGradient
                colors={
                  filter === item
                    ? ['rgba(27,116,151,.85)', 'rgba(81,65,168,.85)']
                    : ['rgba(13,32,51,.96)', 'rgba(13,32,51,.96)']
                }
                style={[styles.filter, filter === item && styles.filterActive]}
              >
                <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
                  {item === 'waiting' ? 'Bekleyen' : item === 'approved' ? 'Onaylı' : 'Tümü'}
                </Text>
              </LinearGradient>
            </AnimatedPressable>
          ))}
        </View>

        <View style={styles.list}>
          {visible.length ? (
            visible.map((pass) => (
              <View key={pass.id} style={styles.passWrap}>
                <PassCard pass={pass} />
                {pass.status === 'waiting' ? (
                  <View style={styles.actions}>
                    <AnimatedPressable
                      containerStyle={styles.actionWrap}
                      onPress={() => reject(pass)}
                    >
                      <View style={styles.reject}>
                        <Ionicons name="close" size={20} color={colors.red} />
                        <Text style={styles.rejectText}>Reddet</Text>
                      </View>
                    </AnimatedPressable>
                    <AnimatedPressable
                      containerStyle={styles.actionWrap}
                      onPress={() => approve(pass)}
                    >
                      <LinearGradient colors={gradients.success} style={styles.approve}>
                        <Ionicons
                          name="shield-checkmark"
                          size={20}
                          color={colors.background}
                        />
                        <Text style={styles.approveText}>Onayla ve Kod Üret</Text>
                      </LinearGradient>
                    </AnimatedPressable>
                  </View>
                ) : pass.status === 'approved' ? (
                  <AnimatedPressable
                    onPress={() => updatePassStatus(pass.id, 'completed')}
                  >
                    <LinearGradient
                      colors={['rgba(139,107,255,.22)', 'rgba(55,216,255,.12)']}
                      style={styles.complete}
                    >
                      <Ionicons name="checkmark-done" size={21} color={colors.purple} />
                      <Text style={styles.completeText}>Girişi tamamla</Text>
                    </LinearGradient>
                  </AnimatedPressable>
                ) : null}
              </View>
            ))
          ) : (
            <Panel style={styles.empty} gradient>
              <FloatingView>
                <Ionicons name="shield-checkmark" size={38} color={colors.green} />
              </FloatingView>
              <Text style={styles.emptyTitle}>Kuyruk temiz</Text>
              <Text style={styles.emptyText}>Bu filtrede bekleyen kurye bulunmuyor.</Text>
            </Panel>
          )}
        </View>
      </FadeInView>

      <FadeInView delay={260}>
        <SectionTitle title="Hızlı işlemler" />
        <View style={styles.quickRow}>
          <Quick icon="megaphone" label="Kapı duyurusu" tone={colors.orange} />
          <Quick icon="qr-code" label="Kod doğrula" tone={colors.cyan} />
          <Quick icon="warning" label="Olay bildir" tone={colors.red} />
        </View>
      </FadeInView>
    </ScrollView>
  );
}

function Quick({
  icon,
  label,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: string;
}) {
  return (
    <Panel style={[styles.quick, { borderColor: `${tone}45` }]} gradient>
      <FloatingView style={[styles.quickIcon, { backgroundColor: `${tone}20` }]}>
        <Ionicons name={icon} size={23} color={tone} />
      </FloatingView>
      <Text style={styles.quickText}>{label}</Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.green, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.textSoft, fontSize: 13, marginTop: 4, fontWeight: '600' },
  hero: {
    borderRadius: radius.xl,
    padding: 19,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.22)',
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1 },
  heroLabel: { color: 'rgba(255,255,255,.8)', fontSize: 11, fontWeight: '900' },
  heroValue: { color: colors.white, fontSize: 31, fontWeight: '900', marginTop: 3 },
  heroText: { color: 'rgba(255,255,255,.86)', fontSize: 12, lineHeight: 17, marginTop: 4 },
  motorShell: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: { flexDirection: 'row', gap: 9 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterWrap: { flex: 1 },
  filter: {
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActive: { borderColor: colors.borderStrong },
  filterText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  filterTextActive: { color: colors.white },
  list: { gap: 15 },
  passWrap: { gap: 9 },
  actions: { flexDirection: 'row', gap: 9 },
  actionWrap: { flex: 1 },
  reject: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,101,125,.45)',
    backgroundColor: 'rgba(255,101,125,.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rejectText: { color: colors.red, fontSize: 13, fontWeight: '900' },
  approve: {
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  approveText: { color: colors.background, fontSize: 13, fontWeight: '900' },
  complete: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,107,255,.42)',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeText: { color: colors.purple, fontSize: 13, fontWeight: '900' },
  empty: { alignItems: 'center', paddingVertical: 31 },
  emptyTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 10 },
  emptyText: { color: colors.textSoft, fontSize: 14, marginTop: 5 },
  quickRow: { flexDirection: 'row', gap: 9 },
  quick: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 9,
  },
});
