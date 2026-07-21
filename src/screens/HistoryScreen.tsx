import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FadeInView, FloatingView, PulseDot } from '../components/Motion';
import { RacingMotorcycle } from '../components/RacingMotorcycle';
import { Panel } from '../components/UI';
import { useDemo } from '../store/DemoContext';
import { colors, spacing } from '../theme';
import { UserRole } from '../types';

const toneMap = {
  cyan: colors.cyan,
  purple: colors.purple,
  green: colors.green,
  orange: colors.orange,
  red: colors.red,
};

export function HistoryScreen({ role }: { role: UserRole }) {
  const { activities } = useDemo();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <FadeInView style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>DENETİM KAYITLARI</Text>
          <Text style={styles.title}>
            {role === 'courier' ? 'Hareketlerim' : 'Geçiş geçmişi'}
          </Text>
          <Text style={styles.subtitle}>
            Yerel demo zaman çizelgesi • {activities.length} hareket
          </Text>
        </View>
        <FloatingView style={styles.icon}>
          <Ionicons name="time" size={29} color={colors.cyan} />
        </FloatingView>
      </FadeInView>

      <FadeInView delay={80}>
        <Panel style={styles.summary} gradient>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activities.length}</Text>
            <Text style={styles.summaryLabel}>Toplam hareket</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.green }]}>%98</Text>
            <Text style={styles.summaryLabel}>Başarılı geçiş</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.orange }]}>18 sn</Text>
            <Text style={styles.summaryLabel}>Ortalama onay</Text>
          </View>
        </Panel>
      </FadeInView>

      <View style={styles.timeline}>
        {activities.map((activity, index) => {
          const tone = toneMap[activity.tone];
          const isMotorcycleActivity =
            activity.icon === 'speedometer' ||
            activity.icon === 'bicycle' ||
            activity.title.toLocaleLowerCase('tr-TR').includes('motosiklet');

          return (
            <FadeInView key={activity.id} delay={120 + index * 35} style={styles.item}>
              <View style={styles.rail}>
                {index < activities.length - 1 ? <View style={styles.line} /> : null}
                <View style={[styles.dot, { borderColor: tone }]}>
                  <PulseDot color={tone} size={7} />
                </View>
              </View>
              <Panel style={[styles.card, { borderColor: `${tone}42` }]} gradient>
                <FloatingView
                  style={[
                    styles.activityIcon,
                    isMotorcycleActivity && styles.motorcycleIcon,
                    { backgroundColor: `${tone}1B` },
                  ]}
                  duration={1450 + index * 110}
                >
                  {isMotorcycleActivity ? (
                    <RacingMotorcycle color={tone} size={55} />
                  ) : (
                    <Ionicons
                      name={activity.icon as keyof typeof Ionicons.glyphMap}
                      size={22}
                      color={tone}
                    />
                  )}
                </FloatingView>
                <View style={styles.copy}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityDetail}>{activity.detail}</Text>
                </View>
                <Text style={styles.time}>{activity.time}</Text>
              </Panel>
            </FadeInView>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.cyan, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.textSoft, fontSize: 13, marginTop: 4, fontWeight: '600' },
  icon: {
    width: 55,
    height: 55,
    borderRadius: 19,
    backgroundColor: 'rgba(55,216,255,.11)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 19,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { color: colors.cyan, fontSize: 23, fontWeight: '900', textAlign: 'center' },
  summaryLabel: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 5,
  },
  summaryDivider: { width: 1, height: 43, backgroundColor: colors.borderStrong },
  timeline: { gap: 0 },
  item: { flexDirection: 'row', minHeight: 99 },
  rail: { width: 28, alignItems: 'center' },
  line: {
    position: 'absolute',
    top: 23,
    bottom: -23,
    width: 2,
    backgroundColor: colors.borderStrong,
  },
  dot: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  card: {
    flex: 1,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  activityIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motorcycleIcon: {
    width: 62,
    overflow: 'visible',
  },
  copy: { flex: 1 },
  activityTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  activityDetail: { color: colors.textSoft, fontSize: 13, lineHeight: 18, marginTop: 4 },
  time: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
});
