import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BillingCycle, GooglePlaySubscriptionButton } from '../components/GooglePlaySubscriptionButton';
import { AnimatedPressable, FadeInView, FloatingView, PulseDot } from '../components/Motion';
import { Panel, SectionTitle } from '../components/UI';
import { supabase } from '../lib/supabase';
import { colors, gradients, radius, spacing } from '../theme';
import { PassesScreen } from './PassesScreen';

type Plan = {
  code: string; name: string; description: string; weekly_price: number | string; monthly_price: number | string; yearly_price: number | string; currency: string;
  monthly_pass_limit: number; priority_site_search: boolean; advanced_history: boolean; priority_support: boolean;
  play_product_id?: string; play_weekly_base_plan_id?: string; play_monthly_base_plan_id?: string; play_yearly_base_plan_id?: string;
};
type Center = { subscription: { plan_code: string; status: string; billing_cycle?: BillingCycle; current_period_end?: string; auto_renewing?: boolean } | null; effective_plan: Plan; plans: Plan[]; usage: { used: number; limit: number } };
const money = (value: number | string, currency: string) => `${Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${currency === 'TRY' ? 'TL' : currency}`;
const cycleSuffix = (cycle: BillingCycle) => cycle === 'weekly' ? 'hafta' : cycle === 'monthly' ? 'ay' : 'yıl';

export function CourierCenterV032() {
  const [tab, setTab] = useState<'passes' | 'packages'>('passes');
  const [center, setCenter] = useState<Center>();
  const [selected, setSelected] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkd_gate_get_courier_package_center');
      if (error) throw error;
      const next = data as Center;
      setCenter(next);
      setSelected((current) => current && next.plans.some((plan) => plan.code === current) ? current : next.effective_plan?.code || next.plans?.[0]?.code || '');
      if (next.subscription?.billing_cycle) setCycle(next.subscription.billing_cycle);
    } catch (error) { Alert.alert('Kurye merkezi yüklenemedi', error instanceof Error ? error.message : 'Tekrar dene.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const selectedPlan = useMemo(() => center?.plans.find((plan) => plan.code === selected), [center, selected]);
  return <View style={s.flex}>
    <View style={s.tabs}>
      <NavCard active={tab === 'passes'} icon="shield-checkmark" title="Geçişlerim" text="Talepler, kodlar ve durumlar" tone={colors.cyan} onPress={() => setTab('passes')} />
      <NavCard active={tab === 'packages'} icon="diamond" title="Kurye Paketleri" text="Limitler ve abonelikler" tone={colors.magenta} onPress={() => setTab('packages')} />
    </View>
    {tab === 'passes' ? <PassesScreen role="courier" /> : <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.cyan} />} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {loading && !center ? <ActivityIndicator size="large" color={colors.cyan} /> : center ? <>
        <FadeInView><LinearGradient colors={gradients.courier} style={s.hero}><View style={s.heroTop}><FloatingView style={s.heroIcon} distance={4}><Ionicons name="speedometer" size={32} color={colors.white} /></FloatingView><View style={s.copy}><Text style={s.kicker}>MEVCUT KURYE PAKETİ</Text><Text style={s.heroTitle}>{center.effective_plan.name}</Text></View><View style={s.live}><PulseDot color={colors.green} size={8} /><Text style={s.liveText}>{center.subscription?.auto_renewing ? 'YENİLENİYOR' : 'AKTİF'}</Text></View></View><Text style={s.heroText}>{center.effective_plan.description}</Text><View style={s.usageRow}><Text style={s.usage}>{center.usage.used} / {center.usage.limit === 0 ? 'Sınırsız' : center.usage.limit} aylık geçiş</Text><Text style={s.status}>{center.subscription?.billing_cycle ? `${cycleSuffix(center.subscription.billing_cycle)}lık plan` : 'ücretsiz plan'}</Text></View></LinearGradient></FadeInView>
        <View style={s.chips}><Chip active={cycle === 'weekly'} title="Haftalık" onPress={() => setCycle('weekly')} /><Chip active={cycle === 'monthly'} title="Aylık" onPress={() => setCycle('monthly')} /><Chip active={cycle === 'yearly'} title="Yıllık" onPress={() => setCycle('yearly')} /></View>
        <SectionTitle title="Kurye satış paketleri" />
        <View style={s.list}>{center.plans.map((plan, index) => <FadeInView key={plan.code} delay={index * 60}><AnimatedPressable onPress={() => setSelected(plan.code)}><Panel style={[s.card, selected === plan.code && s.selected]} gradient><View style={s.top}><FloatingView style={[s.icon, { backgroundColor: plan.code === 'courier_starter' ? 'rgba(67,231,162,.13)' : plan.code === 'courier_plus' ? 'rgba(55,216,255,.13)' : 'rgba(222,85,255,.13)' }]} distance={3}><Ionicons name={plan.code === 'courier_starter' ? 'leaf' : plan.code === 'courier_plus' ? 'flash' : 'diamond'} size={27} color={plan.code === 'courier_starter' ? colors.green : plan.code === 'courier_plus' ? colors.cyan : colors.magenta} /></FloatingView><View style={s.copy}><Text style={s.name}>{plan.name}</Text><Text style={s.price}>{money(cycle === 'weekly' ? plan.weekly_price : cycle === 'monthly' ? plan.monthly_price : plan.yearly_price, plan.currency)}{plan.code !== 'courier_starter' ? ` / ${cycleSuffix(cycle)}` : ''}</Text></View>{center.effective_plan.code === plan.code ? <Text style={s.current}>MEVCUT</Text> : selected === plan.code ? <Ionicons name="checkmark-circle" size={26} color={colors.cyan} /> : <Ionicons name="ellipse-outline" size={26} color={colors.textMuted} />}</View><Text style={s.description}>{plan.description}</Text><View style={s.featureGrid}><Feature text={plan.monthly_pass_limit === 0 ? 'Sınırsız geçiş' : `${plan.monthly_pass_limit} geçiş / ay`} /><Feature text={plan.advanced_history ? 'Gelişmiş geçmiş' : 'Standart geçmiş'} /><Feature text={plan.priority_site_search ? 'Öncelikli site arama' : 'Standart site arama'} /><Feature text={plan.priority_support ? 'Öncelikli destek' : 'Standart destek'} /></View></Panel></AnimatedPressable></FadeInView>)}</View>
        {selectedPlan ? <GooglePlaySubscriptionButton plan={selectedPlan} cycle={cycle} scope="courier" onVerified={() => void load()} /> : null}
        <Panel style={s.notice} gradient><Ionicons name="logo-google-playstore" size={28} color={colors.green} /><View style={s.copy}><Text style={s.noticeTitle}>İptal edene kadar otomatik yenilenir</Text><Text style={s.noticeText}>Google Play, seçilen haftalık, aylık veya yıllık dönemin tahsilatını yönetir. Aboneliğini Play Store hesabından istediğin zaman kapatabilirsin.</Text></View></Panel>
      </> : null}
    </ScrollView>}
  </View>;
}

function NavCard({ active, icon, title, text, tone, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; text: string; tone: string; onPress: () => void }) { return <AnimatedPressable containerStyle={s.navWrap} onPress={onPress}><LinearGradient colors={active ? [`${tone}30`, 'rgba(13,32,51,.98)'] : ['rgba(15,38,59,.95)', 'rgba(8,24,40,.98)']} style={[s.nav, active && { borderColor: tone }]}><FloatingView style={[s.navIcon, { backgroundColor: `${tone}1F` }]} distance={3}><Ionicons name={icon} size={25} color={active ? tone : colors.textMuted} /></FloatingView><View style={s.copy}><Text style={[s.navTitle, active && { color: tone }]}>{title}</Text><Text style={s.navText}>{text}</Text></View>{active ? <PulseDot color={tone} size={7} /> : <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />}</LinearGradient></AnimatedPressable>; }
function Chip({ active, title, onPress }: { active: boolean; title: string; onPress: () => void }) { return <AnimatedPressable containerStyle={s.chipWrap} onPress={onPress}><View style={[s.chip, active && s.chipActive]}><Text style={[s.chipText, active && { color: colors.cyan }]}>{title}</Text></View></AnimatedPressable>; }
function Feature({ text }: { text: string }) { return <View style={s.feature}><Ionicons name="checkmark-circle" size={16} color={colors.green} /><Text style={s.featureText}>{text}</Text></View>; }
const s = StyleSheet.create({ flex: { flex: 1 }, tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, paddingTop: 8 }, navWrap: { flex: 1 }, nav: { minHeight: 84, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, navIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, navTitle: { color: colors.textSoft, fontSize: 12, fontWeight: '900' }, navText: { color: colors.textMuted, fontSize: 8, lineHeight: 12, marginTop: 3 }, content: { padding: spacing.md, paddingBottom: 126, gap: 17 }, hero: { borderRadius: radius.xl, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)' }, heroTop: { flexDirection: 'row', alignItems: 'center', gap: 11 }, heroIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' }, kicker: { color: 'rgba(255,255,255,.75)', fontSize: 9, fontWeight: '900' }, heroTitle: { color: colors.white, fontSize: 25, fontWeight: '900', marginTop: 4 }, heroText: { color: colors.white, opacity: .82, lineHeight: 19, marginTop: 11 }, live: { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(67,231,162,.45)', backgroundColor: 'rgba(67,231,162,.12)', paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }, liveText: { color: colors.green, fontSize: 7, fontWeight: '900' }, usageRow: { marginTop: 13, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, usage: { color: colors.green, fontWeight: '900', fontSize: 11 }, status: { color: 'rgba(255,255,255,.7)', fontSize: 10 }, chips: { flexDirection: 'row', gap: 7 }, chipWrap: { flex: 1 }, chip: { minHeight: 43, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, chipActive: { borderColor: colors.cyan, backgroundColor: 'rgba(55,216,255,.08)' }, chipText: { color: colors.textMuted, fontWeight: '900', fontSize: 11 }, list: { gap: 11 }, card: { gap: 10 }, selected: { borderColor: colors.cyan, borderWidth: 2 }, top: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 53, height: 53, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, name: { color: colors.text, fontSize: 19, fontWeight: '900' }, price: { color: colors.cyan, fontSize: 14, fontWeight: '900', marginTop: 3 }, current: { color: colors.green, fontSize: 9, fontWeight: '900', borderWidth: 1, borderColor: colors.green, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 }, description: { color: colors.textSoft, lineHeight: 20 }, featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, feature: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 6 }, featureText: { color: colors.textSoft, fontSize: 11 }, notice: { flexDirection: 'row', gap: 12, alignItems: 'center', borderColor: 'rgba(67,231,162,.4)' }, noticeTitle: { color: colors.text, fontWeight: '900' }, noticeText: { color: colors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 4 } });
