import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../theme';
import { AnimatedPressable, FadeInView } from './Motion';
import { MetricCard, Panel, SectionTitle } from './UI';

type PackageKind = 'site' | 'courier';
type AdminTab = 'sitePlans' | 'courierPlans' | 'siteSubscriptions' | 'courierSubscriptions';
type Plan = {
  code: string; name: string; description: string; weekly_price: number | string; monthly_price: number | string; yearly_price: number | string;
  currency: string; is_public: boolean; is_active: boolean; play_product_id?: string; play_weekly_base_plan_id?: string; play_monthly_base_plan_id?: string; play_yearly_base_plan_id?: string;
  gate_limit?: number; staff_limit?: number; resident_limit?: number; monthly_courier_pass_limit?: number; report_days_limit?: number; allow_export?: boolean;
  monthly_pass_limit?: number; priority_site_search?: boolean; advanced_history?: boolean; priority_support?: boolean;
};
type SiteSubscription = { id: string; site_id: string; site_name: string; owner_email: string; plan_code: string; status: string; billing_cycle: string; current_period_end?: string; auto_renewing?: boolean; source?: string };
type CourierSubscription = { id: string; user_id: string; email: string; plan_code: string; status: string; billing_cycle: string; current_period_end?: string; auto_renewing?: boolean; source?: string };
type Center = { summary: Record<string, number>; site_plans: Plan[]; courier_plans: Plan[]; site_subscriptions: SiteSubscription[]; courier_subscriptions: CourierSubscription[] };

const numberText = (value: unknown) => String(Number(value ?? 0) || 0);
const dateText = (value?: string) => value ? new Date(value).toLocaleDateString('tr-TR') : 'Süresiz';

export function AdminPackageCenter() {
  const [center, setCenter] = useState<Center>();
  const [tab, setTab] = useState<AdminTab>('sitePlans');
  const [editing, setEditing] = useState<{ kind: PackageKind; plan: Plan }>();
  const [working, setWorking] = useState(false);
  const load = useCallback(async () => {
    const result = await supabase.rpc('dkd_gate_admin_get_monetization_center');
    if (result.error) throw result.error;
    setCenter(result.data as Center);
  }, []);
  useEffect(() => { void load().catch((error) => Alert.alert('Paket merkezi açılamadı', error instanceof Error ? error.message : 'Tekrar dene.')); }, [load]);
  const plans = tab === 'sitePlans' ? center?.site_plans : center?.courier_plans;
  const save = async () => {
    if (!editing) return;
    const p = editing.plan;
    if (!p.name.trim()) return Alert.alert('Paket adı gerekli');
    setWorking(true);
    try {
      const params = editing.kind === 'site' ? {
        p_code: p.code, p_name: p.name.trim(), p_description: p.description.trim(), p_weekly_price: Number(p.weekly_price), p_monthly_price: Number(p.monthly_price), p_yearly_price: Number(p.yearly_price),
        p_gate_limit: Number(p.gate_limit ?? 0), p_staff_limit: Number(p.staff_limit ?? 0), p_resident_limit: Number(p.resident_limit ?? 0), p_monthly_courier_pass_limit: Number(p.monthly_courier_pass_limit ?? 0),
        p_report_days_limit: Number(p.report_days_limit ?? 30), p_allow_export: Boolean(p.allow_export), p_play_product_id: p.play_product_id || '', p_play_weekly_base_plan_id: p.play_weekly_base_plan_id || '',
        p_play_monthly_base_plan_id: p.play_monthly_base_plan_id || '', p_play_yearly_base_plan_id: p.play_yearly_base_plan_id || '', p_is_public: p.is_public, p_is_active: p.is_active,
      } : {
        p_code: p.code, p_name: p.name.trim(), p_description: p.description.trim(), p_weekly_price: Number(p.weekly_price), p_monthly_price: Number(p.monthly_price), p_yearly_price: Number(p.yearly_price),
        p_monthly_pass_limit: Number(p.monthly_pass_limit ?? 0), p_priority_site_search: Boolean(p.priority_site_search), p_advanced_history: Boolean(p.advanced_history), p_priority_support: Boolean(p.priority_support),
        p_play_product_id: p.play_product_id || '', p_play_weekly_base_plan_id: p.play_weekly_base_plan_id || '', p_play_monthly_base_plan_id: p.play_monthly_base_plan_id || '', p_play_yearly_base_plan_id: p.play_yearly_base_plan_id || '',
        p_is_public: p.is_public, p_is_active: p.is_active,
      };
      const result = await supabase.rpc(editing.kind === 'site' ? 'dkd_gate_admin_update_site_plan' : 'dkd_gate_admin_update_courier_plan', params);
      if (result.error) throw result.error;
      setEditing(undefined);
      await load();
      Alert.alert('Paket güncellendi', 'Fiyat, özellik ve Google Play ürün kimlikleri kaydedildi. Play Console fiyatları ayrıca aynı değerlerle tanımlanmalıdır.');
    } catch (error) { Alert.alert('Paket kaydedilemedi', error instanceof Error ? error.message : 'Tekrar dene.'); }
    finally { setWorking(false); }
  };
  const assignSite = async (item: SiteSubscription, planCode: string, status: 'free' | 'active', days: number) => {
    setWorking(true);
    try {
      const result = await supabase.rpc('dkd_gate_admin_set_site_subscription', { p_site_id: item.site_id, p_plan_code: planCode, p_status: status, p_days: days, p_notes: 'DraBornGate v0.3.3 Admin Profil paket merkezinden düzenlendi.' });
      if (result.error) throw result.error;
      await load();
    } catch (error) { Alert.alert('Abonelik değiştirilemedi', error instanceof Error ? error.message : 'Tekrar dene.'); }
    finally { setWorking(false); }
  };
  if (!center) return <View style={s.loading}><ActivityIndicator size="large" color={colors.magenta} /><Text style={s.soft}>Admin paket verileri hazırlanıyor</Text></View>;
  return <View style={s.root}>
    <View style={s.metrics}><MetricCard label="Site aboneliği" value={String(center.summary.active_site_subscriptions || 0)} icon="business" tone={colors.green} /><MetricCard label="Kurye aboneliği" value={String(center.summary.active_courier_subscriptions || 0)} icon="speedometer" tone={colors.cyan} /><MetricCard label="Gecikmiş" value={String(center.summary.past_due || 0)} icon="alert-circle" tone={colors.red} /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
      <Tab active={tab === 'sitePlans'} title="Site satış paketleri" onPress={() => setTab('sitePlans')} />
      <Tab active={tab === 'courierPlans'} title="Kurye satış paketleri" onPress={() => setTab('courierPlans')} />
      <Tab active={tab === 'siteSubscriptions'} title="Site abonelikleri" onPress={() => setTab('siteSubscriptions')} />
      <Tab active={tab === 'courierSubscriptions'} title="Kurye abonelikleri" onPress={() => setTab('courierSubscriptions')} />
    </ScrollView>
    {(tab === 'sitePlans' || tab === 'courierPlans') ? <View style={s.list}>{plans?.map((plan, index) => <FadeInView key={plan.code} delay={index * 50}><PlanSummary plan={plan} kind={tab === 'sitePlans' ? 'site' : 'courier'} onEdit={() => setEditing({ kind: tab === 'sitePlans' ? 'site' : 'courier', plan: { ...plan } })} /></FadeInView>)}</View> : null}
    {tab === 'siteSubscriptions' ? <View style={s.list}><SectionTitle title="Site paket yönetimi" action={`${center.site_subscriptions.length} site`} />{center.site_subscriptions.map((item) => <Panel key={item.id} style={s.subscription} gradient><Text style={s.planName}>{item.site_name}</Text><Text style={s.soft}>{item.owner_email} • {item.plan_code} • {item.status}</Text><Text style={s.mini}>{item.billing_cycle} • Bitiş {dateText(item.current_period_end)} • {item.auto_renewing ? 'Otomatik yenileniyor' : item.source === 'google_play' ? 'Yenileme kapalı' : 'Admin/deneme'}</Text><View style={s.actions}><Small title="7 GÜN PRO" tone={colors.cyan} onPress={() => void assignSite(item, 'professional', 'active', 7)} /><Small title="30 GÜN PRO" tone={colors.purple} onPress={() => void assignSite(item, 'professional', 'active', 30)} /><Small title="365 GÜN KURUMSAL" tone={colors.magenta} onPress={() => void assignSite(item, 'corporate', 'active', 365)} /><Small title="BAŞLANGIÇ" tone={colors.orange} onPress={() => void assignSite(item, 'starter', 'free', 0)} /></View></Panel>)}</View> : null}
    {tab === 'courierSubscriptions' ? <View style={s.list}><SectionTitle title="Kurye abonelikleri" action={`${center.courier_subscriptions.length} kurye`} />{center.courier_subscriptions.map((item) => <Panel key={item.id} style={s.subscription} gradient><Text style={s.planName}>{item.email}</Text><Text style={s.soft}>{item.plan_code} • {item.status} • {item.billing_cycle}</Text><Text style={s.mini}>Bitiş {dateText(item.current_period_end)} • {item.auto_renewing ? 'Otomatik yenileniyor' : item.source === 'google_play' ? 'Yenileme kapalı' : 'Ücretsiz/Admin'}</Text></Panel>)}</View> : null}
    {editing ? <PlanEditor editing={editing} onChange={(plan) => setEditing({ ...editing, plan })} onCancel={() => setEditing(undefined)} onSave={() => void save()} disabled={working} /> : null}
    <Panel style={s.notice} gradient><Ionicons name="logo-google-playstore" size={26} color={colors.green} /><View style={s.copy}><Text style={s.noticeTitle}>Google Play Console eşleştirmesi</Text><Text style={s.soft}>Admin burada uygulamanın paket kataloğunu düzenler. Gerçek tahsilat ve otomatik yenileme için aynı ürün ve temel plan kimlikleri Play Console’da oluşturulmalıdır.</Text></View></Panel>
  </View>;
}

function PlanSummary({ plan, kind, onEdit }: { plan: Plan; kind: PackageKind; onEdit: () => void }) {
  return <Panel style={s.plan} gradient><View style={s.row}><View style={s.planIcon}><Ionicons name={kind === 'site' ? 'business' : 'speedometer'} size={23} color={kind === 'site' ? colors.magenta : colors.cyan} /></View><View style={s.copy}><Text style={s.planName}>{plan.name}</Text><Text style={s.mini}>{plan.code} • {plan.is_active ? 'Aktif' : 'Kapalı'} • {plan.is_public ? 'Yayında' : 'Gizli'}</Text></View><AnimatedPressable onPress={onEdit}><View style={s.edit}><Ionicons name="create" size={20} color={colors.cyan} /></View></AnimatedPressable></View><Text style={s.soft}>{plan.description}</Text><View style={s.priceRow}><Price label="Haftalık" value={plan.weekly_price} /><Price label="Aylık" value={plan.monthly_price} /><Price label="Yıllık" value={plan.yearly_price} /></View><Text style={s.product}>{plan.play_product_id || 'Ücretsiz paket / Google Play ürünü yok'}</Text></Panel>;
}
function PlanEditor({ editing, onChange, onCancel, onSave, disabled }: { editing: { kind: PackageKind; plan: Plan }; onChange: (plan: Plan) => void; onCancel: () => void; onSave: () => void; disabled: boolean }) {
  const p = editing.plan;
  const set = (key: keyof Plan, value: unknown) => onChange({ ...p, [key]: value });
  return <Panel style={s.editor} gradient><SectionTitle title={`${p.name} düzenle`} action={editing.kind === 'site' ? 'Site paketi' : 'Kurye paketi'} /><Field label="Paket adı" value={p.name} onChangeText={(v) => set('name', v)} /><Field label="Açıklama" value={p.description} onChangeText={(v) => set('description', v)} multiline /><View style={s.three}><Field small label="Haftalık TL" value={numberText(p.weekly_price)} onChangeText={(v) => set('weekly_price', v.replace(',', '.'))} keyboardType="decimal-pad" /><Field small label="Aylık TL" value={numberText(p.monthly_price)} onChangeText={(v) => set('monthly_price', v.replace(',', '.'))} keyboardType="decimal-pad" /><Field small label="Yıllık TL" value={numberText(p.yearly_price)} onChangeText={(v) => set('yearly_price', v.replace(',', '.'))} keyboardType="decimal-pad" /></View>
    {editing.kind === 'site' ? <><View style={s.three}><Field small label="Kapı limiti" value={numberText(p.gate_limit)} onChangeText={(v) => set('gate_limit', v)} keyboardType="number-pad" /><Field small label="Personel" value={numberText(p.staff_limit)} onChangeText={(v) => set('staff_limit', v)} keyboardType="number-pad" /><Field small label="Sakin" value={numberText(p.resident_limit)} onChangeText={(v) => set('resident_limit', v)} keyboardType="number-pad" /></View><View style={s.two}><Field small label="Aylık geçiş" value={numberText(p.monthly_courier_pass_limit)} onChangeText={(v) => set('monthly_courier_pass_limit', v)} keyboardType="number-pad" /><Field small label="Rapor günü" value={numberText(p.report_days_limit)} onChangeText={(v) => set('report_days_limit', v)} keyboardType="number-pad" /></View><Toggle label="CSV dışa aktarma" value={Boolean(p.allow_export)} onChange={(v) => set('allow_export', v)} /></> : <><Field label="Aylık kurye geçiş limiti (0 = sınırsız)" value={numberText(p.monthly_pass_limit)} onChangeText={(v) => set('monthly_pass_limit', v)} keyboardType="number-pad" /><Toggle label="Öncelikli site arama" value={Boolean(p.priority_site_search)} onChange={(v) => set('priority_site_search', v)} /><Toggle label="Gelişmiş geçmiş" value={Boolean(p.advanced_history)} onChange={(v) => set('advanced_history', v)} /><Toggle label="Öncelikli destek" value={Boolean(p.priority_support)} onChange={(v) => set('priority_support', v)} /></>}
    <Field label="Google Play abonelik ürün kimliği" value={p.play_product_id || ''} onChangeText={(v) => set('play_product_id', v)} autoCapitalize="none" /><View style={s.three}><Field small label="Haftalık temel plan" value={p.play_weekly_base_plan_id || ''} onChangeText={(v) => set('play_weekly_base_plan_id', v)} autoCapitalize="none" /><Field small label="Aylık temel plan" value={p.play_monthly_base_plan_id || ''} onChangeText={(v) => set('play_monthly_base_plan_id', v)} autoCapitalize="none" /><Field small label="Yıllık temel plan" value={p.play_yearly_base_plan_id || ''} onChangeText={(v) => set('play_yearly_base_plan_id', v)} autoCapitalize="none" /></View><Toggle label="Kullanıcılara göster" value={p.is_public} onChange={(v) => set('is_public', v)} /><Toggle label="Paket aktif" value={p.is_active} onChange={(v) => set('is_active', v)} /><View style={s.actions}><Small title="VAZGEÇ" tone={colors.textSoft} onPress={onCancel} /><Small title={disabled ? 'KAYDEDİLİYOR' : 'KAYDET'} tone={colors.green} onPress={onSave} /></View></Panel>;
}
function Field({ label, small, ...props }: React.ComponentProps<typeof TextInput> & { label: string; small?: boolean }) { return <View style={small ? s.fieldSmall : s.field}><Text style={s.label}>{label}</Text><TextInput {...props} style={[s.input, props.multiline && s.multiline]} placeholderTextColor={colors.textMuted} selectionColor={colors.cyan} /></View>; }
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={s.toggle}><Text style={s.toggleText}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: '#334155', true: colors.green }} /></View>; }
function Tab({ active, title, onPress }: { active: boolean; title: string; onPress: () => void }) { return <AnimatedPressable onPress={onPress}><View style={[s.tab, active && s.tabActive]}><Text style={[s.tabText, active && s.tabTextActive]}>{title}</Text></View></AnimatedPressable>; }
function Price({ label, value }: { label: string; value: unknown }) { return <View style={s.price}><Text style={s.priceLabel}>{label}</Text><Text style={s.priceValue}>{Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL</Text></View>; }
function Small({ title, tone, onPress }: { title: string; tone: string; onPress: () => void }) { return <AnimatedPressable containerStyle={s.actionWrap} onPress={onPress}><View style={[s.small, { borderColor: `${tone}77`, backgroundColor: `${tone}12` }]}><Text style={[s.smallText, { color: tone }]}>{title}</Text></View></AnimatedPressable>; }

const s = StyleSheet.create({ root: { gap: 14 }, loading: { padding: 28, alignItems: 'center', gap: 10 }, soft: { color: colors.textSoft, fontSize: 12, lineHeight: 18 }, metrics: { flexDirection: 'row', gap: 7 }, tabs: { gap: 8, paddingRight: 8 }, tab: { minHeight: 43, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, tabActive: { borderColor: colors.magenta, backgroundColor: 'rgba(222,85,255,.09)' }, tabText: { color: colors.textMuted, fontWeight: '900', fontSize: 11 }, tabTextActive: { color: colors.magenta }, list: { gap: 11 }, plan: { gap: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, planIcon: { width: 47, height: 47, borderRadius: 15, backgroundColor: 'rgba(55,216,255,.10)', alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, planName: { color: colors.text, fontSize: 17, fontWeight: '900' }, mini: { color: colors.textMuted, fontSize: 10, marginTop: 4 }, edit: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }, priceRow: { flexDirection: 'row', gap: 7 }, price: { flex: 1, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.04)', padding: 9 }, priceLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800' }, priceValue: { color: colors.cyan, fontSize: 12, fontWeight: '900', marginTop: 4 }, product: { color: colors.purple, fontSize: 10, fontWeight: '800' }, subscription: { gap: 8 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, actionWrap: { flexGrow: 1, minWidth: '46%' }, small: { minHeight: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 7 }, smallText: { fontSize: 10, fontWeight: '900', textAlign: 'center' }, editor: { gap: 12, borderColor: 'rgba(222,85,255,.48)' }, field: { gap: 6 }, fieldSmall: { flex: 1, minWidth: 0, gap: 6 }, label: { color: colors.textSoft, fontSize: 10, fontWeight: '900' }, input: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 11, fontSize: 13, fontWeight: '700' }, multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' }, three: { flexDirection: 'row', gap: 7 }, two: { flexDirection: 'row', gap: 7 }, toggle: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, toggleText: { color: colors.text, fontSize: 12, fontWeight: '800' }, notice: { flexDirection: 'row', gap: 11, alignItems: 'center', borderColor: 'rgba(67,231,162,.4)' }, noticeTitle: { color: colors.text, fontWeight: '900' } });
