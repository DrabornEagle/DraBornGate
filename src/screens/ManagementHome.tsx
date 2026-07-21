import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FadeInView, FloatingView, PulseDot } from '../components/Motion';
import { LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';
import { useDemo } from '../store/DemoContext';
import { colors, gradients, radius, spacing } from '../theme';

const hourly = [3, 5, 9, 14, 18, 11, 7, 4];

export function ManagementHome() {
  const { passes } = useDemo();
  const completed = passes.filter((pass) => pass.status === 'completed').length;
  const waiting = passes.filter((pass) => pass.status === 'waiting').length;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <FadeInView style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SİTE YÖNETİM MERKEZİ</Text>
          <Text style={styles.title}>DraBorn Marina</Text>
          <Text style={styles.subtitle}>Kurye geçiş operasyonu • v0.1 demo</Text>
        </View>
        <LiveBadge label="SİSTEM AÇIK" />
      </FadeInView>

      <FadeInView delay={70}>
        <LinearGradient
          colors={gradients.management}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.score}
        >
          <View>
            <Text style={styles.scoreLabel}>OPERASYON SKORU</Text>
            <Text style={styles.scoreValue}>
              94<Text style={styles.scoreSmall}>/100</Text>
            </Text>
            <Text style={styles.scoreText}>Geçiş hızı ve güvenlik dengesi çok iyi</Text>
          </View>
          <FloatingView style={styles.scoreIcon} distance={6} duration={1700}>
            <Ionicons name="analytics" size={43} color={colors.white} />
          </FloatingView>
        </LinearGradient>
      </FadeInView>

      <FadeInView delay={130} style={styles.metrics}>
        <MetricCard label="Bugün geçiş" value="18" icon="enter" tone={colors.cyan} />
        <MetricCard label="Bekleyen" value={String(waiting)} icon="time" tone={colors.orange} />
        <MetricCard
          label="Tamamlanan"
          value={String(completed)}
          icon="checkmark-done"
          tone={colors.green}
        />
      </FadeInView>

      <FadeInView delay={190}>
        <SectionTitle title="Saatlik kapı yoğunluğu" action="Bugün" />
        <Panel gradient>
          <View style={styles.chart}>
            {hourly.map((value, index) => (
              <View key={index} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={index === 4 ? gradients.warning : gradients.primary}
                    style={[
                      styles.bar,
                      { height: `${Math.max(15, (value / 18) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.hour}>{8 + index * 2}:00</Text>
              </View>
            ))}
          </View>
        </Panel>
      </FadeInView>

      <FadeInView delay={250}>
        <SectionTitle title="Kapı performansı" />
        <View style={styles.gates}>
          <Gate
            name="A Kapısı"
            count="12 geçiş"
            time="16 sn"
            progress={82}
            tone={colors.cyan}
          />
          <Gate
            name="B Kapısı"
            count="6 geçiş"
            time="21 sn"
            progress={56}
            tone={colors.purple}
          />
        </View>
      </FadeInView>

      <FadeInView delay={310}>
        <SectionTitle title="Sistem durumu" />
        <Panel style={styles.system} gradient>
          <System
            icon="cloud-offline"
            title="Yerel demo veri deposu"
            text="AsyncStorage aktif"
            tone={colors.green}
          />
          <System
            icon="notifications"
            title="Geçiş bildirimleri"
            text="Demo hareket akışı aktif"
            tone={colors.cyan}
          />
          <System
            icon="server"
            title="Supabase bağlantısı"
            text="Gerçek entegrasyon henüz kapalı"
            tone={colors.orange}
          />
        </Panel>
      </FadeInView>
    </ScrollView>
  );
}

function Gate({
  name,
  count,
  time,
  progress,
  tone,
}: {
  name: string;
  count: string;
  time: string;
  progress: number;
  tone: string;
}) {
  return (
    <Panel style={[styles.gate, { borderColor: `${tone}45` }]} gradient>
      <FloatingView style={[styles.gateIcon, { backgroundColor: `${tone}1B` }]}>
        <Ionicons name="enter" size={24} color={tone} />
      </FloatingView>
      <View style={styles.gateCopy}>
        <View style={styles.gateTop}>
          <Text style={styles.gateName}>{name}</Text>
          <Text style={[styles.gateTime, { color: tone }]}>{time}</Text>
        </View>
        <Text style={styles.gateCount}>{count} • ortalama onay</Text>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: tone }]} />
        </View>
      </View>
    </Panel>
  );
}

function System({
  icon,
  title,
  text,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  tone: string;
}) {
  return (
    <View style={styles.systemRow}>
      <FloatingView style={[styles.systemIcon, { backgroundColor: `${tone}18` }]}>
        <Ionicons name={icon} size={21} color={tone} />
      </FloatingView>
      <View style={styles.systemCopy}>
        <Text style={styles.systemTitle}>{title}</Text>
        <Text style={styles.systemText}>{text}</Text>
      </View>
      <PulseDot color={tone} size={9} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.purple, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.textSoft, fontSize: 13, marginTop: 4, fontWeight: '600' },
  score: {
    borderRadius: radius.xl,
    padding: 21,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.22)',
  },
  scoreLabel: { color: 'rgba(255,255,255,.82)', fontSize: 12, fontWeight: '900' },
  scoreValue: { color: colors.white, fontSize: 41, fontWeight: '900', marginTop: 3 },
  scoreSmall: { fontSize: 18 },
  scoreText: { color: 'rgba(255,255,255,.88)', fontSize: 13, marginTop: 5 },
  scoreIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: { flexDirection: 'row', gap: 9 },
  chart: { height: 174, flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: {
    flex: 1,
    width: 21,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255,255,255,.045)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: 10 },
  hour: { color: colors.textSoft, fontSize: 9, fontWeight: '700', marginTop: 8 },
  gates: { gap: 10 },
  gate: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gateIcon: {
    width: 49,
    height: 49,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateCopy: { flex: 1 },
  gateTop: { flexDirection: 'row', justifyContent: 'space-between' },
  gateName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  gateTime: { fontSize: 14, fontWeight: '900' },
  gateCount: { color: colors.textSoft, fontSize: 13, marginTop: 4 },
  progress: {
    height: 6,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,.07)',
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  system: { paddingVertical: 4 },
  systemRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  systemIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemCopy: { flex: 1 },
  systemTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  systemText: { color: colors.textSoft, fontSize: 13, marginTop: 4 },
});
