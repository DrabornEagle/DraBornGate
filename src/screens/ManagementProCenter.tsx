import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { BillingCycle, GooglePlaySubscriptionButton } from '../components/GooglePlaySubscriptionButton';
import { CollapsibleCategory } from '../components/CollapsibleCategory';
import { GateRecordDetails, GateRecordDetailsModal } from '../components/GateRecordModals';
import { AnimatedPressable, FadeInView, FloatingView } from '../components/Motion';
import { SiteRoleApplicationsManager } from '../components/SiteRoleApplicationsManager';
import { EmptyState, MetricCard, Panel, SectionTitle } from '../components/UI';
import { APP_VERSION } from '../config/version';
import { supabase } from '../lib/supabase';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';

type Tab = 'reports' | 'packages' | 'applications';
type ReportRange = 'day' | 'week' | 'month';
type Plan = {
  code: string; name: string; description: string; weekly_price: number | string; monthly_price: number | string; yearly_price: number | string; currency: string;
  gate_limit: number; staff_limit: number; resident_limit: number; monthly_courier_pass_limit: number; report_days_limit: number; allow_export: boolean;
  play_product_id?: string; play_weekly_base_plan_id?: string; play_monthly_base_plan_id?: string; play_yearly_base_plan_id?: string;
};
type UsageItem = { used: number; limit: number };
type Center = { subscription: { plan_code: string; status: string; billing_cycle?: BillingCycle; current_period_end?: string; auto_renewing?: boolean } | null; effective_plan: Plan; plans: Plan[]; usage: { gates: UsageItem; staff: UsageItem; residents: UsageItem; courier_passes_month: UsageItem; visitor_passes_month: UsageItem } };
type DailyRow = { date: string; courier: number; completed: number; rejected: number; visitor: number };
type HourRow = { hour: number; total: number };
type GateRow = { gate: string; total: number; completed: number; rejected: number; completion_rate: number; average_minutes: number };
type CourierRow = { courier_name: string; platform: string; total: number; completed: number; rejected: number; average_minutes: number };
type SecurityRow = { full_name: string; approved: number; rejected: number; completed: number; total_actions: number; average_decision_minutes: number };
type Report = { date_from: string; date_to: string; plan: Plan; summary: Record<string, number | string>; usage: Center['usage']; range_was_limited: boolean; daily: DailyRow[]; hourly: HourRow[]; gates: GateRow[]; couriers: CourierRow[]; security: SecurityRow[] };
type EntryRow = { id: string; courier_name: string; courier_plate?: string; platform: string; gate: string; customer_name?: string; address_text?: string; block: string; floor?: string; apartment: string; order_number: string; status: string; created_at: string; arrived_at?: string; completed_at?: string; rejected_at?: string; entry_time?: string; location_verified: boolean; last_distance_m?: number };
type EntryReport = { date_from: string; date_to: string; entries: EntryRow[] };

const numberValue = (value: unknown) => Number(value ?? 0) || 0;
const money = (value: unknown, currency = 'TRY') => `${numberValue(value).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${currency === 'TRY' ? 'TL' : currency}`;
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('tr-TR') : 'Süresiz';
const dateTimeLabel = (value?: string) => value ? new Date(value).toLocaleString('tr-TR') : '—';
const cycleLabel = (cycle: BillingCycle) => cycle === 'weekly' ? 'hafta' : cycle === 'monthly' ? 'ay' : 'yıl';
const rangeDays: Record<ReportRange, number> = { day: 1, week: 7, month: 30 };
const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

export function ManagementProCenter() {
  const gate = useGate();
  const [tab, setTab] = useState<Tab>('reports');
  const [range, setRange] = useState<ReportRange>('month');
  const [managedIds, setManagedIds] = useState<string[]>([]);
  const [siteId, setSiteId] = useState('');
  const [center, setCenter] = useState<Center>();
  const [report, setReport] = useState<Report>();
  const [entryReport, setEntryReport] = useState<EntryReport>();
  const [entryLimit, setEntryLimit] = useState(5);
  const [selected, setSelected] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [detail, setDetail] = useState<GateRecordDetails>();
  const [open, setOpen] = useState<Record<string, boolean>>({ overview: true, entries: true, daily: false, hours: false, gates: false, couriers: false, security: false, usage: false });
  const sites = useMemo(() => gate.sites.filter((site) => managedIds.includes(site.id)), [gate.sites, managedIds]);
  const actualSiteId = siteId || sites[0]?.id || '';
  const actualSite = sites.find((item) => item.id === actualSiteId);

  const load = useCallback(async (preferredSiteId?: string, preferredRange: ReportRange = range) => {
    setLoading(true);
    try {
      const managed = await supabase.rpc('dkd_gate_list_my_managed_site_ids');
      if (managed.error) throw managed.error;
      const ids = Array.isArray(managed.data) ? managed.data.filter((id): id is string => typeof id === 'string') : [];
      setManagedIds(ids);
      const target = preferredSiteId && ids.includes(preferredSiteId) ? preferredSiteId : siteId && ids.includes(siteId) ? siteId : ids[0] || '';
      setSiteId(target);
      if (!target) { setCenter(undefined); setReport(undefined); setEntryReport(undefined); return; }
      const to = new Date();
      const from = new Date(to.getTime() - (rangeDays[preferredRange] - 1) * 86400000);
      const params = { p_site_id: target, p_date_from: toDateInput(from), p_date_to: toDateInput(to) };
      const [packageResult, reportResult, entriesResult] = await Promise.all([
        supabase.rpc('dkd_gate_get_subscription_center', { p_site_id: target }),
        supabase.rpc('dkd_gate_get_site_report', params),
        supabase.rpc('dkd_gate_get_site_entry_report', params),
      ]);
      if (packageResult.error) throw packageResult.error;
      if (reportResult.error) throw reportResult.error;
      if (entriesResult.error) throw entriesResult.error;
      const next = packageResult.data as Center;
      setCenter(next);
      setReport(reportResult.data as Report);
      setEntryReport(entriesResult.data as EntryReport);
      setEntryLimit(5);
      setSelected((current) => current && next.plans.some((plan) => plan.code === current) ? current : next.effective_plan?.code || next.plans?.[0]?.code || '');
      if (next.subscription?.billing_cycle) setCycle(next.subscription.billing_cycle);
    } catch (caught) { Alert.alert('Merkez yüklenemedi', caught instanceof Error ? caught.message : 'Tekrar dene.'); }
    finally { setLoading(false); }
  }, [range, siteId]);

  useEffect(() => { void load(undefined, range); }, [range]);
  useEffect(() => {
    if (tab !== 'reports' || !actualSiteId) return;
    void load(actualSiteId, range);
  }, [gate.activities.length, gate.passes.length]);

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

  const toggle = (key: string) => setOpen((current) => ({ ...current, [key]: !current[key] }));
  const selectedPlan = center?.plans.find((plan) => plan.code === selected);
  const entries = entryReport?.entries ?? [];
  const visibleEntries = entries.slice(0, entryLimit);
  const busiestHours = (report?.hourly ?? []).filter((item) => item.total > 0).sort((a, b) => b.total - a.total).slice(0, 6);
  const openDetail = (item: EntryRow) => setDetail({ id: item.id, status: item.status, courierName: item.courier_name, platform: item.platform, plate: item.courier_plate, site: actualSite?.name, gate: item.gate, customerName: item.customer_name, addressText: item.address_text, block: item.block, floor: item.floor, apartment: item.apartment, orderNumber: item.order_number, createdAt: item.created_at, arrivedAt: item.arrived_at, completedAt: item.completed_at, rejectedAt: item.rejected_at, locationVerified: item.location_verified, lastDistanceM: item.last_distance_m });

  if (loading && !center) return <View style={s.loading}><ActivityIndicator size="large" color={colors.magenta} /><Text style={s.muted}>Raporlar ve paketler hazırlanıyor</Text></View>;
  return <>
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load(actualSiteId, range)} tintColor={colors.magenta} />} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <FadeInView><View style={s.header}><Text style={s.eyebrow}>SİTE YÖNETİM MERKEZİ</Text><Text style={s.title}>DraBornGate v{APP_VERSION}</Text><Text style={s.subtitle}>Büyük metinli ayrıntılı raporlar • Satış paketleri • Başvurular</Text></View></FadeInView>
      {sites.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontal}>{sites.map((site) => <AnimatedPressable key={site.id} onPress={() => { setSiteId(site.id); void load(site.id, range); }}><View style={[s.site, actualSiteId === site.id && s.siteActive]}><Ionicons name="business" size={22} color={actualSiteId === site.id ? colors.magenta : colors.textMuted} /><View><Text style={s.siteName}>{site.name}</Text><Text style={s.siteCity}>{site.city || 'Şehir belirtilmedi'}</Text></View>{actualSiteId === site.id ? <Ionicons name="checkmark-circle" size={22} color={colors.magenta} /> : null}</View></AnimatedPressable>)}</ScrollView> : <EmptyState icon="business-outline" title="Yönetilen site bulunamadı" description="Site Yönetimi başvurusu onaylandığında bu merkez açılır." />}
      <View style={s.tabs}><TabButton active={tab === 'reports'} title="Raporlar" icon="analytics" onPress={() => setTab('reports')} /><TabButton active={tab === 'packages'} title="Paketler" icon="diamond" onPress={() => setTab('packages')} /><TabButton active={tab === 'applications'} title="Başvurular" icon="people" onPress={() => setTab('applications')} /></View>

      {tab === 'reports' && report ? <View style={s.section}>
        <View style={s.rangeRow}><RangeButton active={range === 'day'} title="Günlük" onPress={() => setRange('day')} /><RangeButton active={range === 'week'} title="Haftalık" onPress={() => setRange('week')} /><RangeButton active={range === 'month'} title="Aylık" onPress={() => setRange('month')} /></View>
        <View style={s.period}><View><Text style={s.periodTitle}>{range === 'day' ? 'Bugün' : range === 'week' ? 'Son 7 gün' : 'Son 30 gün'}</Text><Text style={s.periodText}>{dateLabel(report.date_from)} — {dateLabel(report.date_to)}</Text></View><Ionicons name="calendar" size={29} color={colors.cyan} /></View>
        {report.range_was_limited ? <Panel style={s.warning}><Ionicons name="information-circle" size={22} color={colors.orange} /><Text style={s.warningText}>Paket rapor gün sınırı nedeniyle seçilen tarih aralığı kısaltıldı.</Text></Panel> : null}

        <CollapsibleCategory title="Genel performans özeti" subtitle="Geçiş, tamamlama, ziyaretçi, süre ve finans göstergeleri" badge={`${numberValue(report.summary.courier_total)} geçiş`} icon="speedometer" tone={colors.cyan} open={open.overview} onToggle={() => toggle('overview')}>
          <View style={s.metrics}><MetricCard label="Kurye geçişi" value={String(numberValue(report.summary.courier_total))} icon="navigate" tone={colors.cyan} /><MetricCard label="Tamamlanan" value={String(numberValue(report.summary.completed))} icon="checkmark-done" tone={colors.green} /><MetricCard label="Ziyaretçi" value={String(numberValue(report.summary.visitor_total))} icon="people" tone={colors.orange} /></View>
          <Panel style={s.summary} gradient><Line label="Onay oranı" value={`%${numberValue(report.summary.approval_rate)}`} /><Line label="Tamamlama oranı" value={`%${numberValue(report.summary.completion_rate)}`} /><Line label="Ortalama giriş süresi" value={`${numberValue(report.summary.average_completion_minutes)} dk`} /><Line label="Akıllı Geçiş oranı" value={`%${numberValue(report.summary.airpass_rate)}`} /><Line label="Finans bakiyesi" value={money(report.summary.balance)} /><Line label="Ödenmemiş aidat" value={money(report.summary.dues_unpaid)} /></Panel>
        </CollapsibleCategory>

        <CollapsibleCategory title="Kurye giriş ve teslimat ayrıntıları" subtitle="Karta dokunarak büyük ekranda bütün adres ve saat detaylarını aç" badge={`${entries.length} kayıt`} icon="document-text" tone={colors.orange} open={open.entries} onToggle={() => toggle('entries')}>
          {visibleEntries.length ? <View style={s.entryList}>{visibleEntries.map((item) => <AnimatedPressable key={item.id} onPress={() => openDetail(item)}><Panel style={s.entryCard} gradient><View style={s.entryTop}><View style={s.entryIcon}><Ionicons name={item.status === 'completed' ? 'checkmark-done' : item.status === 'arrived' ? 'location' : 'time'} size={26} color={item.status === 'completed' ? colors.green : item.status === 'arrived' ? colors.cyan : colors.orange} /></View><View style={s.copy}><Text style={s.entryName}>{item.courier_name}</Text><Text style={s.entryMeta}>{item.platform} • {item.courier_plate || 'Plaka yok'} • {item.gate}</Text></View><View style={s.detailsHint}><Text style={s.detailsHintText}>DETAY</Text><Ionicons name="open-outline" size={18} color={colors.cyan} /></View></View><View style={s.addressBox}><Ionicons name="home" size={22} color={colors.orange} /><View style={s.copy}><Text style={s.addressTitle}>{item.customer_name || 'Müşteri adı yok'} • {item.block} / Kat {item.floor || '-'} / Daire {item.apartment}</Text><Text style={s.addressText}>{item.address_text || 'Adres açıklaması yok'}</Text><Text style={s.orderText}>Sipariş: {item.order_number}</Text></View></View><View style={s.timeGrid}><TimeLine label="Talep" value={item.created_at} /><TimeLine label="Kapıya geldi" value={item.arrived_at} /><TimeLine label="Giriş tamamlandı" value={item.completed_at} /></View>{item.location_verified ? <Text style={s.location}>KONUM DOĞRULANDI{item.last_distance_m != null ? ` • ${Math.round(item.last_distance_m)} m` : ''}</Text> : null}</Panel></AnimatedPressable>)}</View> : <EmptyState icon="document-text-outline" title="Bu dönemde giriş yok" description="Kurye geçişleri tamamlandıkça hangi kuryenin hangi saatte hangi adrese gittiği burada görünür." />}
          {visibleEntries.length < entries.length ? <AnimatedPressable onPress={() => setEntryLimit((value) => value + 5)}><View style={s.more}><Ionicons name="chevron-down" size={20} color={colors.cyan} /><Text style={s.moreText}>5 KAYIT DAHA GÖSTER</Text><Text style={s.moreCount}>{entries.length - visibleEntries.length} kayıt kaldı</Text></View></AnimatedPressable> : null}
        </CollapsibleCategory>

        <CollapsibleCategory title="Gün gün hareket" subtitle="Her gün oluşan kurye, tamamlanan ve ziyaretçi sayıları" badge={`${report.daily?.length ?? 0} gün`} icon="calendar" tone={colors.green} open={open.daily} onToggle={() => toggle('daily')}>
          <Panel style={s.listPanel} gradient>{(report.daily ?? []).map((item) => <ReportLine key={item.date} title={dateLabel(item.date)} value={`${item.courier} kurye • ${item.completed} tamamlandı • ${item.visitor} ziyaretçi`} tone={item.completed ? colors.green : colors.cyan} />)}</Panel>
        </CollapsibleCategory>

        <CollapsibleCategory title="Yoğun saatler" subtitle="Giriş trafiğinin en fazla olduğu saat aralıkları" badge={`${busiestHours.length} aralık`} icon="time" tone={colors.purple} open={open.hours} onToggle={() => toggle('hours')}>
          {busiestHours.length ? <Panel style={s.listPanel} gradient>{busiestHours.map((item) => <ReportLine key={item.hour} title={`${String(item.hour).padStart(2, '0')}:00 — ${String((item.hour + 1) % 24).padStart(2, '0')}:00`} value={`${item.total} geçiş`} tone={colors.purple} />)}</Panel> : <EmptyState icon="time-outline" title="Saatlik veri yok" description="Geçişler oluştuğunda yoğun saatler hesaplanır." />}
        </CollapsibleCategory>

        <CollapsibleCategory title="Kapı performansı" subtitle="Kapı bazında talep, tamamlama, ret ve ortalama süre" badge={`${report.gates?.length ?? 0} kapı`} icon="enter" tone={colors.cyan} open={open.gates} onToggle={() => toggle('gates')}>
          {report.gates?.length ? <Panel style={s.listPanel} gradient>{report.gates.map((item) => <ReportLine key={item.gate} title={item.gate} value={`${item.total} talep • ${item.completed} tamamlandı • ${item.rejected} ret • %${item.completion_rate} • ort. ${item.average_minutes} dk`} tone={colors.cyan} />)}</Panel> : <EmptyState icon="enter-outline" title="Kapı verisi yok" description="Kapı hareketleri burada listelenir." />}
        </CollapsibleCategory>

        <CollapsibleCategory title="Kurye performansı" subtitle="Kurye ve platform bazında işlem adetleri ve ortalama süre" badge={`${report.couriers?.length ?? 0} kurye`} icon="bicycle" tone={colors.green} open={open.couriers} onToggle={() => toggle('couriers')}>
          {report.couriers?.length ? <Panel style={s.listPanel} gradient>{report.couriers.map((item) => <ReportLine key={`${item.courier_name}-${item.platform}`} title={item.courier_name} value={`${item.platform} • ${item.total} talep • ${item.completed} tamamlandı • ${item.rejected} ret • ort. ${item.average_minutes} dk`} tone={colors.green} />)}</Panel> : <EmptyState icon="bicycle-outline" title="Kurye verisi yok" description="Kurye geçişleri oluştuğunda burada görünür." />}
        </CollapsibleCategory>

        <CollapsibleCategory title="Güvenlik personeli işlemleri" subtitle="Kod doğrulama, giriş, ret ve karar süreleri" badge={`${report.security?.length ?? 0} personel`} icon="shield-checkmark" tone={colors.orange} open={open.security} onToggle={() => toggle('security')}>
          {report.security?.length ? <Panel style={s.listPanel} gradient>{report.security.map((item) => <ReportLine key={item.full_name} title={item.full_name} value={`${item.total_actions} işlem • ${item.completed} giriş • ${item.approved} onay • ${item.rejected} ret • ort. ${item.average_decision_minutes} dk`} tone={colors.orange} />)}</Panel> : <EmptyState icon="shield-outline" title="Personel işlemi yok" description="Kod doğrulama, ret ve tamamlama hareketleri burada personel bazında listelenir." />}
        </CollapsibleCategory>

        <CollapsibleCategory title="Paket kullanımı ve rapor dışa aktarma" subtitle="Kapı, personel, sakin ve aylık geçiş limitleri" badge={report.plan.name} icon="analytics" tone={colors.magenta} open={open.usage} onToggle={() => toggle('usage')}>
          <Usage usage={report.usage} />
          <AnimatedPressable onPress={() => void exportReport()} disabled={working || !report.plan.allow_export}><LinearGradient colors={report.plan.allow_export ? gradients.primary : (['#3B4D5F', '#29394A'] as const)} style={s.button}><Ionicons name="share" size={22} color={colors.white} /><Text style={s.buttonText}>{report.plan.allow_export ? 'CSV RAPORUNU PAYLAŞ' : 'DIŞA AKTARMA İÇİN PAKET GEREKLİ'}</Text></LinearGradient></AnimatedPressable>
        </CollapsibleCategory>
      </View> : null}

      {tab === 'packages' && center ? <View style={s.section}>
        <LinearGradient colors={center.effective_plan.code === 'corporate' ? gradients.management : center.effective_plan.code === 'professional' ? gradients.courier : gradients.panelColorful} style={s.hero}><Text style={s.kicker}>MEVCUT PAKET</Text><Text style={s.heroTitle}>{center.effective_plan.name}</Text><Text style={s.heroText}>{center.effective_plan.description}</Text><Text style={s.renewal}>{center.subscription?.auto_renewing ? `Google Play • ${center.subscription.billing_cycle} otomatik yenileme` : center.subscription?.status === 'trialing' ? `Deneme bitişi ${dateLabel(center.subscription.current_period_end)}` : 'Ücretsiz veya Admin tanımlı paket'}</Text></LinearGradient>
        <Usage usage={center.usage} />
        <View style={s.chips}><Chip active={cycle === 'weekly'} title="Haftalık" onPress={() => setCycle('weekly')} /><Chip active={cycle === 'monthly'} title="Aylık" onPress={() => setCycle('monthly')} /><Chip active={cycle === 'yearly'} title="Yıllık" onPress={() => setCycle('yearly')} /></View>
        <SectionTitle title="Satış paketleri" />
        <View style={s.planList}>{center.plans.map((plan, index) => <FadeInView key={plan.code} delay={index * 60}><AnimatedPressable onPress={() => setSelected(plan.code)}><Panel style={[s.plan, selected === plan.code && s.selected]} gradient><View style={s.planTop}><FloatingView style={s.planIcon} distance={3}><Ionicons name={plan.code === 'starter' ? 'leaf' : plan.code === 'professional' ? 'diamond' : 'business'} size={27} color={plan.code === 'starter' ? colors.green : plan.code === 'professional' ? colors.cyan : colors.magenta} /></FloatingView><View style={s.copy}><Text style={s.planName}>{plan.name}</Text><Text style={s.planPrice}>{money(cycle === 'weekly' ? plan.weekly_price : cycle === 'monthly' ? plan.monthly_price : plan.yearly_price, plan.currency)}{plan.code !== 'starter' ? ` / ${cycleLabel(cycle)}` : ''}</Text></View>{center.effective_plan.code === plan.code ? <Text style={s.current}>MEVCUT</Text> : selected === plan.code ? <Ionicons name="checkmark-circle" size={26} color={colors.cyan} /> : <Ionicons name="ellipse-outline" size={26} color={colors.textMuted} />}</View><Text style={s.planText}>{plan.description}</Text><View style={s.features}><Feature text={`${plan.gate_limit === 0 ? 'Sınırsız' : plan.gate_limit} kapı`} /><Feature text={`${plan.staff_limit === 0 ? 'Sınırsız' : plan.staff_limit} personel`} /><Feature text={`${plan.resident_limit === 0 ? 'Sınırsız' : plan.resident_limit} sakin`} /><Feature text={`${plan.report_days_limit} gün rapor`} /></View></Panel></AnimatedPressable></FadeInView>)}</View>
        {selectedPlan ? <GooglePlaySubscriptionButton plan={selectedPlan} cycle={cycle} scope="site" siteId={actualSiteId} onVerified={() => void load(actualSiteId, range)} /> : null}
        <Panel style={s.playNotice} gradient><Ionicons name="logo-google-playstore" size={28} color={colors.green} /><View style={s.copy}><Text style={s.noticeTitle}>Otomatik yenilenen Google Play aboneliği</Text><Text style={s.noticeText}>Seçilen haftalık, aylık veya yıllık dönem; kullanıcı Play Store’dan iptal edene kadar yenilenir. Kart bilgileri DraBornGate tarafından görülmez.</Text></View></Panel>
      </View> : null}
      {tab === 'applications' ? <View style={s.section}><SectionTitle title="Güvenlik ve site sakini başvuruları" /><SiteRoleApplicationsManager /></View> : null}
    </ScrollView>
    <GateRecordDetailsModal record={detail} title="Kurye giriş ve teslimat kaydı" onClose={() => setDetail(undefined)} />
  </>;
}

function TabButton({ active, title, icon, onPress }: { active: boolean; title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) { return <AnimatedPressable containerStyle={s.tabWrap} onPress={onPress}><View style={[s.tab, active && s.tabActive]}><Ionicons name={icon} size={22} color={active ? colors.magenta : colors.textMuted} /><Text style={[s.tabText, active && { color: colors.magenta }]}>{title}</Text></View></AnimatedPressable>; }
function RangeButton({ active, title, onPress }: { active: boolean; title: string; onPress: () => void }) { return <AnimatedPressable containerStyle={s.rangeWrap} onPress={onPress}><View style={[s.range, active && s.rangeActive]}><Text style={[s.rangeText, active && s.rangeTextActive]}>{title}</Text></View></AnimatedPressable>; }
function Chip({ active, title, onPress }: { active: boolean; title: string; onPress: () => void }) { return <AnimatedPressable containerStyle={s.chipWrap} onPress={onPress}><View style={[s.chip, active && s.chipActive]}><Text style={[s.chipText, active && { color: colors.cyan }]}>{title}</Text></View></AnimatedPressable>; }
function Line({ label, value }: { label: string; value: string }) { return <View style={s.line}><Text style={s.lineLabel}>{label}</Text><Text style={s.lineValue}>{value}</Text></View>; }
function Feature({ text }: { text: string }) { return <View style={s.feature}><Ionicons name="checkmark-circle" size={17} color={colors.green} /><Text style={s.featureText}>{text}</Text></View>; }
function TimeLine({ label, value }: { label: string; value?: string }) { return <View style={s.timeLine}><Text style={s.timeLabel}>{label}</Text><Text style={s.timeValue}>{dateTimeLabel(value)}</Text></View>; }
function ReportLine({ title, value, tone }: { title: string; value: string; tone: string }) { return <View style={s.reportLine}><View style={[s.reportDot, { backgroundColor: tone }]} /><View style={s.copy}><Text style={s.reportTitle}>{title}</Text><Text style={s.reportValue}>{value}</Text></View></View>; }
function Usage({ usage }: { usage: Center['usage'] }) { const items = [['Kapı', usage.gates], ['Personel', usage.staff], ['Sakin', usage.residents], ['Kurye / ay', usage.courier_passes_month], ['Ziyaretçi / ay', usage.visitor_passes_month]] as const; return <Panel style={s.usagePanel} gradient>{items.map(([label, item]) => { const ratio = item.limit === 0 ? 0 : Math.min(item.used / Math.max(item.limit, 1), 1); return <View key={label} style={s.usageRow}><View style={s.usageHead}><Text style={s.usageLabel}>{label}</Text><Text style={s.usageValue}>{item.used} / {item.limit === 0 ? '∞' : item.limit}</Text></View><View style={s.track}><View style={[s.fill, { width: `${ratio * 100}%` }]} /></View></View>; })}</Panel>; }

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }, muted: { color: colors.textMuted, fontSize: 14 }, content: { padding: spacing.md, paddingTop: 10, paddingBottom: 128, gap: 18 }, header: { gap: 4, paddingRight: 58 }, eyebrow: { color: colors.magenta, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, title: { color: colors.text, fontSize: 32, fontWeight: '900' }, subtitle: { color: colors.textSoft, fontSize: 14, lineHeight: 20 }, horizontal: { gap: 9, paddingRight: 8 },
  site: { minWidth: 190, minHeight: 72, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, siteActive: { borderColor: colors.magenta, backgroundColor: 'rgba(222,85,255,.08)' }, siteName: { color: colors.text, fontSize: 16, fontWeight: '900' }, siteCity: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  tabs: { flexDirection: 'row', gap: 7 }, tabWrap: { flex: 1 }, tab: { minHeight: 60, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 5 }, tabActive: { borderColor: colors.magenta, backgroundColor: 'rgba(222,85,255,.08)' }, tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' }, section: { gap: 14 },
  rangeRow: { flexDirection: 'row', gap: 7 }, rangeWrap: { flex: 1 }, range: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, rangeActive: { borderColor: colors.cyan, backgroundColor: 'rgba(55,216,255,.09)' }, rangeText: { color: colors.textMuted, fontSize: 14, fontWeight: '900' }, rangeTextActive: { color: colors.cyan }, period: { minHeight: 80, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(10,29,47,.82)', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, periodTitle: { color: colors.text, fontSize: 25, fontWeight: '900' }, periodText: { color: colors.cyan, fontSize: 15, fontWeight: '900', marginTop: 4 }, warning: { flexDirection: 'row', alignItems: 'center', gap: 8, borderColor: 'rgba(255,179,92,.4)' }, warningText: { flex: 1, color: colors.orange, fontSize: 13, lineHeight: 19 },
  metrics: { flexDirection: 'row', gap: 7 }, summary: { gap: 12 }, line: { minHeight: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, lineLabel: { color: colors.textSoft, fontSize: 15 }, lineValue: { color: colors.text, fontSize: 16, fontWeight: '900' },
  entryList: { gap: 11 }, entryCard: { gap: 12 }, entryTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, entryIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: 'rgba(55,216,255,.10)', alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, entryName: { color: colors.text, fontSize: 20, fontWeight: '900' }, entryMeta: { color: colors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 3 }, detailsHint: { minHeight: 38, borderRadius: 13, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.08)', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }, detailsHintText: { color: colors.cyan, fontSize: 9, fontWeight: '900' }, addressBox: { flexDirection: 'row', gap: 9, borderRadius: 16, backgroundColor: 'rgba(255,179,92,.08)', padding: 12 }, addressTitle: { color: colors.text, fontSize: 16, lineHeight: 23, fontWeight: '900' }, addressText: { color: colors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 4 }, orderText: { color: colors.cyan, fontSize: 13, fontWeight: '900', marginTop: 5 }, timeGrid: { gap: 8 }, timeLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, timeLabel: { color: colors.textMuted, fontSize: 14 }, timeValue: { color: colors.text, fontSize: 14, fontWeight: '900', textAlign: 'right' }, location: { color: colors.green, fontSize: 12, fontWeight: '900' },
  more: { minHeight: 58, borderRadius: 17, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, moreText: { color: colors.cyan, fontSize: 12, fontWeight: '900' }, moreCount: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  listPanel: { gap: 0 }, reportLine: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: colors.border }, reportDot: { width: 10, height: 10, borderRadius: 10 }, reportTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, reportValue: { color: colors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 4 },
  button: { minHeight: 59, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, buttonText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  hero: { borderRadius: radius.xl, padding: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' }, kicker: { color: colors.white, fontSize: 11, fontWeight: '900' }, heroTitle: { color: colors.white, fontSize: 29, fontWeight: '900', marginTop: 5 }, heroText: { color: colors.white, opacity: .84, fontSize: 15, lineHeight: 22, marginTop: 7 }, renewal: { color: colors.green, fontSize: 12, fontWeight: '900', marginTop: 10 }, chips: { flexDirection: 'row', gap: 7 }, chipWrap: { flex: 1 }, chip: { minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, chipActive: { borderColor: colors.cyan, backgroundColor: 'rgba(55,216,255,.08)' }, chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' }, planList: { gap: 11 }, plan: { gap: 11 }, selected: { borderColor: colors.cyan, borderWidth: 2 }, planTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, planIcon: { width: 55, height: 55, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.06)', alignItems: 'center', justifyContent: 'center' }, planName: { color: colors.text, fontSize: 20, fontWeight: '900' }, planPrice: { color: colors.cyan, fontSize: 15, fontWeight: '900', marginTop: 3 }, current: { color: colors.green, fontSize: 9, fontWeight: '900', borderWidth: 1, borderColor: colors.green, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 }, planText: { color: colors.textSoft, fontSize: 14, lineHeight: 20 }, features: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, feature: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 6 }, featureText: { color: colors.textSoft, fontSize: 12 }, playNotice: { flexDirection: 'row', gap: 12, alignItems: 'center', borderColor: 'rgba(67,231,162,.4)' }, noticeTitle: { color: colors.text, fontSize: 16, fontWeight: '900' }, noticeText: { color: colors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 4 },
  usagePanel: { gap: 13 }, usageRow: { gap: 7 }, usageHead: { flexDirection: 'row', justifyContent: 'space-between' }, usageLabel: { color: colors.textSoft, fontSize: 15 }, usageValue: { color: colors.text, fontSize: 15, fontWeight: '900' }, track: { height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,.07)', overflow: 'hidden' }, fill: { height: 8, borderRadius: 8, backgroundColor: colors.cyan },
});
