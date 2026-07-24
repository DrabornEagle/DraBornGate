import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { BillingCycle, GooglePlaySubscriptionButton } from '../components/GooglePlaySubscriptionButton';
import { AnimatedPressable, FadeInView, FloatingView } from '../components/Motion';
import { SiteRoleApplicationsManager } from '../components/SiteRoleApplicationsManager';
import { EmptyState, MetricCard, Panel, SectionTitle } from '../components/UI';
import { APP_VERSION } from '../config/version';
import { supabase } from '../lib/supabase';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';

type Tab = 'reports' | 'packages' | 'applications';
type Plan = {
  code: string; name: string; description: string; weekly_price: number | string; monthly_price: number | string; yearly_price: number | string; currency: string;
  gate_limit: number; staff_limit: number; resident_limit: number; monthly_courier_pass_limit: number; report_days_limit: number; allow_export: boolean;
  play_product_id?: string; play_weekly_base_plan_id?: string; play_monthly_base_plan_id?: string; play_yearly_base_plan_id?: string;
};
type UsageItem = { used: number; limit: number };
type Center = { subscription: { plan_code: string; status: string; billing_cycle?: BillingCycle; current_period_end?: string; auto_renewing?: boolean } | null; effective_plan: Plan; plans: Plan[]; usage: { gates: UsageItem; staff: UsageItem; residents: UsageItem; courier_passes_month: UsageItem; visitor_passes_month: UsageItem } };
type Report = { date_from: string; date_to: string; plan: Plan; summary: Record<string, number | string>; usage: Center['usage']; range_was_limited: boolean };
const numberValue = (value: unknown) => Number(value ?? 0) || 0;
const money = (value: unknown, currency = 'TRY') => `${numberValue(value).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${currency === 'TRY' ? 'TL' : currency}`;
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('tr-TR') : 'Süresiz';
const cycleLabel = (cycle: BillingCycle) => cycle === 'weekly' ? 'hafta' : cycle === 'monthly' ? 'ay' : 'yıl';

export function ManagementProCenter() {
  const gate = useGate();
  const [tab, setTab] = useState<Tab>('reports');
  const [managedIds, setManagedIds] = useState<string[]>([]);
  const [siteId, setSiteId] = useState('');
  const [center, setCenter] = useState<Center>();
  const [report, setReport] = useState<Report>();
  const [selected, setSelected] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const sites = useMemo(() => gate.sites.filter((site) => managedIds.includes(site.id)), [gate.sites, managedIds]);
  const actualSiteId = siteId || sites[0]?.id || '';

  const load = useCallback(async (preferredSiteId?: string) => {
    setLoading(true);
    try {
      const managed = await supabase.rpc('dkd_gate_list_my_managed_site_ids');
      if (managed.error) throw managed.error;
      const ids = Array.isArray(managed.data) ? managed.data.filter((id): id is string => typeof id === 'string') : [];
      setManagedIds(ids);
      const target = preferredSiteId && ids.includes(preferredSiteId) ? preferredSiteId : siteId && ids.includes(siteId) ? siteId : ids[0] || '';
      setSiteId(target);
      if (!target) { setCenter(undefined); setReport(undefined); return; }
      const [packageResult, reportResult] = await Promise.all([
        supabase.rpc('dkd_gate_get_subscription_center', { p_site_id: target }),
        supabase.rpc('dkd_gate_get_site_report', { p_site_id: target, p_date_from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), p_date_to: new Date().toISOString().slice(0, 10) }),
      ]);
      if (packageResult.error) throw packageResult.error;
      if (reportResult.error) throw reportResult.error;
      const next = packageResult.data as Center;
      setCenter(next);
      setReport(reportResult.data as Report);
      setSelected((current) => current && next.plans.some((plan) => plan.code === current) ? current : next.effective_plan?.code || next.plans?.[0]?.code || '');
      if (next.subscription?.billing_cycle) setCycle(next.subscription.billing_cycle);
    } catch (caught) { Alert.alert('Merkez yüklenemedi', caught instanceof Error ? caught.message : 'Tekrar dene.'); }
    finally { setLoading(false); }
  }, [siteId]);
  useEffect(() => { void load(); }, []);

  const exportReport = async () => {
    if (!actualSiteId || !report) return;
    setWorking(true);
    try {
      const result = await supabase.rpc('dkd_gate_prepare_report_export', { p_site_id: actualSiteId, p_date_from: report.date_from, p_date_to: report.date_to });
      if (result.error) throw result.error;
      await Share.share({ title: 'DraBornGate Raporu', message: String((result.data as { csv?: string })?.csv || '') });
    } catch (caught) { Alert.alert('Rapor paylaşılamadı', caught instanceof Error ? caught.message : 'Tekrar dene.'); }
    finally { setWorking(false); }
  };
  const selectedPlan = center?.plans.find((plan) => plan.code === selected);

  if (loading && !center) return <View style={s.loading}><ActivityIndicator size="large" color={colors.magenta} /><Text style={s.muted}>Raporlar ve paketler hazırlanıyor</Text></View>;
  return <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load(actualSiteId)} tintColor={colors.magenta} />} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <FadeInView><View style={s.header}><Text style={s.eyebrow}>SİTE YÖNETİM MERKEZİ</Text><Text style={s.title}>DraBornGate v{APP_VERSION}</Text><Text style={s.subtitle}>Raporlar • Satış Paketleri • Başvurular</Text></View></FadeInView>
    {sites.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontal}>{sites.map((site) => <AnimatedPressable key={site.id} onPress={() => { setSiteId(site.id); void load(site.id); }}><View style={[s.site, actualSiteId === site.id && s.siteActive]}><Ionicons name="business" size={20} color={actualSiteId === site.id ? colors.magenta : colors.textMuted} /><View><Text style={s.siteName}>{site.name}</Text><Text style={s.siteCity}>{site.city || 'Şehir belirtilmedi'}</Text></View>{actualSiteId === site.id ? <Ionicons name="checkmark-circle" size={20} color={colors.magenta} /> : null}</View></AnimatedPressable>)}</ScrollView> : <EmptyState icon="business-outline" title="Yönetilen site bulunamadı" description="Site Yönetimi başvurusu onaylandığında bu merkez açılır." />}
    <View style={s.tabs}><TabButton active={tab === 'reports'} title="Raporlar" icon="analytics" onPress={() => setTab('reports')} /><TabButton active={tab === 'packages'} title="Paketler" icon="diamond" onPress={() => setTab('packages')} /><TabButton active={tab === 'applications'} title="Başvurular" icon="people" onPress={() => setTab('applications')} /></View>

    {tab === 'reports' && report ? <View style={s.section}><SectionTitle title="Son 30 gün" action={`${dateLabel(report.date_from)} — ${dateLabel(report.date_to)}`} /><View style={s.metrics}><MetricCard label="Kurye geçişi" value={String(numberValue(report.summary.courier_total))} icon="navigate" tone={colors.cyan} /><MetricCard label="Tamamlanan" value={String(numberValue(report.summary.completed))} icon="checkmark-done" tone={colors.green} /><MetricCard label="Ziyaretçi" value={String(numberValue(report.summary.visitor_total))} icon="people" tone={colors.orange} /></View><Panel style={s.summary} gradient><Line label="Onay oranı" value={`%${numberValue(report.summary.approval_rate)}`} /><Line label="Akıllı Geçiş oranı" value={`%${numberValue(report.summary.airpass_rate)}`} /><Line label="Finans bakiyesi" value={money(report.summary.balance)} /><Line label="Ödenmemiş aidat" value={money(report.summary.dues_unpaid)} /></Panel><Usage usage={report.usage} /><AnimatedPressable onPress={() => void exportReport()} disabled={working || !report.plan.allow_export}><LinearGradient colors={report.plan.allow_export ? gradients.primary : ['#3B4D5F', '#29394A']} style={s.button}><Ionicons name="share" size={21} color={colors.white} /><Text style={s.buttonText}>{report.plan.allow_export ? 'CSV RAPORUNU PAYLAŞ' : 'DIŞA AKTARMA İÇİN PAKET GEREKLİ'}</Text></LinearGradient></AnimatedPressable></View> : null}

    {tab === 'packages' && center ? <View style={s.section}>
      <LinearGradient colors={center.effective_plan.code === 'corporate' ? gradients.management : center.effective_plan.code === 'professional' ? gradients.courier : gradients.panelColorful} style={s.hero}><Text style={s.kicker}>MEVCUT PAKET</Text><Text style={s.heroTitle}>{center.effective_plan.name}</Text><Text style={s.heroText}>{center.effective_plan.description}</Text><Text style={s.renewal}>{center.subscription?.auto_renewing ? `Google Play • ${center.subscription.billing_cycle} otomatik yenileme` : center.subscription?.status === 'trialing' ? `Deneme bitişi ${dateLabel(center.subscription.current_period_end)}` : 'Ücretsiz veya Admin tanımlı paket'}</Text></LinearGradient>
      <Usage usage={center.usage} />
      <View style={s.chips}><Chip active={cycle === 'weekly'} title="Haftalık" onPress={() => setCycle('weekly')} /><Chip active={cycle === 'monthly'} title="Aylık" onPress={() => setCycle('monthly')} /><Chip active={cycle === 'yearly'} title="Yıllık" onPress={() => setCycle('yearly')} /></View>
      <SectionTitle title="Satış paketleri" />
      <View style={s.list}>{center.plans.map((plan, index) => <FadeInView key={plan.code} delay={index * 60}><AnimatedPressable onPress={() => setSelected(plan.code)}><Panel style={[s.plan, selected === plan.code && s.selected]} gradient><View style={s.planTop}><FloatingView style={s.planIcon} distance={3}><Ionicons name={plan.code === 'starter' ? 'leaf' : plan.code === 'professional' ? 'diamond' : 'business'} size={26} color={plan.code === 'starter' ? colors.green : plan.code === 'professional' ? colors.cyan : colors.magenta} /></FloatingView><View style={s.copy}><Text style={s.planName}>{plan.name}</Text><Text style={s.planPrice}>{money(cycle === 'weekly' ? plan.weekly_price : cycle === 'monthly' ? plan.monthly_price : plan.yearly_price, plan.currency)}{plan.code !== 'starter' ? ` / ${cycleLabel(cycle)}` : ''}</Text></View>{center.effective_plan.code === plan.code ? <Text style={s.current}>MEVCUT</Text> : selected === plan.code ? <Ionicons name="checkmark-circle" size={26} color={colors.cyan} /> : <Ionicons name="ellipse-outline" size={26} color={colors.textMuted} />}</View><Text style={s.planText}>{plan.description}</Text><View style={s.features}><Feature text={`${plan.gate_limit === 0 ? 'Sınırsız' : plan.gate_limit} kapı`} /><Feature text={`${plan.staff_limit === 0 ? 'Sınırsız' : plan.staff_limit} personel`} /><Feature text={`${plan.resident_limit === 0 ? 'Sınırsız' : plan.resident_limit} sakin`} /><Feature text={`${plan.report_days_limit} gün rapor`} /></View></Panel></AnimatedPressable></FadeInView>)}</View>
      {selectedPlan ? <GooglePlaySubscriptionButton plan={selectedPlan} cycle={cycle} scope="site" siteId={actualSiteId} onVerified={() => void load(actualSiteId)} /> : null}
      <Panel style={s.playNotice} gradient><Ionicons name="logo-google-playstore" size={28} color={colors.green} /><View style={s.copy}><Text style={s.noticeTitle}>Otomatik yenilenen Google Play aboneliği</Text><Text style={s.noticeText}>Seçilen haftalık, aylık veya yıllık dönem; kullanıcı Play Store’dan iptal edene kadar yenilenir. Kart bilgileri DraBornGate tarafından görülmez.</Text></View></Panel>
    </View> : null}
    {tab === 'applications' ? <View style={s.section}><SectionTitle title="Güvenlik ve site sakini başvuruları" /><SiteRoleApplicationsManager /></View> : null}
  </ScrollView>;
}

function TabButton({ active, title, icon, onPress }: { active: boolean; title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) { return <AnimatedPressable containerStyle={s.tabWrap} onPress={onPress}><View style={[s.tab, active && s.tabActive]}><Ionicons name={icon} size={20} color={active ? colors.magenta : colors.textMuted} /><Text style={[s.tabText, active && { color: colors.magenta }]}>{title}</Text></View></AnimatedPressable>; }
function Chip({ active, title, onPress }: { active: boolean; title: string; onPress: () => void }) { return <AnimatedPressable containerStyle={s.chipWrap} onPress={onPress}><View style={[s.chip, active && s.chipActive]}><Text style={[s.chipText, active && { color: colors.cyan }]}>{title}</Text></View></AnimatedPressable>; }
function Line({ label, value }: { label: string; value: string }) { return <View style={s.line}><Text style={s.lineLabel}>{label}</Text><Text style={s.lineValue}>{value}</Text></View>; }
function Feature({ text }: { text: string }) { return <View style={s.feature}><Ionicons name="checkmark-circle" size={16} color={colors.green} /><Text style={s.featureText}>{text}</Text></View>; }
function Usage({ usage }: { usage: Center['usage'] }) { const items = [['Kapı', usage.gates], ['Personel', usage.staff], ['Sakin', usage.residents], ['Kurye / ay', usage.courier_passes_month], ['Ziyaretçi / ay', usage.visitor_passes_month]] as const; return <Panel style={s.usagePanel} gradient>{items.map(([label, item]) => { const ratio = item.limit === 0 ? 0 : Math.min(item.used / Math.max(item.limit, 1), 1); return <View key={label} style={s.usageRow}><View style={s.usageHead}><Text style={s.usageLabel}>{label}</Text><Text style={s.usageValue}>{item.used} / {item.limit === 0 ? '∞' : item.limit}</Text></View><View style={s.track}><View style={[s.fill, { width: `${ratio * 100}%` }]} /></View></View>; })}</Panel>; }

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }, muted: { color: colors.textMuted }, content: { padding: spacing.md, paddingTop: 10, paddingBottom: 128, gap: 18 },
  header: { gap: 4 }, eyebrow: { color: colors.magenta, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, title: { color: colors.text, fontSize: 30, fontWeight: '900' }, subtitle: { color: colors.textSoft, fontSize: 13 }, horizontal: { gap: 9, paddingRight: 8 },
  site: { minWidth: 180, minHeight: 68, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }, siteActive: { borderColor: colors.magenta, backgroundColor: 'rgba(222,85,255,.08)' }, siteName: { color: colors.text, fontSize: 14, fontWeight: '900' }, siteCity: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  tabs: { flexDirection: 'row', gap: 7 }, tabWrap: { flex: 1 }, tab: { minHeight: 55, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 5 }, tabActive: { borderColor: colors.magenta, backgroundColor: 'rgba(222,85,255,.08)' }, tabText: { color: colors.textMuted, fontSize: 10, fontWeight: '900' }, section: { gap: 13 }, metrics: { flexDirection: 'row', gap: 7 }, summary: { gap: 9 }, line: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, lineLabel: { color: colors.textSoft, fontSize: 12 }, lineValue: { color: colors.text, fontSize: 12, fontWeight: '900' }, button: { minHeight: 55, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, buttonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  hero: { borderRadius: radius.xl, padding: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' }, kicker: { color: colors.white, fontSize: 10, fontWeight: '900' }, heroTitle: { color: colors.white, fontSize: 28, fontWeight: '900', marginTop: 5 }, heroText: { color: 'rgba(255,255,255,.82)', lineHeight: 19, marginTop: 6 }, renewal: { color: colors.green, fontSize: 11, fontWeight: '900', marginTop: 12 },
  chips: { flexDirection: 'row', gap: 7 }, chipWrap: { flex: 1 }, chip: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, chipActive: { borderColor: colors.cyan, backgroundColor: 'rgba(55,216,255,.08)' }, chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '900' },
  list: { gap: 10 }, plan: { gap: 10 }, selected: { borderColor: colors.cyan, borderWidth: 2 }, planTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, planIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: 'rgba(55,216,255,.1)', alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, planName: { color: colors.text, fontSize: 18, fontWeight: '900' }, planPrice: { color: colors.cyan, fontSize: 14, fontWeight: '900', marginTop: 3 }, current: { color: colors.green, fontSize: 9, fontWeight: '900', borderWidth: 1, borderColor: colors.green, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 }, planText: { color: colors.textSoft, lineHeight: 19 }, features: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, feature: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 6 }, featureText: { color: colors.textSoft, fontSize: 11 },
  playNotice: { flexDirection: 'row', gap: 11, alignItems: 'center', borderColor: 'rgba(67,231,162,.4)' }, noticeTitle: { color: colors.text, fontWeight: '900' }, noticeText: { color: colors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 4 }, usagePanel: { gap: 11 }, usageRow: { gap: 5 }, usageHead: { flexDirection: 'row', justifyContent: 'space-between' }, usageLabel: { color: colors.textSoft, fontSize: 11 }, usageValue: { color: colors.text, fontSize: 11, fontWeight: '900' }, track: { height: 7, borderRadius: 7, backgroundColor: 'rgba(255,255,255,.08)', overflow: 'hidden' }, fill: { height: 7, borderRadius: 7, backgroundColor: colors.cyan },
});
