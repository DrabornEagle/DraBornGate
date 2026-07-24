import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { PrivateImage } from '../components/PrivateImage';
import { EmptyState, LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';
import { APP_VERSION } from '../config/version';
import { useGateAdmin } from '../hooks/useGateAdmin';
import { supabase } from '../lib/supabase';
import { selectAndUploadSubscriptionReceipt } from '../lib/subscriptionMedia';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';

type MainTab = 'reports' | 'package' | 'admin';
type BillingCycle = 'monthly' | 'yearly';
type PeriodDays = 7 | 30 | 90 | 365;

type SubscriptionPlan = {
  code: string;
  name: string;
  description: string;
  monthly_price: number | string;
  yearly_price: number | string;
  currency: string;
  site_limit: number;
  gate_limit: number;
  staff_limit: number;
  resident_limit: number;
  monthly_courier_pass_limit: number;
  monthly_visitor_pass_limit: number;
  report_days_limit: number;
  allow_export: boolean;
  advanced_finance: boolean;
  priority_support: boolean;
  custom_branding: boolean;
  trial_days: number;
  is_public: boolean;
  is_active: boolean;
  sort_order: number;
};

type Subscription = {
  id: string;
  site_id: string;
  plan_code: string;
  status: 'free' | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end?: string | null;
  trial_ends_at?: string | null;
  source: string;
};

type UsageItem = { used: number; limit: number };
type Usage = {
  gates: UsageItem;
  staff: UsageItem;
  residents: UsageItem;
  courier_passes_month: UsageItem;
  visitor_passes_month: UsageItem;
};

type PaymentItem = {
  id: string;
  site_id?: string;
  site_name?: string;
  requester_name?: string;
  requester_email?: string;
  plan_code: string;
  plan_name: string;
  billing_cycle: BillingCycle;
  amount: number | string;
  currency: string;
  bank_reference?: string | null;
  receipt_path?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  invoice_number?: string | null;
  period_start?: string | null;
  period_end?: string | null;
};

type BillingSettings = {
  bank_name?: string | null;
  account_holder?: string | null;
  iban?: string | null;
  instructions?: string | null;
  is_active: boolean;
};

type SubscriptionCenter = {
  subscription: Subscription | null;
  effective_plan: SubscriptionPlan;
  plans: SubscriptionPlan[];
  payments: PaymentItem[];
  billing: BillingSettings | null;
  usage: Usage;
};

type ReportRow = Record<string, unknown>;
type ReportData = {
  date_from: string;
  date_to: string;
  requested_date_from: string;
  range_was_limited: boolean;
  plan: SubscriptionPlan;
  subscription: Subscription | null;
  summary: Record<string, number | string>;
  daily: Array<{ date: string; courier: number; completed: number; rejected: number; visitor: number }>;
  hourly: Array<{ hour: number; total: number }>;
  gates: ReportRow[];
  platforms: ReportRow[];
  couriers: ReportRow[];
  security: ReportRow[];
  finance_categories: ReportRow[];
  usage: Usage;
};

type AdminCenter = {
  summary: Record<string, number | string>;
  plans: SubscriptionPlan[];
  payments: PaymentItem[];
  subscriptions: Array<Subscription & { site_name: string; owner_email: string; plan_name: string }>;
  billing: BillingSettings | null;
};

type PlanForm = {
  code: string;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  siteLimit: string;
  gateLimit: string;
  staffLimit: string;
  residentLimit: string;
  courierLimit: string;
  visitorLimit: string;
  reportDays: string;
  trialDays: string;
  allowExport: boolean;
  advancedFinance: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: string;
};

const emptyPlanForm: PlanForm = {
  code: '', name: '', description: '', monthlyPrice: '0', yearlyPrice: '0',
  siteLimit: '1', gateLimit: '1', staffLimit: '3', residentLimit: '30',
  courierLimit: '100', visitorLimit: '50', reportDays: '30', trialDays: '0',
  allowExport: false, advancedFinance: false, prioritySupport: false,
  customBranding: false, isPublic: true, isActive: true, sortOrder: '10',
};

const statusLabels: Record<string, string> = {
  free: 'Ücretsiz', trialing: 'Deneme', active: 'Aktif', past_due: 'Ödeme gecikti',
  cancelled: 'İptal', expired: 'Sona erdi', pending: 'İnceleniyor', approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown, currency = 'TL') => `${numberValue(value).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${currency === 'TRY' ? 'TL' : currency}`;
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString('tr-TR') : 'Süresiz';
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

function dateRange(days: PeriodDays) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days + 1);
  return { from: isoDate(from), to: isoDate(to) };
}

export function ManagementProCenter() {
  const gate = useGate();
  const { isAdmin, checkingAdmin } = useGateAdmin();
  const [tab, setTab] = useState<MainTab>('reports');
  const [managedIds, setManagedIds] = useState<string[]>([]);
  const [siteId, setSiteId] = useState('');
  const [period, setPeriod] = useState<PeriodDays>(30);
  const [report, setReport] = useState<ReportData | null>(null);
  const [center, setCenter] = useState<SubscriptionCenter | null>(null);
  const [adminCenter, setAdminCenter] = useState<AdminCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlanCode, setSelectedPlanCode] = useState('professional');
  const [bankReference, setBankReference] = useState('');
  const [receiptPath, setReceiptPath] = useState('');
  const [receiptUri, setReceiptUri] = useState('');
  const [billingBank, setBillingBank] = useState('');
  const [billingHolder, setBillingHolder] = useState('');
  const [billingIban, setBillingIban] = useState('');
  const [billingInstructions, setBillingInstructions] = useState('');
  const [billingActive, setBillingActive] = useState(false);
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlanForm);
  const [adminNote, setAdminNote] = useState('');

  const managedSites = useMemo(() => gate.sites.filter((site) => managedIds.includes(site.id)), [gate.sites, managedIds]);
  const selectedSite = managedSites.find((site) => site.id === siteId) ?? managedSites[0];
  const actualSiteId = selectedSite?.id ?? '';

  const loadManaged = useCallback(async () => {
    const { data, error } = await supabase.rpc('dkd_gate_list_my_managed_site_ids');
    if (error) throw error;
    const ids = Array.isArray(data) ? data.filter((item): item is string => typeof item === 'string') : [];
    setManagedIds(ids);
    setSiteId((current) => current && ids.includes(current) ? current : ids[0] ?? '');
    return ids;
  }, []);

  const loadReport = useCallback(async (targetSiteId: string, days: PeriodDays) => {
    if (!targetSiteId) {
      setReport(null);
      return;
    }
    const range = dateRange(days);
    const { data, error } = await supabase.rpc('dkd_gate_get_site_report', {
      p_site_id: targetSiteId,
      p_date_from: range.from,
      p_date_to: range.to,
    });
    if (error) throw error;
    setReport(data as ReportData);
  }, []);

  const loadSubscription = useCallback(async (targetSiteId: string) => {
    if (!targetSiteId) {
      setCenter(null);
      return;
    }
    const { data, error } = await supabase.rpc('dkd_gate_get_subscription_center', { p_site_id: targetSiteId });
    if (error) throw error;
    const next = data as SubscriptionCenter;
    setCenter(next);
    if (!next.plans.some((plan) => plan.code === selectedPlanCode && plan.code !== 'starter')) {
      setSelectedPlanCode(next.plans.find((plan) => plan.code !== 'starter')?.code ?? 'professional');
    }
  }, [selectedPlanCode]);

  const syncAdminForm = useCallback((data: AdminCenter) => {
    const billing = data.billing;
    setBillingBank(billing?.bank_name ?? '');
    setBillingHolder(billing?.account_holder ?? '');
    setBillingIban(billing?.iban ?? '');
    setBillingInstructions(billing?.instructions ?? '');
    setBillingActive(Boolean(billing?.is_active));
  }, []);

  const loadAdmin = useCallback(async () => {
    if (!isAdmin) {
      setAdminCenter(null);
      return;
    }
    const { data, error } = await supabase.rpc('dkd_gate_admin_get_monetization_center');
    if (error) throw error;
    const next = data as AdminCenter;
    setAdminCenter(next);
    syncAdminForm(next);
  }, [isAdmin, syncAdminForm]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const ids = await loadManaged();
      const target = siteId && ids.includes(siteId) ? siteId : ids[0] ?? '';
      await Promise.all([loadReport(target, period), loadSubscription(target), isAdmin ? loadAdmin() : Promise.resolve()]);
    } catch (error) {
      Alert.alert('v0.3 merkezi yüklenemedi', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, loadAdmin, loadManaged, loadReport, loadSubscription, period, siteId]);

  useEffect(() => {
    void loadManaged().catch(() => undefined);
  }, [loadManaged]);

  useEffect(() => {
    if (!actualSiteId) return;
    setLoading(true);
    void Promise.all([loadReport(actualSiteId, period), loadSubscription(actualSiteId), isAdmin ? loadAdmin() : Promise.resolve()])
      .catch((error) => Alert.alert('Veriler alınamadı', error instanceof Error ? error.message : 'Tekrar dene.'))
      .finally(() => setLoading(false));
  }, [actualSiteId, isAdmin, loadAdmin, loadReport, loadSubscription, period]);

  const run = async (work: () => Promise<unknown>, success: string, refreshAdmin = false) => {
    setWorking(true);
    try {
      await work();
      await Promise.all([loadSubscription(actualSiteId), loadReport(actualSiteId, period), refreshAdmin && isAdmin ? loadAdmin() : Promise.resolve()]);
      Alert.alert('Tamamlandı', success);
    } catch (error) {
      Alert.alert('İşlem tamamlanamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setWorking(false);
    }
  };

  const exportCsv = async () => {
    if (!actualSiteId || !report) return;
    setWorking(true);
    try {
      const { data, error } = await supabase.rpc('dkd_gate_prepare_report_export', {
        p_site_id: actualSiteId,
        p_date_from: report.date_from,
        p_date_to: report.date_to,
      });
      if (error) throw error;
      const result = data as { csv: string; row_count: number; date_from: string; date_to: string };
      await Share.share({
        title: `DraBornGate ${selectedSite?.name ?? 'Site'} Raporu`,
        message: result.csv,
      });
      Alert.alert('Rapor hazır', `${result.row_count} kayıt CSV biçiminde paylaşım ekranına gönderildi.`);
    } catch (error) {
      Alert.alert('Rapor dışa aktarılamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setWorking(false);
    }
  };

  const chooseReceipt = async () => {
    if (!gate.user || !actualSiteId) return;
    setWorking(true);
    try {
      const result = await selectAndUploadSubscriptionReceipt(gate.user.id, actualSiteId);
      if (result) {
        setReceiptPath(result.path);
        setReceiptUri(result.uri);
      }
    } catch (error) {
      Alert.alert('Dekont yüklenemedi', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setWorking(false);
    }
  };

  const submitPayment = () => run(async () => {
    const { error } = await supabase.rpc('dkd_gate_submit_subscription_payment', {
      p_site_id: actualSiteId,
      p_plan_code: selectedPlanCode,
      p_billing_cycle: billingCycle,
      p_bank_reference: bankReference.trim() || null,
      p_receipt_path: receiptPath,
    });
    if (error) throw error;
    setBankReference('');
    setReceiptPath('');
    setReceiptUri('');
  }, 'Dekont ve paket talebiniz Admin incelemesine gönderildi.', true);

  const saveBilling = () => run(async () => {
    const { error } = await supabase.rpc('dkd_gate_admin_update_billing_settings', {
      p_bank_name: billingBank.trim(),
      p_account_holder: billingHolder.trim(),
      p_iban: billingIban.trim(),
      p_instructions: billingInstructions.trim(),
      p_is_active: billingActive,
    });
    if (error) throw error;
  }, 'Banka ve ödeme bilgileri güncellendi.', true);

  const editPlan = (plan: SubscriptionPlan) => setPlanForm({
    code: plan.code,
    name: plan.name,
    description: plan.description,
    monthlyPrice: String(plan.monthly_price),
    yearlyPrice: String(plan.yearly_price),
    siteLimit: String(plan.site_limit),
    gateLimit: String(plan.gate_limit),
    staffLimit: String(plan.staff_limit),
    residentLimit: String(plan.resident_limit),
    courierLimit: String(plan.monthly_courier_pass_limit),
    visitorLimit: String(plan.monthly_visitor_pass_limit),
    reportDays: String(plan.report_days_limit),
    trialDays: String(plan.trial_days),
    allowExport: plan.allow_export,
    advancedFinance: plan.advanced_finance,
    prioritySupport: plan.priority_support,
    customBranding: plan.custom_branding,
    isPublic: plan.is_public,
    isActive: plan.is_active,
    sortOrder: String(plan.sort_order),
  });

  const savePlan = () => run(async () => {
    const { error } = await supabase.rpc('dkd_gate_admin_upsert_subscription_plan', {
      p_code: planForm.code.trim(), p_name: planForm.name.trim(), p_description: planForm.description.trim(),
      p_monthly_price: numberValue(planForm.monthlyPrice), p_yearly_price: numberValue(planForm.yearlyPrice),
      p_site_limit: numberValue(planForm.siteLimit), p_gate_limit: numberValue(planForm.gateLimit),
      p_staff_limit: numberValue(planForm.staffLimit), p_resident_limit: numberValue(planForm.residentLimit),
      p_monthly_courier_pass_limit: numberValue(planForm.courierLimit),
      p_monthly_visitor_pass_limit: numberValue(planForm.visitorLimit),
      p_report_days_limit: numberValue(planForm.reportDays), p_allow_export: planForm.allowExport,
      p_advanced_finance: planForm.advancedFinance, p_priority_support: planForm.prioritySupport,
      p_custom_branding: planForm.customBranding, p_trial_days: numberValue(planForm.trialDays),
      p_is_public: planForm.isPublic, p_is_active: planForm.isActive, p_sort_order: numberValue(planForm.sortOrder),
    });
    if (error) throw error;
    setPlanForm(emptyPlanForm);
  }, 'Paket fiyatları, limitleri ve özellikleri kaydedildi.', true);

  const decidePayment = (payment: PaymentItem, status: 'approved' | 'rejected') => Alert.alert(
    status === 'approved' ? 'Ödemeyi onayla' : 'Ödemeyi reddet',
    `${payment.site_name ?? 'Site'} • ${payment.plan_name} • ${money(payment.amount, payment.currency)}`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: status === 'approved' ? 'Onayla' : 'Reddet',
        style: status === 'rejected' ? 'destructive' : 'default',
        onPress: () => void run(async () => {
          const { error } = await supabase.rpc('dkd_gate_admin_decide_subscription_payment', {
            p_request_id: payment.id,
            p_status: status,
            p_admin_note: adminNote.trim() || null,
          });
          if (error) throw error;
          setAdminNote('');
        }, status === 'approved' ? 'Paket aktif edildi ve tahsilat belgesi oluşturuldu.' : 'Ödeme talebi reddedildi.', true),
      },
    ],
  );

  const setSubscription = (subscription: AdminCenter['subscriptions'][number], planCode: string, status: 'free' | 'active', days: number) => run(async () => {
    const { error } = await supabase.rpc('dkd_gate_admin_set_site_subscription', {
      p_site_id: subscription.site_id,
      p_plan_code: planCode,
      p_status: status,
      p_days: days,
      p_notes: 'DraBornGate v0.3 Admin panelinden düzenlendi.',
    });
    if (error) throw error;
  }, status === 'free' ? 'Site Başlangıç paketine geçirildi.' : `Site ${days} gün süreyle ${planCode} paketine geçirildi.`, true);

  if (checkingAdmin || (loading && !report && !center)) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.magenta} /><Text style={styles.loadingTitle}>v0.3 profesyonel merkez hazırlanıyor</Text><Text style={styles.loadingText}>Raporlar, paketler ve gelir sistemi yükleniyor.</Text></View>;
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadAll()} tintColor={colors.magenta} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <FadeInView style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>PROFESYONEL YÖNETİM MERKEZİ</Text>
          <Text style={styles.title}>DraBornGate v{APP_VERSION}</Text>
          <Text style={styles.subtitle}>Raporlama • Paketler • Abonelik • Gelir Takibi</Text>
        </View>
        <LiveBadge label="v0.3" />
      </FadeInView>

      {managedSites.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
          {managedSites.map((site) => <Choice key={site.id} active={site.id === actualSiteId} title={site.name} subtitle={`${site.city || 'Şehir yok'}${site.isDemo ? ' • ÖRNEK' : ''}`} icon={site.isDemo ? 'flask' : 'business'} onPress={() => setSiteId(site.id)} />)}
        </ScrollView>
      ) : <EmptyState icon="business-outline" title="Yönetilen site bulunamadı" description="Site Yönetimi başvurunuz onaylandığında rapor ve paket merkezi açılır." />}

      <View style={styles.tabs}>
        <TabButton active={tab === 'reports'} icon="analytics" title="Raporlar" onPress={() => setTab('reports')} />
        <TabButton active={tab === 'package'} icon="diamond" title="Paketim" onPress={() => setTab('package')} />
        {isAdmin ? <TabButton active={tab === 'admin'} icon="settings" title="Admin" onPress={() => setTab('admin')} /> : null}
      </View>

      {tab === 'reports' && report ? <ReportsView report={report} period={period} setPeriod={setPeriod} working={working} onExport={() => void exportCsv()} /> : null}
      {tab === 'reports' && !report && actualSiteId ? <EmptyState icon="analytics-outline" title="Rapor oluşturulamadı" description="Ekranı aşağı çekerek verileri yeniden yükleyebilirsin." /> : null}

      {tab === 'package' && center ? (
        <PackageView
          center={center}
          cycle={billingCycle}
          setCycle={setBillingCycle}
          selectedPlanCode={selectedPlanCode}
          setSelectedPlanCode={setSelectedPlanCode}
          bankReference={bankReference}
          setBankReference={setBankReference}
          receiptPath={receiptPath}
          receiptUri={receiptUri}
          working={working}
          onChooseReceipt={() => void chooseReceipt()}
          onSubmit={submitPayment}
          onStartTrial={() => void run(async () => {
            const { error } = await supabase.rpc('dkd_gate_start_site_trial', { p_site_id: actualSiteId, p_plan_code: selectedPlanCode });
            if (error) throw error;
          }, 'Ücretsiz profesyonel deneme paketi başlatıldı.')}
          onCancelPayment={(id) => void run(async () => {
            const { error } = await supabase.rpc('dkd_gate_cancel_subscription_payment', { p_request_id: id });
            if (error) throw error;
          }, 'Bekleyen ödeme talebi iptal edildi.', true)}
        />
      ) : null}

      {tab === 'admin' && isAdmin && adminCenter ? (
        <AdminView
          data={adminCenter}
          billingBank={billingBank} setBillingBank={setBillingBank}
          billingHolder={billingHolder} setBillingHolder={setBillingHolder}
          billingIban={billingIban} setBillingIban={setBillingIban}
          billingInstructions={billingInstructions} setBillingInstructions={setBillingInstructions}
          billingActive={billingActive} setBillingActive={setBillingActive}
          onSaveBilling={saveBilling}
          planForm={planForm} setPlanForm={setPlanForm}
          onEditPlan={editPlan} onSavePlan={savePlan}
          adminNote={adminNote} setAdminNote={setAdminNote}
          onDecidePayment={decidePayment}
          onSetSubscription={setSubscription}
          working={working}
        />
      ) : null}
    </ScrollView>
  );
}

function ReportsView({ report, period, setPeriod, working, onExport }: { report: ReportData; period: PeriodDays; setPeriod: (value: PeriodDays) => void; working: boolean; onExport: () => void }) {
  const summary = report.summary;
  const maxDaily = Math.max(1, ...report.daily.map((item) => numberValue(item.courier) + numberValue(item.visitor)));
  const maxHourly = Math.max(1, ...report.hourly.map((item) => numberValue(item.total)));
  return <View style={styles.sectionGap}>
    <SectionTitle title="Tarih aralığı" action={`${dateLabel(report.date_from)} — ${dateLabel(report.date_to)}`} />
    <View style={styles.chips}>{([7, 30, 90, 365] as PeriodDays[]).map((days) => <Chip key={days} active={period === days} label={`${days} Gün`} onPress={() => setPeriod(days)} />)}</View>
    {report.range_was_limited ? <Panel style={styles.warning}><Ionicons name="information-circle" size={22} color={colors.orange} /><Text style={styles.warningText}>Seçilen tarih aralığı, {report.plan.name} paketinin {report.plan.report_days_limit} günlük rapor sınırına göre düzenlendi.</Text></Panel> : null}

    <View style={styles.metricGrid}>
      <MetricCard label="Kurye geçişi" value={String(numberValue(summary.courier_total))} icon="bicycle" tone={colors.cyan} />
      <MetricCard label="Tamamlanan" value={String(numberValue(summary.completed))} icon="checkmark-done" tone={colors.green} />
      <MetricCard label="Ziyaretçi" value={String(numberValue(summary.visitor_total))} icon="people" tone={colors.orange} />
    </View>
    <View style={styles.metricGrid}>
      <MetricCard label="Onay oranı" value={`%${numberValue(summary.approval_rate)}`} icon="shield-checkmark" tone={colors.green} />
      <MetricCard label="Akıllı Geçiş" value={`%${numberValue(summary.airpass_rate)}`} icon="navigate" tone={colors.cyan} />
      <MetricCard label="Aidat tahsilatı" value={`%${numberValue(summary.dues_collection_rate)}`} icon="wallet" tone={colors.purple} />
    </View>

    <SectionTitle title="Operasyon özeti" />
    <Panel style={styles.summaryPanel} gradient>
      <StatLine label="Ortalama onay süresi" value={`${numberValue(summary.average_approval_minutes)} dakika`} />
      <StatLine label="Ortalama tamamlama" value={`${numberValue(summary.average_completion_minutes)} dakika`} />
      <StatLine label="Reddedilen geçiş" value={String(numberValue(summary.rejected))} tone={colors.red} />
      <StatLine label="Finans bakiyesi" value={money(summary.balance)} tone={numberValue(summary.balance) >= 0 ? colors.green : colors.red} />
      <StatLine label="Ödenmemiş aidat" value={money(summary.dues_unpaid)} tone={colors.orange} />
    </Panel>

    <SectionTitle title="Günlük yoğunluk" />
    <Panel style={styles.chart} gradient>{report.daily.map((item) => <BarRow key={item.date} label={new Date(item.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })} value={numberValue(item.courier) + numberValue(item.visitor)} max={maxDaily} detail={`${item.courier} kurye • ${item.visitor} misafir`} tone={colors.cyan} />)}</Panel>

    <SectionTitle title="Saatlik kurye yoğunluğu" />
    <Panel style={styles.hourChart} gradient>{report.hourly.map((item) => <View key={item.hour} style={styles.hourColumn}><View style={styles.hourTrack}><View style={[styles.hourFill, { height: `${Math.max(3, numberValue(item.total) / maxHourly * 100)}%` }]} /></View><Text style={styles.hourLabel}>{String(item.hour).padStart(2, '0')}</Text></View>)}</Panel>

    <ReportTable title="Kapı performansı" rows={report.gates} primary="gate" values={[['total', 'Toplam'], ['completed', 'Tamamlanan'], ['completion_rate', 'Başarı %'], ['average_minutes', 'Ort. dk']]} />
    <ReportTable title="Teslimat platformları" rows={report.platforms} primary="platform" values={[['total', 'Toplam'], ['completed', 'Tamamlanan'], ['rejected', 'Reddedilen']]} />
    <ReportTable title="Kurye performansı" rows={report.couriers} primary="courier_name" secondary="platform" values={[['total', 'Toplam'], ['completed', 'Tamamlanan'], ['average_minutes', 'Ort. dk']]} />
    <ReportTable title="Güvenlik performansı" rows={report.security} primary="full_name" values={[['approved', 'Onay'], ['rejected', 'Red'], ['completed', 'Giriş'], ['average_decision_minutes', 'Karar dk']]} />
    <ReportTable title="Finans kategorileri" rows={report.finance_categories} primary="category" values={[['income', 'Gelir'], ['expense', 'Gider'], ['balance', 'Bakiye']]} moneyKeys={['income', 'expense', 'balance']} />

    <SectionTitle title="Paket kullanımı" />
    <Panel style={styles.usagePanel} gradient><UsageRows usage={report.usage} /></Panel>

    <AnimatedPressable onPress={onExport} disabled={working || !report.plan.allow_export}>
      <LinearGradient colors={report.plan.allow_export ? gradients.primary : ['#3B4D5F', '#29394A']} style={styles.primaryButton}>
        <Ionicons name="download" size={21} color={colors.white} />
        <Text style={styles.primaryButtonText}>{report.plan.allow_export ? 'CSV RAPORUNU PAYLAŞ' : 'CSV İÇİN PROFESYONEL PAKET GEREKLİ'}</Text>
      </LinearGradient>
    </AnimatedPressable>
  </View>;
}

function PackageView(props: {
  center: SubscriptionCenter; cycle: BillingCycle; setCycle: (value: BillingCycle) => void;
  selectedPlanCode: string; setSelectedPlanCode: (value: string) => void;
  bankReference: string; setBankReference: (value: string) => void;
  receiptPath: string; receiptUri: string; working: boolean;
  onChooseReceipt: () => void; onSubmit: () => void; onStartTrial: () => void;
  onCancelPayment: (id: string) => void;
}) {
  const { center, cycle, setCycle, selectedPlanCode, setSelectedPlanCode, bankReference, setBankReference, receiptPath, receiptUri, working, onChooseReceipt, onSubmit, onStartTrial, onCancelPayment } = props;
  const subscription = center.subscription;
  const plan = center.effective_plan;
  const selectedPlan = center.plans.find((item) => item.code === selectedPlanCode);
  const pending = center.payments.find((item) => item.status === 'pending');
  const trialAvailable = plan.code === 'starter' && center.plans.some((item) => item.code === selectedPlanCode && item.trial_days > 0);
  return <View style={styles.sectionGap}>
    <LinearGradient colors={plan.code === 'corporate' ? gradients.management : plan.code === 'professional' ? gradients.courier : gradients.panelColorful} style={styles.packageHero}>
      <View style={styles.packageHeroTop}><View><Text style={styles.packageKicker}>MEVCUT PAKET</Text><Text style={styles.packageTitle}>{plan.name}</Text></View><View style={styles.packageIcon}><Ionicons name={plan.code === 'starter' ? 'leaf' : plan.code === 'professional' ? 'diamond' : 'business'} size={34} color={colors.white} /></View></View>
      <Text style={styles.packageDescription}>{plan.description}</Text>
      <View style={styles.packageStatus}><Text style={styles.packageStatusText}>{statusLabels[subscription?.status ?? 'free'] ?? subscription?.status}</Text><Text style={styles.packageEnd}>{subscription?.status === 'trialing' ? `Deneme bitişi: ${dateLabel(subscription.trial_ends_at)}` : subscription?.status === 'active' ? `Paket bitişi: ${dateLabel(subscription.current_period_end)}` : 'Temel özellikler sürekli açık'}</Text></View>
    </LinearGradient>

    <SectionTitle title="Kullanım ve limitler" />
    <Panel style={styles.usagePanel} gradient><UsageRows usage={center.usage} /></Panel>

    <SectionTitle title="Paketler" />
    <View style={styles.list}>{center.plans.map((item) => <PlanCard key={item.code} plan={item} selected={selectedPlanCode === item.code} current={plan.code === item.code} cycle={cycle} onPress={() => item.code !== 'starter' && setSelectedPlanCode(item.code)} />)}</View>
    <View style={styles.chips}><Chip active={cycle === 'monthly'} label="Aylık" onPress={() => setCycle('monthly')} /><Chip active={cycle === 'yearly'} label="Yıllık" onPress={() => setCycle('yearly')} /></View>

    {trialAvailable && selectedPlan ? <AnimatedPressable onPress={onStartTrial} disabled={working}><LinearGradient colors={gradients.success} style={styles.primaryButton}><Ionicons name="sparkles" size={21} color={colors.background} /><Text style={[styles.primaryButtonText, { color: colors.background }]}>{selectedPlan.trial_days} GÜN ÜCRETSİZ DENE</Text></LinearGradient></AnimatedPressable> : null}

    {selectedPlan && selectedPlan.code !== 'starter' ? <>
      <SectionTitle title="Havale / FAST ile paket al" />
      {center.billing?.is_active ? <Panel style={styles.billingPanel} gradient>
        <StatLine label="Banka" value={center.billing.bank_name || '-'} />
        <StatLine label="Hesap sahibi" value={center.billing.account_holder || '-'} />
        <StatLine label="IBAN" value={center.billing.iban || '-'} tone={colors.cyan} />
        {center.billing.instructions ? <Text style={styles.instructions}>{center.billing.instructions}</Text> : null}
        <View style={styles.priceBox}><Text style={styles.priceLabel}>{selectedPlan.name} • {cycle === 'monthly' ? 'Aylık' : 'Yıllık'}</Text><Text style={styles.priceValue}>{money(cycle === 'monthly' ? selectedPlan.monthly_price : selectedPlan.yearly_price, selectedPlan.currency)}</Text></View>
        <Field label="Banka işlem / açıklama numarası" value={bankReference} onChangeText={setBankReference} placeholder="İsteğe bağlı" />
        {receiptUri ? <View style={styles.receiptPreview}><Text style={styles.receiptReady}>Dekont seçildi ve güvenli alana yüklendi</Text></View> : null}
        <AnimatedPressable onPress={onChooseReceipt} disabled={working}><View style={styles.outlineButton}><Ionicons name="receipt" size={21} color={colors.cyan} /><Text style={styles.outlineButtonText}>{receiptPath ? 'DEKONTU DEĞİŞTİR' : 'DEKONT GÖRSELİ SEÇ'}</Text></View></AnimatedPressable>
        <AnimatedPressable onPress={onSubmit} disabled={working || !receiptPath || Boolean(pending)}><LinearGradient colors={!receiptPath || pending ? ['#3B4D5F', '#29394A'] : gradients.primary} style={styles.primaryButton}><Ionicons name="paper-plane" size={21} color={colors.white} /><Text style={styles.primaryButtonText}>{pending ? 'ÖDEME TALEBİ İNCELENİYOR' : 'PAKET TALEBİNİ GÖNDER'}</Text></LinearGradient></AnimatedPressable>
      </Panel> : <Panel style={styles.warning}><Ionicons name="hourglass" size={22} color={colors.orange} /><Text style={styles.warningText}>Admin henüz banka ve IBAN bilgilerini etkinleştirmedi. Paket talebi şu anda alınmıyor.</Text></Panel>}
    </> : null}

    <SectionTitle title="Ödeme ve belge geçmişi" action={`${center.payments.length} kayıt`} />
    {center.payments.length ? <View style={styles.list}>{center.payments.map((item) => <Panel key={item.id} style={styles.paymentCard} gradient>
      <View style={styles.paymentHeader}><View style={[styles.paymentIcon, { backgroundColor: item.status === 'approved' ? 'rgba(67,231,162,.14)' : item.status === 'rejected' ? 'rgba(255,101,125,.14)' : 'rgba(255,179,92,.14)' }]}><Ionicons name={item.status === 'approved' ? 'checkmark-circle' : item.status === 'rejected' ? 'close-circle' : 'time'} size={24} color={item.status === 'approved' ? colors.green : item.status === 'rejected' ? colors.red : colors.orange} /></View><View style={styles.copy}><Text style={styles.itemTitle}>{item.plan_name} • {item.billing_cycle === 'monthly' ? 'Aylık' : 'Yıllık'}</Text><Text style={styles.itemText}>{money(item.amount, item.currency)} • {dateLabel(item.created_at)} • {statusLabels[item.status]}</Text></View></View>
      {item.invoice_number ? <Text style={styles.invoice}>Tahsilat Belgesi: {item.invoice_number} • {dateLabel(item.period_start)} — {dateLabel(item.period_end)}</Text> : null}
      {item.admin_note ? <Text style={styles.adminNote}>Admin notu: {item.admin_note}</Text> : null}
      {item.status === 'pending' ? <AnimatedPressable onPress={() => onCancelPayment(item.id)}><View style={styles.dangerOutline}><Text style={styles.dangerText}>TALEBİ İPTAL ET</Text></View></AnimatedPressable> : null}
    </Panel>)}</View> : <EmptyState icon="receipt-outline" title="Ödeme kaydı yok" description="Paket ödeme talepleri ve oluşturulan tahsilat belgeleri burada görünür." />}
  </View>;
}

function AdminView(props: {
  data: AdminCenter;
  billingBank: string; setBillingBank: (value: string) => void;
  billingHolder: string; setBillingHolder: (value: string) => void;
  billingIban: string; setBillingIban: (value: string) => void;
  billingInstructions: string; setBillingInstructions: (value: string) => void;
  billingActive: boolean; setBillingActive: (value: boolean) => void;
  onSaveBilling: () => void;
  planForm: PlanForm; setPlanForm: React.Dispatch<React.SetStateAction<PlanForm>>;
  onEditPlan: (plan: SubscriptionPlan) => void; onSavePlan: () => void;
  adminNote: string; setAdminNote: (value: string) => void;
  onDecidePayment: (payment: PaymentItem, status: 'approved' | 'rejected') => void;
  onSetSubscription: (subscription: AdminCenter['subscriptions'][number], planCode: string, status: 'free' | 'active', days: number) => void;
  working: boolean;
}) {
  const p = props;
  const summary = p.data.summary;
  const pendingPayments = p.data.payments.filter((item) => item.status === 'pending');
  return <View style={styles.sectionGap}>
    <View style={styles.metricGrid}><MetricCard label="Aylık tekrarlayan gelir" value={money(summary.monthly_recurring_revenue)} icon="trending-up" tone={colors.green} /><MetricCard label="Toplam tahsilat" value={money(summary.total_collected)} icon="cash" tone={colors.cyan} /><MetricCard label="Bekleyen ödeme" value={String(numberValue(summary.pending_payments))} icon="hourglass" tone={colors.orange} /></View>
    <View style={styles.metricGrid}><MetricCard label="Aktif abonelik" value={String(numberValue(summary.active_subscriptions))} icon="checkmark-circle" tone={colors.green} /><MetricCard label="Deneme" value={String(numberValue(summary.trials))} icon="sparkles" tone={colors.purple} /><MetricCard label="Gecikmiş" value={String(numberValue(summary.past_due))} icon="alert-circle" tone={colors.red} /></View>

    <SectionTitle title="Banka ve IBAN ayarları" />
    <Panel style={styles.form} gradient>
      <Field label="Banka adı" value={p.billingBank} onChangeText={p.setBillingBank} />
      <Field label="Hesap sahibi" value={p.billingHolder} onChangeText={p.setBillingHolder} />
      <Field label="IBAN" value={p.billingIban} onChangeText={p.setBillingIban} autoCapitalize="characters" />
      <Field label="Ödeme talimatı" value={p.billingInstructions} onChangeText={p.setBillingInstructions} multiline />
      <Toggle label="Ödeme kabulü açık" description="Kapalıysa site yönetimleri dekont gönderemez." value={p.billingActive} onValueChange={p.setBillingActive} />
      <ActionButton title="ÖDEME AYARLARINI KAYDET" icon="save" onPress={p.onSaveBilling} disabled={p.working} />
    </Panel>

    <SectionTitle title="Paket ve fiyat yönetimi" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>{p.data.plans.map((plan) => <Choice key={plan.code} active={p.planForm.code === plan.code} title={plan.name} subtitle={`${money(plan.monthly_price, plan.currency)} / ay`} icon="diamond" onPress={() => p.onEditPlan(plan)} />)}</ScrollView>
    <Panel style={styles.form} gradient>
      <View style={styles.row}><Field label="Paket kodu" value={p.planForm.code} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, code: value }))} autoCapitalize="none" /><Field label="Paket adı" value={p.planForm.name} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, name: value }))} /></View>
      <Field label="Açıklama" value={p.planForm.description} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, description: value }))} multiline />
      <View style={styles.row}><Field label="Aylık TL" value={p.planForm.monthlyPrice} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, monthlyPrice: value }))} keyboardType="decimal-pad" /><Field label="Yıllık TL" value={p.planForm.yearlyPrice} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, yearlyPrice: value }))} keyboardType="decimal-pad" /><Field label="Deneme günü" value={p.planForm.trialDays} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, trialDays: value }))} keyboardType="numeric" /></View>
      <View style={styles.row}><Field label="Site limiti" value={p.planForm.siteLimit} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, siteLimit: value }))} keyboardType="numeric" /><Field label="Kapı limiti" value={p.planForm.gateLimit} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, gateLimit: value }))} keyboardType="numeric" /><Field label="Personel limiti" value={p.planForm.staffLimit} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, staffLimit: value }))} keyboardType="numeric" /></View>
      <View style={styles.row}><Field label="Sakin limiti" value={p.planForm.residentLimit} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, residentLimit: value }))} keyboardType="numeric" /><Field label="Kurye / ay" value={p.planForm.courierLimit} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, courierLimit: value }))} keyboardType="numeric" /><Field label="Misafir / ay" value={p.planForm.visitorLimit} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, visitorLimit: value }))} keyboardType="numeric" /></View>
      <View style={styles.row}><Field label="Rapor günü" value={p.planForm.reportDays} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, reportDays: value }))} keyboardType="numeric" /><Field label="Sıralama" value={p.planForm.sortOrder} onChangeText={(value) => p.setPlanForm((old) => ({ ...old, sortOrder: value }))} keyboardType="numeric" /></View>
      <Toggle label="CSV dışa aktarma" value={p.planForm.allowExport} onValueChange={(value) => p.setPlanForm((old) => ({ ...old, allowExport: value }))} />
      <Toggle label="Gelişmiş finans" value={p.planForm.advancedFinance} onValueChange={(value) => p.setPlanForm((old) => ({ ...old, advancedFinance: value }))} />
      <Toggle label="Öncelikli destek" value={p.planForm.prioritySupport} onValueChange={(value) => p.setPlanForm((old) => ({ ...old, prioritySupport: value }))} />
      <Toggle label="Kurumsal marka özelleştirme" value={p.planForm.customBranding} onValueChange={(value) => p.setPlanForm((old) => ({ ...old, customBranding: value }))} />
      <Toggle label="Kullanıcılara göster" value={p.planForm.isPublic} onValueChange={(value) => p.setPlanForm((old) => ({ ...old, isPublic: value }))} />
      <Toggle label="Paket aktif" value={p.planForm.isActive} onValueChange={(value) => p.setPlanForm((old) => ({ ...old, isActive: value }))} />
      <ActionButton title="PAKETİ VE FİYATLARI KAYDET" icon="pricetags" onPress={p.onSavePlan} disabled={p.working || !p.planForm.code.trim() || !p.planForm.name.trim()} />
    </Panel>

    <SectionTitle title="Bekleyen ödeme talepleri" action={`${pendingPayments.length} bekliyor`} />
    <Field label="Onay / ret notu" value={p.adminNote} onChangeText={p.setAdminNote} placeholder="İsteğe bağlı" />
    {pendingPayments.length ? <View style={styles.list}>{pendingPayments.map((payment) => <Panel key={payment.id} style={styles.adminPayment} gradient>
      <View style={styles.paymentHeader}><View style={styles.paymentIcon}><Ionicons name="receipt" size={24} color={colors.orange} /></View><View style={styles.copy}><Text style={styles.itemTitle}>{payment.site_name} • {payment.plan_name}</Text><Text style={styles.itemText}>{payment.requester_name} • {payment.requester_email}</Text><Text style={styles.paymentAmount}>{money(payment.amount, payment.currency)} • {payment.billing_cycle === 'monthly' ? 'Aylık' : 'Yıllık'}</Text></View></View>
      {payment.bank_reference ? <Text style={styles.invoice}>Banka referansı: {payment.bank_reference}</Text> : null}
      {payment.receipt_path ? <PrivateImage path={payment.receipt_path} style={styles.receiptImage} /> : null}
      <View style={styles.actions}><SmallAction title="ONAYLA" icon="checkmark-circle" tone={colors.green} onPress={() => p.onDecidePayment(payment, 'approved')} /><SmallAction title="REDDET" icon="close-circle" tone={colors.red} onPress={() => p.onDecidePayment(payment, 'rejected')} /></View>
    </Panel>)}</View> : <EmptyState icon="checkmark-done-circle" title="Bekleyen ödeme yok" description="Yeni dekontlar geldiğinde burada onaylanabilir veya reddedilebilir." />}

    <SectionTitle title="Site abonelikleri" action={`${p.data.subscriptions.length} site`} />
    <View style={styles.list}>{p.data.subscriptions.map((subscription) => <Panel key={subscription.id} style={styles.subscriptionCard} gradient>
      <View style={styles.copy}><Text style={styles.itemTitle}>{subscription.site_name}</Text><Text style={styles.itemText}>{subscription.owner_email} • {subscription.plan_name} • {statusLabels[subscription.status]}</Text><Text style={styles.invoice}>Bitiş: {dateLabel(subscription.status === 'trialing' ? subscription.trial_ends_at : subscription.current_period_end)}</Text></View>
      <View style={styles.subscriptionActions}><SmallAction title="30 GÜN PRO" icon="diamond" tone={colors.cyan} onPress={() => p.onSetSubscription(subscription, 'professional', 'active', 30)} /><SmallAction title="365 GÜN KURUMSAL" icon="business" tone={colors.purple} onPress={() => p.onSetSubscription(subscription, 'corporate', 'active', 365)} /><SmallAction title="BAŞLANGIÇ" icon="leaf" tone={colors.orange} onPress={() => p.onSetSubscription(subscription, 'starter', 'free', 0)} /></View>
    </Panel>)}</View>
  </View>;
}

function PlanCard({ plan, selected, current, cycle, onPress }: { plan: SubscriptionPlan; selected: boolean; current: boolean; cycle: BillingCycle; onPress: () => void }) {
  const value = cycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
  return <AnimatedPressable onPress={onPress} disabled={plan.code === 'starter'}><Panel style={[styles.planCard, selected && styles.selectedPlan]} gradient>
    <View style={styles.planTop}><View style={[styles.planIcon, { backgroundColor: plan.code === 'starter' ? 'rgba(67,231,162,.13)' : plan.code === 'professional' ? 'rgba(55,216,255,.13)' : 'rgba(228,109,255,.13)' }]}><Ionicons name={plan.code === 'starter' ? 'leaf' : plan.code === 'professional' ? 'diamond' : 'business'} size={25} color={plan.code === 'starter' ? colors.green : plan.code === 'professional' ? colors.cyan : colors.magenta} /></View><View style={styles.copy}><Text style={styles.planName}>{plan.name}</Text><Text style={styles.planPrice}>{money(value, plan.currency)}{plan.code !== 'starter' ? cycle === 'monthly' ? ' / ay' : ' / yıl' : ''}</Text></View>{current ? <View style={styles.currentBadge}><Text style={styles.currentText}>MEVCUT</Text></View> : selected ? <Ionicons name="checkmark-circle" size={24} color={colors.cyan} /> : null}</View>
    <Text style={styles.planDescription}>{plan.description}</Text>
    <View style={styles.featureGrid}><Feature text={`${plan.gate_limit === 0 ? 'Sınırsız' : plan.gate_limit} kapı`} /><Feature text={`${plan.staff_limit === 0 ? 'Sınırsız' : plan.staff_limit} personel`} /><Feature text={`${plan.resident_limit === 0 ? 'Sınırsız' : plan.resident_limit} sakin`} /><Feature text={`${plan.report_days_limit} gün rapor`} /><Feature text={plan.monthly_courier_pass_limit === 0 ? 'Sınırsız kurye geçişi' : `${plan.monthly_courier_pass_limit} kurye / ay`} /><Feature text={plan.allow_export ? 'CSV dışa aktarma' : 'Temel rapor'} /></View>
  </Panel></AnimatedPressable>;
}

function UsageRows({ usage }: { usage: Usage }) {
  return <View style={styles.list}><UsageRow label="Kapı / giriş noktası" item={usage.gates} /><UsageRow label="Yönetim ve güvenlik" item={usage.staff} /><UsageRow label="Site sakini" item={usage.residents} /><UsageRow label="Bu ay kurye geçişi" item={usage.courier_passes_month} /><UsageRow label="Bu ay ziyaretçi" item={usage.visitor_passes_month} /></View>;
}

function UsageRow({ label, item }: { label: string; item: UsageItem }) {
  const limit = numberValue(item?.limit);
  const used = numberValue(item?.used);
  const percent = limit === 0 ? Math.min(100, used > 0 ? 18 : 0) : Math.min(100, used / Math.max(1, limit) * 100);
  return <View><View style={styles.usageHeader}><Text style={styles.usageLabel}>{label}</Text><Text style={styles.usageValue}>{used} / {limit === 0 ? 'Sınırsız' : limit}</Text></View><View style={styles.usageTrack}><View style={[styles.usageFill, { width: `${percent}%`, backgroundColor: percent >= 90 ? colors.red : percent >= 70 ? colors.orange : colors.cyan }]} /></View></View>;
}

function ReportTable({ title, rows, primary, secondary, values, moneyKeys = [] }: { title: string; rows: ReportRow[]; primary: string; secondary?: string; values: Array<[string, string]>; moneyKeys?: string[] }) {
  return <View><SectionTitle title={title} action={`${rows.length} kayıt`} />{rows.length ? <View style={styles.list}>{rows.map((row, index) => <Panel key={`${String(row[primary])}-${index}`} style={styles.tableRow} gradient><View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View><View style={styles.copy}><Text style={styles.itemTitle}>{String(row[primary] ?? '-')}</Text>{secondary ? <Text style={styles.itemText}>{String(row[secondary] ?? '')}</Text> : null}<View style={styles.valueWrap}>{values.map(([key, label]) => <Text key={key} style={styles.valueText}>{label}: <Text style={styles.valueStrong}>{moneyKeys.includes(key) ? money(row[key]) : String(row[key] ?? 0)}</Text></Text>)}</View></View></Panel>)}</View> : <EmptyState icon="stats-chart-outline" title="Rapor verisi yok" description="Seçilen tarih aralığında bu bölüm için kayıt bulunamadı." />}</View>;
}

function BarRow({ label, value, max, detail, tone }: { label: string; value: number; max: number; detail: string; tone: string }) {
  return <View style={styles.barRow}><Text style={styles.barLabel}>{label}</Text><View style={styles.barCopy}><View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.max(value ? 4 : 0, value / max * 100)}%`, backgroundColor: tone }]} /></View><Text style={styles.barDetail}>{detail}</Text></View><Text style={styles.barValue}>{value}</Text></View>;
}

function Feature({ text }: { text: string }) { return <View style={styles.feature}><Ionicons name="checkmark-circle" size={15} color={colors.green} /><Text style={styles.featureText}>{text}</Text></View>; }
function StatLine({ label, value, tone = colors.text }: { label: string; value: string; tone?: string }) { return <View style={styles.statLine}><Text style={styles.statLabel}>{label}</Text><Text style={[styles.statValue, { color: tone }]}>{value}</Text></View>; }
function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { return <AnimatedPressable onPress={onPress}><View style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></View></AnimatedPressable>; }
function TabButton({ active, icon, title, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void }) { return <AnimatedPressable containerStyle={styles.tabWrap} onPress={onPress}><View style={[styles.tab, active && styles.tabActive]}><Ionicons name={icon} size={21} color={active ? colors.magenta : colors.textMuted} /><Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text></View></AnimatedPressable>; }
function Choice({ active, title, subtitle, icon, onPress }: { active: boolean; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) { return <AnimatedPressable onPress={onPress}><View style={[styles.choice, active && styles.choiceActive]}><Ionicons name={icon} size={22} color={active ? colors.magenta : colors.textMuted} /><View style={styles.copy}><Text style={styles.choiceTitle}>{title}</Text><Text style={styles.choiceSubtitle}>{subtitle}</Text></View>{active ? <Ionicons name="checkmark-circle" size={20} color={colors.magenta} /> : null}</View></AnimatedPressable>; }
function ActionButton({ title, icon, onPress, disabled }: { title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) { return <AnimatedPressable onPress={onPress} disabled={disabled}><LinearGradient colors={disabled ? ['#3B4D5F', '#29394A'] : gradients.primary} style={styles.primaryButton}><Ionicons name={icon} size={21} color={colors.white} /><Text style={styles.primaryButtonText}>{title}</Text></LinearGradient></AnimatedPressable>; }
function SmallAction({ title, icon, tone, onPress }: { title: string; icon: keyof typeof Ionicons.glyphMap; tone: string; onPress: () => void }) { return <AnimatedPressable containerStyle={styles.smallActionWrap} onPress={onPress}><View style={[styles.smallAction, { borderColor: `${tone}66`, backgroundColor: `${tone}12` }]}><Ionicons name={icon} size={18} color={tone} /><Text style={[styles.smallActionText, { color: tone }]}>{title}</Text></View></AnimatedPressable>; }
function Toggle({ label, description, value, onValueChange }: { label: string; description?: string; value: boolean; onValueChange: (value: boolean) => void }) { return <View style={styles.toggle}><View style={styles.copy}><Text style={styles.itemTitle}>{label}</Text>{description ? <Text style={styles.itemText}>{description}</Text> : null}</View><Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.green }} thumbColor={colors.white} /></View>; }
function Field({ label, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} multiline={multiline} style={[styles.input, multiline && styles.multiline]} placeholderTextColor={colors.textMuted} selectionColor={colors.cyan} /></View>; }

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  loadingTitle: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 14, textAlign: 'center' },
  loadingText: { color: colors.textSoft, fontSize: 14, marginTop: 6, textAlign: 'center' },
  content: { padding: spacing.md, paddingTop: 13, paddingBottom: 126, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1 },
  eyebrow: { color: colors.magenta, fontSize: 13, fontWeight: '900', letterSpacing: .9 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 4 },
  horizontal: { gap: 9, paddingRight: 12 },
  choice: { minWidth: 225, minHeight: 72, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  choiceActive: { borderColor: colors.magenta, backgroundColor: 'rgba(228,109,255,.09)' },
  choiceTitle: { color: colors.text, fontSize: 15, fontWeight: '900' }, choiceSubtitle: { color: colors.textSoft, fontSize: 12, marginTop: 3 },
  tabs: { flexDirection: 'row', gap: 8 }, tabWrap: { flex: 1 },
  tab: { minHeight: 58, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabActive: { borderColor: colors.magenta, backgroundColor: 'rgba(228,109,255,.09)' },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' }, tabTextActive: { color: colors.magenta },
  sectionGap: { gap: 17 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  chipActive: { borderColor: colors.cyan, backgroundColor: 'rgba(55,216,255,.10)' },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' }, chipTextActive: { color: colors.cyan },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderColor: 'rgba(255,179,92,.38)' },
  warningText: { flex: 1, color: colors.textSoft, fontSize: 13, lineHeight: 19 },
  metricGrid: { flexDirection: 'row', gap: 8 }, summaryPanel: { gap: 0 },
  statLine: { minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  statLabel: { flex: 1, color: colors.textSoft, fontSize: 13, fontWeight: '700' }, statValue: { fontSize: 14, fontWeight: '900', textAlign: 'right' },
  chart: { gap: 12 }, barRow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, barLabel: { width: 45, color: colors.textSoft, fontSize: 10, fontWeight: '800' },
  barCopy: { flex: 1 }, barTrack: { height: 9, borderRadius: 9, backgroundColor: 'rgba(255,255,255,.06)', overflow: 'hidden' }, barFill: { height: '100%', borderRadius: 9 },
  barDetail: { color: colors.textMuted, fontSize: 9, marginTop: 4 }, barValue: { width: 28, textAlign: 'right', color: colors.text, fontSize: 12, fontWeight: '900' },
  hourChart: { minHeight: 165, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 5, gap: 2 },
  hourColumn: { flex: 1, height: 130, alignItems: 'center', justifyContent: 'flex-end' }, hourTrack: { width: '72%', height: 105, backgroundColor: 'rgba(255,255,255,.05)', borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' },
  hourFill: { width: '100%', backgroundColor: colors.purple, borderRadius: 5 }, hourLabel: { color: colors.textMuted, fontSize: 7, marginTop: 5 },
  list: { gap: 9 }, tableRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, rank: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(55,216,255,.12)', alignItems: 'center', justifyContent: 'center' }, rankText: { color: colors.cyan, fontSize: 14, fontWeight: '900' },
  itemTitle: { color: colors.text, fontSize: 15, fontWeight: '900' }, itemText: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 3 },
  valueWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 7 }, valueText: { color: colors.textMuted, fontSize: 10 }, valueStrong: { color: colors.textSoft, fontWeight: '900' },
  usagePanel: { gap: 12 }, usageHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, usageLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '800' }, usageValue: { color: colors.text, fontSize: 12, fontWeight: '900' },
  usageTrack: { height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,.06)', overflow: 'hidden', marginTop: 6 }, usageFill: { height: '100%', borderRadius: 8 },
  primaryButton: { minHeight: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 10 }, primaryButtonText: { color: colors.white, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  packageHero: { borderRadius: radius.xl, padding: 21, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' }, packageHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, packageKicker: { color: 'rgba(255,255,255,.75)', fontSize: 11, fontWeight: '900' }, packageTitle: { color: colors.white, fontSize: 30, fontWeight: '900', marginTop: 4 }, packageIcon: { width: 64, height: 64, borderRadius: 21, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  packageDescription: { color: 'rgba(255,255,255,.86)', fontSize: 13, lineHeight: 20 }, packageStatus: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, packageStatusText: { color: colors.green, fontSize: 12, fontWeight: '900' }, packageEnd: { flex: 1, color: 'rgba(255,255,255,.73)', fontSize: 11, textAlign: 'right' },
  planCard: { gap: 12 }, selectedPlan: { borderColor: colors.cyan }, planTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, planIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, planName: { color: colors.text, fontSize: 18, fontWeight: '900' }, planPrice: { color: colors.cyan, fontSize: 14, fontWeight: '900', marginTop: 3 }, planDescription: { color: colors.textSoft, fontSize: 13, lineHeight: 19 },
  currentBadge: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(67,231,162,.4)', backgroundColor: 'rgba(67,231,162,.1)', paddingHorizontal: 8, paddingVertical: 5 }, currentText: { color: colors.green, fontSize: 9, fontWeight: '900' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, feature: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 5 }, featureText: { flex: 1, color: colors.textSoft, fontSize: 10, lineHeight: 15 },
  billingPanel: { gap: 12 }, instructions: { color: colors.textSoft, fontSize: 12, lineHeight: 18, padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,179,92,.08)' }, priceBox: { borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, padding: 12 }, priceLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '800' }, priceValue: { color: colors.cyan, fontSize: 23, fontWeight: '900', marginTop: 4 },
  receiptPreview: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(67,231,162,.35)', alignItems: 'center', justifyContent: 'center', padding: 8 }, receiptReady: { color: colors.green, fontSize: 12, fontWeight: '900' },
  outlineButton: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, outlineButtonText: { color: colors.cyan, fontSize: 12, fontWeight: '900' },
  paymentCard: { gap: 10 }, paymentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, paymentIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,179,92,.13)', alignItems: 'center', justifyContent: 'center' }, invoice: { color: colors.cyan, fontSize: 11, lineHeight: 17, fontWeight: '800' }, adminNote: { color: colors.orange, fontSize: 11, lineHeight: 17 }, dangerOutline: { height: 44, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,101,125,.42)', alignItems: 'center', justifyContent: 'center' }, dangerText: { color: colors.red, fontSize: 11, fontWeight: '900' },
  form: { gap: 12 }, row: { flexDirection: 'row', gap: 8 }, field: { flex: 1 }, fieldLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '900', marginBottom: 6 }, input: { minHeight: 53, borderRadius: 15, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 11, fontSize: 14, fontWeight: '700' }, multiline: { minHeight: 88, textAlignVertical: 'top', paddingTop: 11 },
  toggle: { minHeight: 61, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminPayment: { gap: 10 }, paymentAmount: { color: colors.green, fontSize: 14, fontWeight: '900', marginTop: 5 }, receiptImage: { width: '100%', height: 220, borderRadius: 17, backgroundColor: colors.surface }, actions: { flexDirection: 'row', gap: 8 }, smallActionWrap: { flex: 1 }, smallAction: { minHeight: 44, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 7 }, smallActionText: { fontSize: 10, fontWeight: '900', textAlign: 'center' },
  subscriptionCard: { gap: 10 }, subscriptionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
});
