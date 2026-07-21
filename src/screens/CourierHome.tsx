import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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

const flowItems = [
  ['scan', 'Siparişi tara', 'Ekran görüntüsünden teslimat bilgileri hazırlanır.', colors.cyan],
  ['paper-plane', 'Talebi gönder', 'Güvenlik paneline anlık geçiş talebi düşer.', colors.purple],
  ['key', 'Kodu göster', 'Onay sonrası 6 haneli kapı kodunu kullan.', colors.green],
] as const;

export function CourierHome({
  onCreatePass,
  onOpenPasses,
}: {
  onCreatePass: () => void;
  onOpenPasses: () => void;
}) {
  const { courierProfile, passes, activities } = useDemo();
  const myPasses = passes.filter((pass) => pass.courierName === courierProfile.name);
  const activePass = myPasses.find((pass) =>
    ['waiting', 'approved', 'arrived'].includes(pass.status),
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <FadeInView style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>GÜNAYDIN, KURYE</Text>
          <Text style={styles.title}>{courierProfile.name.split(' ')[0]} 👋</Text>
        </View>
        <LiveBadge label="SAHADA" />
      </FadeInView>

      <FadeInView delay={80}>
        <LinearGradient
          colors={gradients.courier}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroOrb} />
          <View style={styles.heroTop}>
            <FloatingView distance={6} duration={1550} style={styles.heroIcon}>
              <AnimatedMotorcycle color={colors.white} size={42} />
            </FloatingView>
            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>DraBorn CourierPass</Text>
              <Text style={styles.heroTitle}>Kapıda bekleme yok.</Text>
              <Text style={styles.heroText}>
                Sipariş ekranını tara, siteye yaklaşırken geçiş onayını önceden hazırla.
              </Text>
            </View>
          </View>
          <AnimatedPressable onPress={onCreatePass}>
            <View style={styles.heroButton}>
              <Ionicons name="scan" size={22} color={colors.background} />
              <Text style={styles.heroButtonText}>YENİ GEÇİŞ TALEBİ</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.background} />
            </View>
          </AnimatedPressable>
        </LinearGradient>
      </FadeInView>

      <FadeInView delay={150} style={styles.metricsRow}>
        <MetricCard
          label="Bugün teslimat"
          value={String(courierProfile.completedToday)}
          icon="checkmark-done"
          tone={colors.green}
        />
        <MetricCard
          label="Kurye puanı"
          value={courierProfile.rating.toFixed(2)}
          icon="star"
          tone={colors.orange}
        />
        <MetricCard
          label="Aktif geçiş"
          value={activePass ? '1' : '0'}
          icon="key"
          tone={colors.cyan}
        />
      </FadeInView>

      <FadeInView delay={220}>
        <SectionTitle title="Aktif CourierPass" action="Tümünü gör" />
        {activePass ? (
          <PassCard pass={activePass} onPress={onOpenPasses} />
        ) : (
          <Panel style={styles.noPassCard} gradient>
            <FloatingView style={styles.noPassIcon}>
              <AnimatedMotorcycle color={colors.cyan} size={34} />
            </FloatingView>
            <View style={styles.noPassBody}>
              <Text style={styles.noPassTitle}>Aktif geçiş talebin yok</Text>
              <Text style={styles.noPassText}>
                Bir sonraki site teslimatın için hemen talep oluşturabilirsin.
              </Text>
            </View>
            <AnimatedPressable onPress={onCreatePass}>
              <LinearGradient colors={gradients.primary} style={styles.plusButton}>
                <Ionicons name="add" size={25} color={colors.white} />
              </LinearGradient>
            </AnimatedPressable>
          </Panel>
        )}
      </FadeInView>

      <FadeInView delay={300}>
        <SectionTitle title="Akıllı geçiş akışı" />
        <Panel style={styles.flowPanel} gradient>
          {flowItems.map(([icon, title, text, tone], index) => (
            <View key={title} style={styles.flowRow}>
              <View style={[styles.flowIndex, { borderColor: `${tone}55` }]}>
                <Text style={[styles.flowIndexText, { color: tone }]}>{index + 1}</Text>
              </View>
              <FloatingView
                distance={3}
                duration={1450 + index * 160}
                style={[styles.flowIcon, { backgroundColor: `${tone}18` }]}
              >
                <Ionicons name={icon} size={21} color={tone} />
              </FloatingView>
              <View style={styles.flowCopy}>
                <Text style={styles.flowTitle}>{title}</Text>
                <Text style={styles.flowText}>{text}</Text>
              </View>
            </View>
          ))}
        </Panel>
      </FadeInView>

      <FadeInView delay={360}>
        <SectionTitle title="Son hareketler" />
        <Panel gradient>
          {activities.slice(0, 3).map((activity, index) => {
            const tone = index === 0 ? colors.cyan : index === 1 ? colors.green : colors.purple;
            return (
              <View
                key={activity.id}
                style={[styles.activityRow, index !== 2 && styles.activityBorder]}
              >
                <FloatingView
                  distance={2}
                  duration={1550 + index * 120}
                  style={[styles.activityIcon, { backgroundColor: `${tone}16` }]}
                >
                  <Ionicons
                    name={activity.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={tone}
                  />
                </FloatingView>
                <View style={styles.activityCopy}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityDetail}>{activity.detail}</Text>
                </View>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            );
          })}
        </Panel>
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 112,
    gap: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
    marginTop: 4,
  },
  heroCard: {
    padding: 20,
    borderRadius: radius.xl,
    gap: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heroOrb: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 190,
    right: -105,
    top: -95,
    borderWidth: 25,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroTop: {
    flexDirection: 'row',
    gap: 15,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.17)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1 },
  heroKicker: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '900',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 3,
  },
  heroText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
    fontWeight: '600',
  },
  heroButton: {
    height: 56,
    borderRadius: 19,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  heroButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.35,
  },
  metricsRow: { flexDirection: 'row', gap: 9 },
  noPassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  noPassIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(55,216,255,0.14)',
  },
  noPassBody: { flex: 1 },
  noPassTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  noPassText: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    fontWeight: '600',
  },
  plusButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowPanel: { gap: 4 },
  flowRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  flowIndex: {
    width: 31,
    height: 31,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowIndexText: { fontSize: 13, fontWeight: '900' },
  flowIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowCopy: { flex: 1 },
  flowTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  flowText: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '600',
  },
  activityRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  activityBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCopy: { flex: 1 },
  activityTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  activityDetail: { color: colors.textSoft, fontSize: 13, marginTop: 4 },
  activityTime: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
});
