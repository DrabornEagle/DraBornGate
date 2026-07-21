import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, FadeInView, PulseDot } from '../components/Motion';
import { PassCard } from '../components/PassCard';
import { LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';
import { useDemo } from '../store/DemoContext';
import { colors, gradients, radius, spacing } from '../theme';

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
        <LinearGradient colors={gradients.primary} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="shield-checkmark" size={29} color={colors.white} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>DraBorn CourierPass</Text>
              <Text style={styles.heroTitle}>Kapıda bekleme yok.</Text>
              <Text style={styles.heroText}>
                Sipariş ekranını tara, siteye yaklaşırken geçiş onayını hazırla.
              </Text>
            </View>
          </View>
          <AnimatedPressable onPress={onCreatePass}>
            <View style={styles.heroButton}>
              <Ionicons name="scan" size={20} color={colors.background} />
              <Text style={styles.heroButtonText}>YENİ GEÇİŞ TALEBİ</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.background} />
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
          <Panel style={styles.noPassCard}>
            <View style={styles.noPassIcon}>
              <Ionicons name="shield-outline" size={29} color={colors.cyan} />
            </View>
            <View style={styles.noPassBody}>
              <Text style={styles.noPassTitle}>Aktif geçiş talebin yok</Text>
              <Text style={styles.noPassText}>
                Bir sonraki site teslimatın için talep oluşturabilirsin.
              </Text>
            </View>
            <AnimatedPressable onPress={onCreatePass}>
              <View style={styles.plusButton}>
                <Ionicons name="add" size={22} color={colors.background} />
              </View>
            </AnimatedPressable>
          </Panel>
        )}
      </FadeInView>

      <FadeInView delay={300}>
        <SectionTitle title="Akıllı geçiş akışı" />
        <Panel style={styles.flowPanel}>
          {[
            ['scan', 'Siparişi tara', 'Ekran görüntüsünden teslimat bilgileri hazırlanır.'],
            ['paper-plane', 'Talebi gönder', 'Güvenlik paneline anlık geçiş talebi düşer.'],
            ['key', 'Kodu göster', 'Onay sonrası 6 haneli kapı kodunu kullan/'],
          ].map(([icon, title, text], index) => (
            <View key={title} style={styles.flowRow}>
              <View style={styles.flowIndex}>
                <Text style={styles.flowIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.flowIcon}>
                <Ionicons
                  name={icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={colors.cyan}
                />
              </View>
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
        <Panel>
          {activities.slice(0, 3).map((activity, index) => (
            <View
              key={activity.id}
              style={[styles.activityRow, index !== 2 && styles.activityBorder]}
            >
              <View style={styles.activityIcon}>
                <Ionicons
                  name={activity.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={colors.cyan}
                />
              </View>
              <View style={styles.activityCopy}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDetail}>{activity.detail}</Text>
              </View>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          ))}
        </Panel>
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 110,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.7,
    marginTop: 3,
  },
  heroCard: {
    padding: 18,
    borderRadius: radius.xl,
    gap: 18,
  },
  heroTop: {
    flexDirection: 'row',
    gap: 13,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
  },
  heroKicker: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 10,
    fontWeight: '800',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  heroText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  heroButton: {
    height: 50,
    borderRadius: 17,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  heroButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  noPassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noPassIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(55,216,255,0.1)',
  },
  noPassBody: {
    flex: 1,
  },
  noPassTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  noPassText: {
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  plusButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowPanel: {
    gap: 2,
  },
  flowRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flowIndex: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowIndexText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  flowIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(55,216,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowCopy: {
    flex: 1,
  },
  flowTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  flowText: {
    color: colors.textSoft,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  activityRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: 'rgba(55,216,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCopy: {
    flex: 1,
  },
  activityTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  activityDetail: {
    color: colors.textSoft,
    fontSize: 10,
    marginTop: 3,
  },
  activityTime: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
});
