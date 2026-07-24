import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import {
  AdminSubscriptionDashboard,
  decideSubscriptionPaymentRequest,
  getAdminPaymentRequests,
  getAdminSubscriptionDashboard,
  getSubscriptionPlans,
  SubscriptionPaymentRequest,
  SubscriptionPlan,
  updateSubscriptionPlan,
} from '../lib/v030Api';
import { colors, radius } from '../theme';
import { AnimatedPressable } from './Motion';
import { Panel } from './UI';

type AdminTab = 'dashboard' | 'requests' | 'plans';

function money(value: number) {
  return `${Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`;
}

export function AdminSubscriptionCenter() {
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [dashboard, setDashboard] = useState<AdminSubscriptionDashboard>();
  const [requests, setRequests] = useState<SubscriptionPaymentRequest[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string>();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardData, requestData, planData] = await Promise.all([
        getAdminSubscriptionDashboard(),
        getAdminPaymentRequests(),
        getSubscriptionPlans(),
      ]);
      setDashboard(dashboardData);
      setRequests(requestData);
      setPlans(planData);
      setEditingPlan((current) => current ? planData.find((plan) => plan.code === current.code) ?? current : undefined);
    } catch (error) {
      Alert.alert('Admin abonelik merkezi açılamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = (request: SubscriptionPaymentRequest, status: 'approved' | 'rejected') => {
    Alert.alert(
      status === 'approved' ? 'Ödemeyi onayla' : 'Ödemeyi reddet',
      status === 'approved'
        ? `${request.site_name} için ${request.plan_name} paketi ${money(request.amount)} karşılığında aktif edilsin mi? Fatura otomatik oluşur.`
        : `${request.site_name} ödeme bildirimi reddedilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: status === 'approved' ? 'Onayla' : 'Reddet',
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            setWorkingId(request.id);
            try {
              await decideSubscriptionPaymentRequest(
                request.id,
                status,
                status === 'approved' ? 'Ödeme doğrulandı ve paket aktif edildi.' : 'Ödeme bilgileri doğrulanamadı.',
              );
              await load();
              Alert.alert(status === 'approved' ? 'Paket aktif edildi' : 'Bildirim reddedildi', status === 'approved' ? 'Abonelik ve fatura kaydı başarıyla oluşturuldu.' : 'Kullanıcıya bildirim gönderildi.');
            } catch (error) {
              Alert.alert('İşlem tamamlanamadı', error instanceof Error ? error.message : 'Tekrar dene.');
            } finally {
              setWorkingId(undefined);
            }
          },
        },
      ],
    );
  };

  const savePlan = async () => {
    if (!editingPlan) return;
    setWorkingId(editingPlan.code);
    try {
      await updateSubscriptionPlan(editingPlan);
      await load();
      Alert.alert('Paket güncellendi', `${editingPlan.name} fiyatları, limitleri ve özellikleri kaydedildi.`);
    } catch (error) {
      Alert.alert('Paket kaydedilemedi', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setWorkingId(undefined);
    }
  };

  if (loading && !dashboard) {
    return <Panel style={styles.loading} gradient><ActivityIndicator size="large" color={colors.purple} /><Text style={styles.loadingText}>Abonelik ve gelir verileri hazırlanıyor</Text></Panel>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <Tab active={tab === 'dashboard'} icon="analytics" label="Gelir" onPress={() => setTab('dashboard')} />
        <Tab active={tab === 'requests'} icon="receipt" label={`Ödemeler${dashboard?.pending_requests ? ` (${dashboard.pending_requests})` : ''}`} onPress={() => setTab('requests')} />
        <Tab active={tab === 'plans'} icon="diamond" label="Paketler" onPress={() => setTab('plans')} />
      </View>

      {tab === 'dashboard' && dashboard ? (
        <View style={styles.list}>
          <View style={styles.metrics}>
            <Metric label="Toplam gelir" value={money(dashboard.total_revenue)} icon="cash" tone={colors.green} />
            <Metric label="Bu ay" value={money(dashboard.revenue_this_month)} icon="calendar" tone={colors.cyan} />
          </View>
          <View style={styles.metrics}>
            <Metric label="Tahmini aylık" value={money(dashboard.estimated_monthly_revenue)} icon="trending-up" tone={colors.purple} />
            <Metric label="Bekleyen ödeme" value={String(dashboard.pending_requests)} icon="hourglass" tone={colors.orange} />
          </View>
          <Panel style={styles.siteSummary} gradient>
            <SiteCount label="Ücretli site" value={dashboard.paid_sites} tone={colors.green} />
            <SiteCount label="Deneme" value={dashboard.trial_sites} tone={colors.cyan} />
            <SiteCount label="Başlangıç" value={dashboard.starter_sites} tone={colors.orange} />
          </Panel>
          <Panel gradient>
            <Text style={styles.blockTitle}>Paket dağılımı</Text>
            {dashboard.plans.map((plan, index) => (
              <View key={plan.code} style={[styles.distributionRow, index < dashboard.plans.length - 1 && styles.divider]}>
                <View style={[styles.distributionIcon, { backgroundColor: plan.code === 'corporate' ? 'rgba(228,109,255,.13)' : plan.code === 'professional' ? 'rgba(55,216,255,.13)' : 'rgba(255,179,92,.13)' }]}>
                  <Ionicons name={plan.code === 'corporate' ? 'diamond' : plan.code === 'professional' ? 'sparkles' : 'leaf'} size={20} color={plan.code === 'corporate' ? colors.magenta : plan.code === 'professional' ? colors.cyan : colors.orange} />
                </View>
                <Text style={styles.distributionName}>{plan.name}</Text>
                <Text style={styles.distributionValue}>{plan.site_count} site</Text>
              </View>
            ))}
          </Panel>
          <AnimatedPressable onPress={() => void load()}><View style={styles.refresh}><Ionicons name="refresh" size={19} color={colors.cyan} /><Text style={styles.refreshText}>GELİR VERİLERİNİ YENİLE</Text></View></AnimatedPressable>
        </View>
      ) : null}

      {tab === 'requests' ? (
        <View style={styles.list}>
          {requests.length ? requests.map((request) => {
            const pending = request.status === 'pending';
            const tone = pending ? colors.orange : request.status === 'approved' ? colors.green : colors.red;
            return (
              <Panel key={request.id} style={[styles.requestCard, { borderColor: `${tone}55` }]} gradient>
                <View style={styles.requestTop}>
                  <View style={[styles.requestIcon, { backgroundColor: `${tone}17` }]}><Ionicons name="receipt" size={24} color={tone} /></View>
                  <View style={styles.copy}>
                    <Text style={styles.requestSite}>{request.site_name}</Text>
                    <Text style={styles.requestUser}>{request.requester_name} • {request.email}</Text>
                  </View>
                  <View style={[styles.status, { borderColor: `${tone}66`, backgroundColor: `${tone}12` }]}><Text style={[styles.statusText, { color: tone }]}>{pending ? 'BEKLİYOR' : request.status === 'approved' ? 'ONAYLANDI' : request.status === 'cancelled' ? 'İPTAL' : 'REDDEDİLDİ'}</Text></View>
                </View>
                <View style={styles.requestInfo}>
                  <Info label="Paket" value={`${request.plan_name} • ${request.billing_cycle === 'yearly' ? 'Yıllık' : 'Aylık'}`} />
                  <Info label="Tutar" value={money(request.amount)} tone={colors.green} />
                  <Info label="Referans" value={request.bank_reference || 'Belirtilmedi'} />
                  <Info label="Tarih" value={new Date(request.created_at).toLocaleString('tr-TR')} />
                </View>
                {request.admin_note ? <Text style={styles.adminNote}>Admin notu: {request.admin_note}</Text> : null}
                {pending ? (
                  <View style={styles.actions}>
                    <AnimatedPressable containerStyle={styles.actionWrap} onPress={() => decide(request, 'approved')} disabled={workingId === request.id}><View style={[styles.action, styles.approve]}><Ionicons name="checkmark-circle" size={20} color={colors.green} /><Text style={styles.approveText}>ÖDEMEYİ ONAYLA</Text></View></AnimatedPressable>
                    <AnimatedPressable containerStyle={styles.actionWrap} onPress={() => decide(request, 'rejected')} disabled={workingId === request.id}><View style={[styles.action, styles.reject]}><Ionicons name="close-circle" size={20} color={colors.red} /><Text style={styles.rejectText}>REDDET</Text></View></AnimatedPressable>
                  </View>
                ) : null}
              </Panel>
            );
          }) : <Panel style={styles.empty} gradient><Ionicons name="checkmark-done-circle" size={31} color={colors.green} /><Text style={styles.emptyTitle}>Ödeme bildirimi yok</Text><Text style={styles.emptyText}>Site yönetimlerinden gelen paket ödemeleri burada görünür.</Text></Panel>}
          <AnimatedPressable onPress={() => void load()}><View style={styles.refresh}><Ionicons name="refresh" size={19} color={colors.cyan} /><Text style={styles.refreshText}>ÖDEME BİLDİRİMLERİNİ YENİLE</Text></View></AnimatedPressable>
        </View>
      ) : null}

      {tab === 'plans' ? (
        <View style={styles.list}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planTabs}>
            {plans.map((plan) => (
              <AnimatedPressable key={plan.code} onPress={() => setEditingPlan({ ...plan })}>
                <View style={[styles.planChip, editingPlan?.code === plan.code && styles.planChipActive]}>
                  <Ionicons name={plan.code === 'corporate' ? 'diamond' : plan.code === 'professional' ? 'sparkles' : 'leaf'} size={18} color={editingPlan?.code === plan.code ? colors.purple : colors.textMuted} />
                  <Text style={[styles.planChipText, editingPlan?.code === plan.code && { color: colors.purple }]}>{plan.name}</Text>
                </View>
              </AnimatedPressable>
            ))}
          </ScrollView>
          {editingPlan ? <PlanEditor plan={editingPlan} onChange={setEditingPlan} onSave={() => void savePlan()} saving={workingId === editingPlan.code} /> : <Panel><Text style={styles.emptyText}>Düzenlemek için bir paket seç.</Text></Panel>}
        </View>
      ) : null}
    </View>
  );
}

function PlanEditor({ plan, onChange, onSave, saving }: { plan: SubscriptionPlan; onChange: (plan: SubscriptionPlan) => void; onSave: () => void; saving: boolean }) {
  const setText = (key: keyof SubscriptionPlan, value: string) => onChange({ ...plan, [key]: value });
  const setNumber = (key: keyof SubscriptionPlan, value: string) => onChange({ ...plan, [key]: Math.max(0, Number(value.replace(',', '.')) || 0) });
  const setBoolean = (key: keyof SubscriptionPlan, value: boolean) => onChange({ ...plan, [key]: value });
  return (
    <Panel style={styles.editor} gradient>
      <View style={styles.editorHeader}><View><Text style={styles.editorTitle}>{plan.name}</Text><Text style={styles.editorCode}>{plan.code}</Text></View><View style={[styles.status, { borderColor: plan.is_active ? 'rgba(67,231,162,.4)' : 'rgba(255,101,125,.4)' }]}><Text style={[styles.statusText, { color: plan.is_active ? colors.green : colors.red }]}>{plan.is_active ? 'AKTİF' : 'KAPALI'}</Text></View></View>
      <Field label="Paket adı" value={plan.name} onChangeText={(value) => setText('name', value)} />
      <Field label="Kısa açıklama" value={plan.tagline} onChangeText={(value) => setText('tagline', value)} />
      <Field label="Açıklama" value={plan.description} onChangeText={(value) => setText('description', value)} multiline />
      <Text style={styles.groupTitle}>FİYATLAR</Text>
      <View style={styles.fieldRow}><Field label="Aylık TL" value={String(plan.monthly_price)} onChangeText={(value) => setNumber('monthly_price', value)} keyboardType="decimal-pad" /><Field label="Yıllık TL" value={String(plan.yearly_price)} onChangeText={(value) => setNumber('yearly_price', value)} keyboardType="decimal-pad" /></View>
      <Text style={styles.groupTitle}>KULLANIM LİMİTLERİ • 0 = SINIRSIZ</Text>
      <View style={styles.fieldRow}><Field label="Site" value={String(plan.site_limit)} onChangeText={(value) => setNumber('site_limit', value)} keyboardType="numeric" /><Field label="Kapı" value={String(plan.gate_limit)} onChangeText={(value) => setNumber('gate_limit', value)} keyboardType="numeric" /><Field label="Ekip" value={String(plan.staff_limit)} onChangeText={(value) => setNumber('staff_limit', value)} keyboardType="numeric" /></View>
      <View style={styles.fieldRow}><Field label="Sakin" value={String(plan.resident_limit)} onChangeText={(value) => setNumber('resident_limit', value)} keyboardType="numeric" /><Field label="Kurye / ay" value={String(plan.monthly_courier_pass_limit)} onChangeText={(value) => setNumber('monthly_courier_pass_limit', value)} keyboardType="numeric" /><Field label="Misafir / ay" value={String(plan.monthly_visitor_pass_limit)} onChangeText={(value) => setNumber('monthly_visitor_pass_limit', value)} keyboardType="numeric" /></View>
      <View style={styles.fieldRow}><Field label="Rapor günü" value={String(plan.report_days_limit)} onChangeText={(value) => setNumber('report_days_limit', value)} keyboardType="numeric" /><Field label="Deneme günü" value={String(plan.trial_days)} onChangeText={(value) => setNumber('trial_days', value)} keyboardType="numeric" /></View>
      <Text style={styles.groupTitle}>ÖZELLİKLER</Text>
      <Toggle label="CSV dışa aktarma" value={plan.allow_export} onChange={(value) => setBoolean('allow_export', value)} />
      <Toggle label="Gelişmiş finans analizi" value={plan.advanced_finance} onChange={(value) => setBoolean('advanced_finance', value)} />
      <Toggle label="Öncelikli destek" value={plan.priority_support} onChange={(value) => setBoolean('priority_support', value)} />
      <Toggle label="Kurumsal markalama" value={plan.custom_branding} onChange={(value) => setBoolean('custom_branding', value)} />
      <Toggle label="Kullanıcılara göster" value={plan.is_public} onChange={(value) => setBoolean('is_public', value)} />
      <Toggle label="Paket aktif" value={plan.is_active} onChange={(value) => setBoolean('is_active', value)} />
      <AnimatedPressable onPress={onSave} disabled={saving}><View style={[styles.save, saving && { opacity: .5 }]}><Ionicons name="save" size={21} color={colors.background} /><Text style={styles.saveText}>{saving ? 'KAYDEDİLİYOR' : 'PAKETİ KAYDET'}</Text></View></AnimatedPressable>
    </Panel>
  );
}

function Tab({ active, icon, label, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <AnimatedPressable containerStyle={styles.tabWrap} onPress={onPress}><View style={[styles.tab, active && styles.tabActive]}><Ionicons name={icon} size={19} color={active ? colors.purple : colors.textMuted} /><Text style={[styles.tabText, active && { color: colors.purple }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text></View></AnimatedPressable>;
}

function Metric({ label, value, icon, tone }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; tone: string }) {
  return <Panel style={styles.metric} gradient><View style={[styles.metricIcon, { backgroundColor: `${tone}18` }]}><Ionicons name={icon} size={22} color={tone} /></View><Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text><Text style={styles.metricLabel}>{label}</Text></Panel>;
}

function SiteCount({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <View style={styles.siteCount}><Text style={[styles.siteCountValue, { color: tone }]}>{value}</Text><Text style={styles.siteCountLabel}>{label}</Text></View>;
}

function Info({ label, value, tone = colors.text }: { label: string; value: string; tone?: string }) {
  return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={[styles.infoValue, { color: tone }]}>{value}</Text></View>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...inputProps} multiline={multiline} placeholderTextColor={colors.textMuted} selectionColor={colors.cyan} style={[styles.input, multiline && styles.multiline]} /></View>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.toggle}><Text style={styles.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.green }} thumbColor={colors.white} /></View>;
}

const styles = StyleSheet.create({
  container: { gap: 12 }, tabs: { flexDirection: 'row', gap: 7 }, tabWrap: { flex: 1 }, tab: { minHeight: 53, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 3, padding: 5 }, tabActive: { borderColor: 'rgba(139,107,255,.48)', backgroundColor: 'rgba(139,107,255,.10)' }, tabText: { width: '100%', textAlign: 'center', color: colors.textMuted, fontSize: 10, fontWeight: '900' },
  list: { gap: 10 }, loading: { minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 10 }, loadingText: { color: colors.textSoft, fontSize: 13, fontWeight: '700' }, metrics: { flexDirection: 'row', gap: 8 }, metric: { flex: 1, minHeight: 130, alignItems: 'center', justifyContent: 'center', padding: 10 }, metricIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, metricValue: { width: '100%', color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 8, textAlign: 'center' }, metricLabel: { color: colors.textSoft, fontSize: 11, fontWeight: '800', marginTop: 3, textAlign: 'center' },
  siteSummary: { flexDirection: 'row', justifyContent: 'space-around' }, siteCount: { alignItems: 'center' }, siteCountValue: { fontSize: 24, fontWeight: '900' }, siteCountLabel: { color: colors.textSoft, fontSize: 11, fontWeight: '800', marginTop: 4 }, blockTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 8 }, distributionRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9 }, divider: { borderBottomWidth: 1, borderBottomColor: colors.border }, distributionIcon: { width: 41, height: 41, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, distributionName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '900' }, distributionValue: { color: colors.cyan, fontSize: 13, fontWeight: '900' },
  refresh: { height: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, refreshText: { color: colors.cyan, fontSize: 11, fontWeight: '900' },
  requestCard: { gap: 12 }, requestTop: { flexDirection: 'row', alignItems: 'center', gap: 9 }, requestIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, requestSite: { color: colors.text, fontSize: 16, fontWeight: '900' }, requestUser: { color: colors.textSoft, fontSize: 11, marginTop: 3 }, status: { minHeight: 29, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 }, statusText: { fontSize: 8, fontWeight: '900' }, requestInfo: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 7 }, info: { flexDirection: 'row', justifyContent: 'space-between', gap: 9 }, infoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800' }, infoValue: { flex: 1, textAlign: 'right', fontSize: 11, fontWeight: '900' }, adminNote: { color: colors.cyan, fontSize: 11, lineHeight: 17 }, actions: { flexDirection: 'row', gap: 8 }, actionWrap: { flex: 1 }, action: { minHeight: 47, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 5 }, approve: { borderColor: 'rgba(67,231,162,.4)', backgroundColor: 'rgba(67,231,162,.08)' }, reject: { borderColor: 'rgba(255,101,125,.4)', backgroundColor: 'rgba(255,101,125,.08)' }, approveText: { color: colors.green, fontSize: 10, fontWeight: '900', textAlign: 'center' }, rejectText: { color: colors.red, fontSize: 10, fontWeight: '900' }, empty: { alignItems: 'center', paddingVertical: 24 }, emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 8 }, emptyText: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4, textAlign: 'center' },
  planTabs: { gap: 8, paddingRight: 10 }, planChip: { minHeight: 43, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11 }, planChipActive: { borderColor: 'rgba(139,107,255,.5)', backgroundColor: 'rgba(139,107,255,.10)' }, planChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' }, editor: { gap: 12 }, editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, editorTitle: { color: colors.text, fontSize: 21, fontWeight: '900' }, editorCode: { color: colors.purple, fontSize: 10, fontWeight: '900', marginTop: 3 }, fieldRow: { flexDirection: 'row', gap: 7 }, field: { flex: 1, minWidth: 0 }, fieldLabel: { color: colors.textSoft, fontSize: 10, fontWeight: '900', marginBottom: 5 }, input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 14, fontWeight: '700', paddingHorizontal: 10 }, multiline: { minHeight: 83, textAlignVertical: 'top', paddingTop: 10 }, groupTitle: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: .5, marginTop: 3 }, toggle: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, toggleLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '800' }, save: { minHeight: 55, borderRadius: 17, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, saveText: { color: colors.background, fontSize: 13, fontWeight: '900' },
});
