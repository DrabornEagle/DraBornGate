import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { EmptyState, Panel, SectionTitle } from '../components/UI';
import { getSiteReport, logReportExport, SiteReport } from '../lib/v030Api';
import { colors, radius, spacing } from '../theme';

const ranges = [7, 30, 90, 365] as const;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`;
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ManagementReportsV030({ siteId, siteName }: { siteId: string; siteName: string }) {
  const [days, setDays] = useState<(typeof ranges)[number]>(30);
  const [report, setReport] = useState<SiteReport>();
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const dateTo = isoDate(new Date());
  const dateFrom = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - days + 1);
    return isoDate(date);
  }, [days]);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      setReport(await getSiteReport(siteId, dateFrom, dateTo));
    } catch (error) {
      Alert.alert('Rapor alınamadı', error instanceof Error ? error.message : 'Lütfen tekrar dene.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createCsv = () => {
    if (!report) return '';
    const rows: string[][] = [
      ['DraBornGate v0.3 Site Raporu'],
      ['Site', siteName],
      ['Paket', report.plan.name],
      ['Tarih Aralığı', `${report.date_from} - ${report.date_to}`],
      [],
      ['ÖZET', 'DEĞER'],
      ['Kurye Geçişi', String(report.summary.courier_total)],
      ['Tamamlanan', String(report.summary.completed)],
      ['Reddedilen', String(report.summary.rejected)],
      ['Tamamlanma Oranı', `%${report.summary.completion_rate}`],
      ['Akıllı Geçiş Oranı', `%${report.summary.airpass_rate}`],
      ['Ortalama Tamamlama', `${report.summary.average_completion_minutes} dk`],
      ['Ziyaretçi', String(report.summary.visitor_total)],
      ['Aidat Tahsilatı', money(report.summary.dues_paid)],
      ['Ödenmemiş Aidat', money(report.summary.dues_unpaid)],
      ['Gelir', money(report.summary.income)],
      ['Gider', money(report.summary.expense)],
      ['Bakiye', money(report.summary.balance)],
      [],
      ['GÜNLÜK', 'KURYE', 'TAMAMLANAN', 'REDDEDİLEN', 'ZİYARETÇİ'],
      ...report.daily.map((item) => [item.date, String(item.courier), String(item.completed), String(item.rejected), String(item.visitor)]),
      [],
      ['PLATFORM', 'TOPLAM', 'TAMAMLANAN', 'REDDEDİLEN'],
      ...report.platforms.map((item) => [item.platform, String(item.total), String(item.completed), String(item.rejected)]),
      [],
      ['KAPI', 'TOPLAM', 'TAMAMLANAN', 'REDDEDİLEN', 'ORTALAMA DK'],
      ...report.gates.map((item) => [item.gate, String(item.total), String(item.completed), String(item.rejected), String(item.average_minutes)]),
    ];
    return rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  };

  const shareCsv = async () => {
    if (!report) return;
    if (!report.plan.allow_export) {
      Alert.alert('Profesyonel özellik', 'CSV raporu paylaşmak için Profesyonel veya Kurumsal paket gerekir.');
      return;
    }
    setSharing(true);
    try {
      await logReportExport(siteId, report.date_from, report.date_to, 'operations', report.daily.length);
      await Share.share({
        title: `${siteName} DraBornGate Raporu`,
        message: createCsv(),
      });
    } catch (error) {
      Alert.alert('Rapor paylaşılamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setSharing(false);
    }
  };

  if (!siteId) return <EmptyState icon="business-outline" title="Yönetilen site yok" description="Raporlama için önce onaylı bir site gerekir." />;

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.cyan} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <FadeInView style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>V0.3 • PROFESYONEL RAPORLAMA</Text>
          <Text style={styles.title}>{siteName}</Text>
          <Text style={styles.subtitle}>Kurye, güvenlik, ziyaretçi, aidat ve finans verileri tek raporda.</Text>
        </View>
        <View style={styles.reportIcon}><Ionicons name="analytics" size={30} color={colors.cyan} /></View>
      </FadeInView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeRow}>
        {ranges.map((item) => (
          <AnimatedPressable key={item} onPress={() => setDays(item)}>
            <View style={[styles.rangeChip, days === item && styles.rangeChipActive]}>
              <Text style={[styles.rangeText, days === item && styles.rangeTextActive]}>{item} GÜN</Text>
            </View>
          </AnimatedPressable>
        ))}
      </ScrollView>

      {loading && !report ? (
        <Panel style={styles.loading}><ActivityIndicator size="large" color={colors.cyan} /><Text style={styles.loadingText}>Rapor hesaplanıyor</Text></Panel>
      ) : report ? (
        <>
          <Panel style={styles.planPanel} gradient>
            <View style={styles.planTop}>
              <View style={[styles.planBadge, { borderColor: report.plan.code === 'corporate' ? colors.magenta : report.plan.code === 'professional' ? colors.cyan : colors.orange }]}>
                <Ionicons name={report.plan.code === 'corporate' ? 'diamond' : report.plan.code === 'professional' ? 'sparkles' : 'leaf'} size={18} color={report.plan.code === 'corporate' ? colors.magenta : report.plan.code === 'professional' ? colors.cyan : colors.orange} />
                <Text style={styles.planName}>{report.plan.name}</Text>
              </View>
              <Text style={styles.period}>{report.date_from} → {report.date_to}</Text>
            </View>
            {report.range_was_limited ? <Text style={styles.limitWarning}>İstenen tarih aralığı paketinin {report.plan.report_days_limit} günlük sınırına göre kısaltıldı.</Text> : null}
            <Text style={styles.planText}>{report.plan.description}</Text>
          </Panel>

          <View style={styles.metrics}>
            <Metric icon="bicycle" label="Kurye" value={String(report.summary.courier_total)} tone={colors.cyan} />
            <Metric icon="checkmark-done" label="Tamamlanan" value={String(report.summary.completed)} tone={colors.green} />
            <Metric icon="people" label="Ziyaretçi" value={String(report.summary.visitor_total)} tone={colors.orange} />
          </View>

          <SectionTitle title="Operasyon başarısı" />
          <Panel style={styles.scorePanel} gradient>
            <Rate label="Tamamlanma" value={report.summary.completion_rate} tone={colors.green} />
            <Rate label="Onaylanma" value={report.summary.approval_rate} tone={colors.cyan} />
            <Rate label="Akıllı Geçiş" value={report.summary.airpass_rate} tone={colors.purple} />
            <View style={styles.timeGrid}>
              <SmallStat label="Onay süresi" value={`${number(report.summary.average_approval_minutes)} dk`} />
              <SmallStat label="Tamamlama" value={`${number(report.summary.average_completion_minutes)} dk`} />
              <SmallStat label="Tahmini süre" value={`${number(report.summary.average_eta_minutes)} dk`} />
            </View>
          </Panel>

          <SectionTitle title="Günlük hareket" action={`${report.daily.length} gün`} />
          <Panel style={styles.chartPanel} gradient>
            {report.daily.map((item) => {
              const max = Math.max(1, ...report.daily.map((row) => Math.max(row.courier, row.visitor)));
              return (
                <View key={item.date} style={styles.dayRow}>
                  <Text style={styles.dayLabel}>{new Date(`${item.date}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}</Text>
                  <View style={styles.bars}>
                    <View style={[styles.bar, { width: `${Math.max(3, item.courier / max * 100)}%`, backgroundColor: colors.cyan }]} />
                    <View style={[styles.bar, { width: `${Math.max(3, item.visitor / max * 100)}%`, backgroundColor: colors.orange }]} />
                  </View>
                  <Text style={styles.dayValue}>{item.courier}/{item.visitor}</Text>
                </View>
              );
            })}
            <View style={styles.legend}><Legend tone={colors.cyan} text="Kurye" /><Legend tone={colors.orange} text="Ziyaretçi" /></View>
          </Panel>

          <SectionTitle title="Kapı performansı" />
          {report.gates.length ? <View style={styles.list}>{report.gates.map((item) => (
            <Panel key={item.gate} style={styles.rowCard} gradient>
              <View style={styles.rowIcon}><Ionicons name="enter" size={22} color={colors.cyan} /></View>
              <View style={styles.copy}><Text style={styles.rowTitle}>{item.gate}</Text><Text style={styles.rowText}>{item.completed} tamamlandı • {item.rejected} reddedildi • Ort. {item.average_minutes} dk</Text></View>
              <Text style={styles.rowValue}>{item.total}</Text>
            </Panel>
          ))}</View> : <EmptyState icon="enter-outline" title="Kapı verisi yok" description="Seçilen aralıkta geçiş kaydı bulunmuyor." />}

          <SectionTitle title="Teslimat platformları" />
          <Panel gradient>
            {report.platforms.length ? report.platforms.map((item, index) => (
              <View key={item.platform} style={[styles.simpleRow, index < report.platforms.length - 1 && styles.divider]}>
                <View style={styles.copy}><Text style={styles.rowTitle}>{item.platform}</Text><Text style={styles.rowText}>{item.completed} tamamlandı • {item.rejected} reddedildi</Text></View>
                <Text style={styles.rowValue}>{item.total}</Text>
              </View>
            )) : <Text style={styles.emptyText}>Platform verisi bulunmuyor.</Text>}
          </Panel>

          {report.plan.advanced_finance ? (
            <>
              <SectionTitle title="Aidat ve finans analizi" />
              <Panel style={styles.financePanel} gradient>
                <View style={styles.financeGrid}>
                  <Finance label="GELİR" value={report.summary.income} tone={colors.green} />
                  <Finance label="GİDER" value={report.summary.expense} tone={colors.red} />
                  <Finance label="BAKİYE" value={report.summary.balance} tone={colors.cyan} />
                </View>
                <View style={styles.financeGrid}>
                  <Finance label="AİDAT" value={report.summary.dues_total} tone={colors.text} />
                  <Finance label="TAHSİL" value={report.summary.dues_paid} tone={colors.green} />
                  <Finance label="BORÇ" value={report.summary.dues_unpaid} tone={colors.orange} />
                </View>
                <Rate label="Aidat tahsilat oranı" value={report.summary.dues_collection_rate} tone={colors.green} />
              </Panel>
            </>
          ) : (
            <Panel style={styles.locked} gradient>
              <Ionicons name="lock-closed" size={25} color={colors.orange} />
              <View style={styles.copy}><Text style={styles.lockedTitle}>Gelişmiş finans analizi kilitli</Text><Text style={styles.lockedText}>Kategori dağılımı, tahsilat oranı ve ayrıntılı finans raporları Profesyonel pakette açılır.</Text></View>
            </Panel>
          )}

          {report.plan.code !== 'starter' ? (
            <>
              <SectionTitle title="Kurye ve güvenlik performansı" />
              <Panel gradient>
                <Text style={styles.subheading}>En yoğun kuryeler</Text>
                {report.couriers.slice(0, 5).map((item, index) => <Ranking key={`${item.courier_name}-${index}`} rank={index + 1} title={item.courier_name} text={`${item.platform} • ${item.completed} tamamlanan • Ort. ${item.average_minutes} dk`} value={item.total} />)}
                <Text style={[styles.subheading, styles.subheadingGap]}>Güvenlik işlemleri</Text>
                {report.security.length ? report.security.slice(0, 5).map((item, index) => <Ranking key={`${item.full_name}-${index}`} rank={index + 1} title={item.full_name} text={`${item.approved} onay • ${item.rejected} red • Ort. ${item.average_decision_minutes} dk`} value={item.total_actions} />) : <Text style={styles.emptyText}>Güvenlik işlem verisi bulunmuyor.</Text>}
              </Panel>
            </>
          ) : null}

          <SectionTitle title="Paket kullanımı" />
          <Panel style={styles.usagePanel} gradient>
            {Object.entries(report.usage).map(([key, usage]) => <Usage key={key} label={usageLabel(key)} used={usage.used} limit={usage.limit} />)}
          </Panel>

          <AnimatedPressable onPress={() => void shareCsv()} disabled={sharing}>
            <View style={[styles.exportButton, !report.plan.allow_export && styles.exportButtonLocked]}>
              <Ionicons name={report.plan.allow_export ? 'share-social' : 'lock-closed'} size={22} color={report.plan.allow_export ? colors.background : colors.orange} />
              <View style={styles.copy}><Text style={[styles.exportTitle, !report.plan.allow_export && { color: colors.orange }]}>{sharing ? 'RAPOR HAZIRLANIYOR' : 'CSV RAPORUNU PAYLAŞ'}</Text><Text style={[styles.exportText, !report.plan.allow_export && { color: colors.textSoft }]}>{report.plan.allow_export ? 'Telefonun paylaşım menüsüyle gönder veya kaydet.' : 'Profesyonel veya Kurumsal paket gerekir.'}</Text></View>
            </View>
          </AnimatedPressable>
        </>
      ) : null}
    </ScrollView>
  );
}

function Metric({ icon, label, value, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone: string }) {
  return <Panel style={styles.metric} gradient><View style={[styles.metricIcon, { backgroundColor: `${tone}1A` }]}><Ionicons name={icon} size={22} color={tone} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></Panel>;
}

function Rate({ label, value, tone }: { label: string; value: number; tone: string }) {
  const safe = Math.max(0, Math.min(100, number(value)));
  return <View style={styles.rate}><View style={styles.rateTop}><Text style={styles.rateLabel}>{label}</Text><Text style={[styles.rateValue, { color: tone }]}>%{safe}</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${safe}%`, backgroundColor: tone }]} /></View></View>;
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return <View style={styles.smallStat}><Text style={styles.smallValue}>{value}</Text><Text style={styles.smallLabel}>{label}</Text></View>;
}

function Legend({ tone, text }: { tone: string; text: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: tone }]} /><Text style={styles.legendText}>{text}</Text></View>;
}

function Finance({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <View style={styles.financeItem}><Text style={styles.financeLabel}>{label}</Text><Text style={[styles.financeValue, { color: tone }]} numberOfLines={1} adjustsFontSizeToFit>{money(value)}</Text></View>;
}

function Ranking({ rank, title, text, value }: { rank: number; title: string; text: string; value: number }) {
  return <View style={styles.ranking}><View style={styles.rank}><Text style={styles.rankText}>{rank}</Text></View><View style={styles.copy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowText}>{text}</Text></View><Text style={styles.rowValue}>{value}</Text></View>;
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit === 0;
  const ratio = unlimited ? 18 : Math.min(100, used / Math.max(1, limit) * 100);
  return <View style={styles.usageItem}><View style={styles.rateTop}><Text style={styles.rateLabel}>{label}</Text><Text style={styles.usageValue}>{used} / {unlimited ? 'Sınırsız' : limit}</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${ratio}%`, backgroundColor: ratio >= 90 && !unlimited ? colors.red : colors.cyan }]} /></View></View>;
}

function usageLabel(key: string) {
  const labels: Record<string, string> = { gates: 'Kapılar', staff: 'Yönetim ve güvenlik', residents: 'Site sakinleri', courier_passes_month: 'Aylık kurye geçişi', visitor_passes_month: 'Aylık ziyaretçi geçişi' };
  return labels[key] ?? key;
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 14, paddingBottom: 132, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, copy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: 12, fontWeight: '900', letterSpacing: .9 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.textSoft, fontSize: 14, lineHeight: 21, marginTop: 5 },
  reportIcon: { width: 61, height: 61, borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.10)', alignItems: 'center', justifyContent: 'center' },
  rangeRow: { gap: 8, paddingRight: 12 }, rangeChip: { height: 42, minWidth: 76, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  rangeChipActive: { borderColor: colors.cyan, backgroundColor: 'rgba(55,216,255,.11)' }, rangeText: { color: colors.textMuted, fontSize: 11, fontWeight: '900' }, rangeTextActive: { color: colors.cyan },
  loading: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 12 }, loadingText: { color: colors.textSoft, fontSize: 14, fontWeight: '700' },
  planPanel: { gap: 9, borderColor: 'rgba(55,216,255,.38)' }, planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, planBadge: { minHeight: 37, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 }, planName: { color: colors.text, fontSize: 13, fontWeight: '900' }, period: { color: colors.textSoft, fontSize: 11, fontWeight: '800' }, planText: { color: colors.textSoft, fontSize: 13, lineHeight: 19 }, limitWarning: { color: colors.orange, fontSize: 12, lineHeight: 18, fontWeight: '800' },
  metrics: { flexDirection: 'row', gap: 8 }, metric: { flex: 1, minHeight: 126, alignItems: 'center', justifyContent: 'center', padding: 9 }, metricIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, metricValue: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 7 }, metricLabel: { color: colors.textSoft, fontSize: 11, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  scorePanel: { gap: 15 }, rate: { gap: 6 }, rateTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, rateLabel: { color: colors.textSoft, fontSize: 13, fontWeight: '800' }, rateValue: { fontSize: 14, fontWeight: '900' }, track: { height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,.07)', overflow: 'hidden' }, fill: { height: '100%', borderRadius: 8 }, timeGrid: { flexDirection: 'row', gap: 8, marginTop: 3 }, smallStat: { flex: 1, minHeight: 70, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 7 }, smallValue: { color: colors.text, fontSize: 16, fontWeight: '900' }, smallLabel: { color: colors.textMuted, fontSize: 10, marginTop: 4, textAlign: 'center' },
  chartPanel: { gap: 8 }, dayRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8 }, dayLabel: { width: 43, color: colors.textSoft, fontSize: 10, fontWeight: '800' }, bars: { flex: 1, gap: 3 }, bar: { height: 7, borderRadius: 7, minWidth: 3 }, dayValue: { width: 44, color: colors.text, fontSize: 10, fontWeight: '900', textAlign: 'right' }, legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 7 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, legendDot: { width: 8, height: 8, borderRadius: 8 }, legendText: { color: colors.textSoft, fontSize: 11, fontWeight: '800' },
  list: { gap: 9 }, rowCard: { flexDirection: 'row', alignItems: 'center', gap: 10 }, rowIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: 'rgba(55,216,255,.10)', alignItems: 'center', justifyContent: 'center' }, rowTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, rowText: { color: colors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 3 }, rowValue: { color: colors.cyan, fontSize: 19, fontWeight: '900' }, simpleRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 9 }, divider: { borderBottomWidth: 1, borderBottomColor: colors.border }, emptyText: { color: colors.textSoft, fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  financePanel: { gap: 16 }, financeGrid: { flexDirection: 'row', gap: 8 }, financeItem: { flex: 1, minWidth: 0 }, financeLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900' }, financeValue: { fontSize: 15, fontWeight: '900', marginTop: 4 },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 11, borderColor: 'rgba(255,179,92,.38)' }, lockedTitle: { color: colors.orange, fontSize: 15, fontWeight: '900' }, lockedText: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 },
  subheading: { color: colors.cyan, fontSize: 12, fontWeight: '900', letterSpacing: .5, marginBottom: 5 }, subheadingGap: { marginTop: 16 }, ranking: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: colors.border }, rank: { width: 31, height: 31, borderRadius: 10, backgroundColor: 'rgba(139,107,255,.14)', alignItems: 'center', justifyContent: 'center' }, rankText: { color: colors.purple, fontSize: 13, fontWeight: '900' },
  usagePanel: { gap: 13 }, usageItem: { gap: 6 }, usageValue: { color: colors.text, fontSize: 12, fontWeight: '900' },
  exportButton: { minHeight: 69, borderRadius: radius.lg, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 17 }, exportButtonLocked: { backgroundColor: 'rgba(255,179,92,.08)', borderWidth: 1, borderColor: 'rgba(255,179,92,.38)' }, exportTitle: { color: colors.background, fontSize: 14, fontWeight: '900' }, exportText: { color: 'rgba(6,16,29,.72)', fontSize: 11, marginTop: 3 },
});
