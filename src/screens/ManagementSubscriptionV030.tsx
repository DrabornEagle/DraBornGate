import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { EmptyState, Panel, SectionTitle } from '../components/UI';
import {
  BillingCycle,
  cancelSubscriptionPaymentRequest,
  createSubscriptionPaymentRequest,
  getSiteSubscriptionDashboard,
  getSubscriptionPlans,
  SiteSubscriptionDashboard,
  SubscriptionPlan,
} from '../lib/v030Api';
import { colors, radius, spacing } from '../theme';

function money(value: number) {
  return `${Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`;
}

function statusText(status?: string) {
  if (status === 'trialing') return 'DENEME AKTİF';
  if (status === 'active') return 'AKTİF';
  if (status === 'past_due') return 'ÖDEME BEKLİYOR';
  if (status === 'cancelled') return 'İPTAL EDİLDİ';
  if (status === 'expired') return 'SÜRESİ DOLDU';
  return 'ÜCRETSİZ';
}

function statusTone(status?: string) {
  if (status === 'active') return colors.green;
  if (status === 'trialing') return colors.cyan;
  if (status === 'past_due') return colors.orange;
  if (status === 'cancelled' || status === 'expired') return colors.red;
  return colors.textSoft;
}

export function ManagementSubscriptionV030({ siteId, siteName }: { siteId: string; siteName: string }) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [dashboard, setDashboard] = useState<SiteSubscriptionDashboard>();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlanCode, setSelectedPlanCode] = useState('professional');
  const [bankReference, setBankReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const [planData, dashboardData] = await Promise.all([
        getSubscriptionPlans(),
        getSiteSubscriptionDashboard(siteId),
      ]);
      setPlans(planData);
      setDashboard(dashboardData);
      if (dashboardData.plan.code !== 'starter') setSelectedPlanCode(dashboardData.plan.code);
    } catch (error) {
      Alert.alert('Paket bilgileri alınamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPlan = plans.find((item) => item.code === selectedPlanCode);
  const price = selectedPlan ? (billingCycle === 'yearly' ? selectedPlan.yearly_price : selectedPlan.monthly_price) : 0;
  const yearlySaving = selectedPlan ? Math.max(0, selectedPlan.monthly_price * 12 - selectedPlan.yearly_price) : 0;

  const submit = async () => {
    if (!selectedPlan || selectedPlan.code === 'starter') return;
    if (!bankReference.trim()) {
      Alert.alert('Ödeme referansı gerekli', 'Havale/EFT açıklaması, dekont numarası veya işlem referansını yaz.');
      return;
    }
    Alert.alert(
      'Ödeme bildirimini gönder',
      `${selectedPlan.name} • ${billingCycle === 'yearly' ? 'Yıllık' : 'Aylık'} • ${money(price)}\n\nAdmin kontrolünden sonra paket otomatik aktif edilir ve fatura kaydı oluşturulur.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async () => {
            setSubmitting(true);
            try {
              await createSubscriptionPaymentRequest({
                siteId,
                planCode: selectedPlan.code,
                billingCycle,
                bankReference: bankReference.trim(),
              });
              setBankReference('');
              await load();
              Alert.alert('Bildirim alındı', 'Ödeme bildirimi Admin incelemesine gönderildi. Onaylandığında paket otomatik açılır.');
            } catch (error) {
              Alert.alert('Bildirim gönderilemedi', error instanceof Error ? error.message : 'Tekrar dene.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const cancelPending = () => {
    const request = dashboard?.pending_request;
    if (!request) return;
    Alert.alert('Ödeme bildirimini iptal et', 'Admin henüz incelemedi. Bildirim iptal edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelSubscriptionPaymentRequest(request.id);
            await load();
          } catch (error) {
            Alert.alert('İptal edilemedi', error instanceof Error ? error.message : 'Tekrar dene.');
          }
        },
      },
    ]);
  };

  const periodEnd = dashboard?.subscription?.status === 'trialing'
    ? dashboard.subscription.trial_ends_at
    : dashboard?.subscription?.current_period_end;

  if (!siteId) return <EmptyState icon="business-outline" title="Yönetilen site yok" description="Paket yönetimi için onaylı bir site gerekir." />;

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.purple} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <FadeInView style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>V0.3 • PAKET VE ABONELİK</Text>
          <Text style={styles.title}>{siteName}</Text>
          <Text style={styles.subtitle}>Kullanım limitleri, Profesyonel özellikler, ödeme bildirimi ve faturalar.</Text>
        </View>
        <View style={styles.headerIcon}><Ionicons name="diamond" size={30} color={colors.purple} /></View>
      </FadeInView>

      {loading && !dashboard ? (
        <Panel style={styles.loading}><ActivityIndicator size="large" color={colors.purple} /><Text style={styles.loadingText}>Paket bilgileri hazırlanıyor</Text></Panel>
      ) : dashboard ? (
        <>
          <Panel style={[styles.currentPlan, { borderColor: `${statusTone(dashboard.subscription?.status)}66` }]} gradient>
            <View style={styles.currentTop}>
              <View style={[styles.currentIcon, { backgroundColor: `${statusTone(dashboard.subscription?.status)}18` }]}>
                <Ionicons name={dashboard.plan.code === 'corporate' ? 'diamond' : dashboard.plan.code === 'professional' ? 'sparkles' : 'leaf'} size={28} color={statusTone(dashboard.subscription?.status)} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.currentLabel}>MEVCUT PAKET</Text>
                <Text style={styles.currentName}>{dashboard.plan.name}</Text>
                <Text style={styles.currentText}>{dashboard.plan.tagline}</Text>
              </View>
              <View style={[styles.statusBadge, { borderColor: `${statusTone(dashboard.subscription?.status)}66`, backgroundColor: `${statusTone(dashboard.subscription?.status)}12` }]}>
                <Text style={[styles.statusText, { color: statusTone(dashboard.subscription?.status) }]}>{statusText(dashboard.subscription?.status)}</Text>
              </View>
            </View>
            {periodEnd ? <Text style={styles.periodText}>{dashboard.subscription.status === 'trialing' ? 'Deneme bitişi' : 'Paket bitişi'}: {new Date(periodEnd).toLocaleDateString('tr-TR')}</Text> : <Text style={styles.periodText}>Süre sınırı bulunmuyor.</Text>}
            <Text style={styles.currentDescription}>{dashboard.plan.description}</Text>
          </Panel>

          <SectionTitle title="Bu ay kullanım" />
          <Panel style={styles.usagePanel} gradient>
            <Usage label="Siteler" used={dashboard.usage.sites} limit={dashboard.plan.site_limit} />
            <Usage label="Kapılar" used={dashboard.usage.gates} limit={dashboard.plan.gate_limit} />
            <Usage label="Yönetim ve güvenlik" used={dashboard.usage.staff} limit={dashboard.plan.staff_limit} />
            <Usage label="Site sakinleri" used={dashboard.usage.residents} limit={dashboard.plan.resident_limit} />
            <Usage label="Kurye geçişleri" used={dashboard.usage.monthly_courier_passes} limit={dashboard.plan.monthly_courier_pass_limit} />
            <Usage label="Ziyaretçi geçişleri" used={dashboard.usage.monthly_visitor_passes} limit={dashboard.plan.monthly_visitor_pass_limit} />
          </Panel>

          {dashboard.pending_request ? (
            <Panel style={styles.pending} gradient>
              <View style={styles.pendingTop}>
                <View style={styles.pendingIcon}><Ionicons name="hourglass" size={24} color={colors.orange} /></View>
                <View style={styles.copy}>
                  <Text style={styles.pendingTitle}>Ödeme bildirimi inceleniyor</Text>
                  <Text style={styles.pendingText}>{dashboard.pending_request.plan_code === 'corporate' ? 'Kurumsal' : 'Profesyonel'} • {dashboard.pending_request.billing_cycle === 'yearly' ? 'Yıllık' : 'Aylık'} • {money(dashboard.pending_request.amount)}</Text>
                  <Text style={styles.pendingMeta}>Referans: {dashboard.pending_request.bank_reference || 'Belirtilmedi'}</Text>
                </View>
              </View>
              <AnimatedPressable onPress={cancelPending}><View style={styles.cancelButton}><Ionicons name="close-circle" size={19} color={colors.red} /><Text style={styles.cancelText}>BİLDİRİMİ İPTAL ET</Text></View></AnimatedPressable>
            </Panel>
          ) : (
            <>
              <SectionTitle title="Paketini seç" />
              <View style={styles.planList}>
                {plans.map((plan) => <PlanCard key={plan.code} plan={plan} active={selectedPlanCode === plan.code} current={dashboard.plan.code === plan.code} onPress={() => setSelectedPlanCode(plan.code)} />)}
              </View>

              {selectedPlan?.code !== 'starter' ? (
                <>
                  <SectionTitle title="Ödeme dönemi" />
                  <View style={styles.cycleRow}>
                    <Cycle active={billingCycle === 'monthly'} title="Aylık" price={selectedPlan?.monthly_price ?? 0} onPress={() => setBillingCycle('monthly')} />
                    <Cycle active={billingCycle === 'yearly'} title="Yıllık" price={selectedPlan?.yearly_price ?? 0} badge={yearlySaving > 0 ? `${money(yearlySaving)} avantaj` : undefined} onPress={() => setBillingCycle('yearly')} />
                  </View>

                  <SectionTitle title="Ödeme bildirimi" />
                  <Panel style={styles.paymentPanel} gradient>
                    <View style={styles.paymentInfo}>
                      <Ionicons name="business" size={24} color={colors.cyan} />
                      <View style={styles.copy}>
                        <Text style={styles.paymentTitle}>Havale / EFT / FAST</Text>
                        <Text style={styles.paymentText}>Ödemeyi yaptıktan sonra banka işlem referansını veya dekont numarasını yaz. Admin onayında paket ve fatura otomatik oluşur.</Text>
                      </View>
                    </View>
                    <View>
                      <Text style={styles.fieldLabel}>İşlem / dekont referansı</Text>
                      <TextInput
                        value={bankReference}
                        onChangeText={setBankReference}
                        placeholder="Örn. FAST-240724-4581"
                        placeholderTextColor={colors.textMuted}
                        selectionColor={colors.cyan}
                        style={styles.input}
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={styles.orderSummary}>
                      <View><Text style={styles.orderLabel}>SEÇİLEN PAKET</Text><Text style={styles.orderValue}>{selectedPlan?.name}</Text></View>
                      <View style={styles.orderPrice}><Text style={styles.orderLabel}>{billingCycle === 'yearly' ? 'YILLIK' : 'AYLIK'}</Text><Text style={styles.price}>{money(price)}</Text></View>
                    </View>
                    <AnimatedPressable onPress={() => void submit()} disabled={submitting || !bankReference.trim()}>
                      <View style={[styles.submit, (!bankReference.trim() || submitting) && styles.submitDisabled]}>
                        <Ionicons name="paper-plane" size={21} color={colors.background} />
                        <Text style={styles.submitText}>{submitting ? 'GÖNDERİLİYOR' : 'ÖDEME BİLDİRİMİNİ GÖNDER'}</Text>
                      </View>
                    </AnimatedPressable>
                  </Panel>
                </>
              ) : (
                <Panel style={styles.freeInfo} gradient><Ionicons name="checkmark-circle" size={25} color={colors.green} /><View style={styles.copy}><Text style={styles.freeTitle}>Başlangıç paketi ücretsiz</Text><Text style={styles.freeText}>Mevcut ücretli paket veya deneme süresi bittiğinde sistem temel pakete güvenli biçimde döner.</Text></View></Panel>
              )}
            </>
          )}

          <SectionTitle title="Faturalar" action={`${dashboard.invoices.length} kayıt`} />
          {dashboard.invoices.length ? <View style={styles.invoiceList}>{dashboard.invoices.map((invoice) => (
            <Panel key={invoice.id} style={styles.invoice} gradient>
              <View style={styles.invoiceIcon}><Ionicons name="receipt" size={23} color={colors.green} /></View>
              <View style={styles.copy}>
                <Text style={styles.invoiceTitle}>{invoice.invoice_number}</Text>
                <Text style={styles.invoiceText}>{invoice.plan_code === 'corporate' ? 'Kurumsal' : 'Profesyonel'} • {invoice.billing_cycle === 'yearly' ? 'Yıllık' : 'Aylık'} • {new Date(invoice.issued_at).toLocaleDateString('tr-TR')}</Text>
                <Text style={styles.invoiceText}>{new Date(invoice.period_start).toLocaleDateString('tr-TR')} → {new Date(invoice.period_end).toLocaleDateString('tr-TR')}</Text>
              </View>
              <Text style={styles.invoiceAmount}>{money(invoice.amount)}</Text>
            </Panel>
          ))}</View> : <EmptyState icon="receipt-outline" title="Henüz fatura yok" description="Onaylanan ilk paket ödemesinden sonra fatura kaydı burada görünür." />}
        </>
      ) : null}
    </ScrollView>
  );
}

function PlanCard({ plan, active, current, onPress }: { plan: SubscriptionPlan; active: boolean; current: boolean; onPress: () => void }) {
  const tone = plan.code === 'corporate' ? colors.magenta : plan.code === 'professional' ? colors.cyan : colors.orange;
  return (
    <AnimatedPressable onPress={onPress}>
      <Panel style={[styles.planCard, active && { borderColor: tone, backgroundColor: `${tone}0D` }]} gradient>
        <View style={[styles.planIcon, { backgroundColor: `${tone}18` }]}><Ionicons name={plan.code === 'corporate' ? 'diamond' : plan.code === 'professional' ? 'sparkles' : 'leaf'} size={25} color={tone} /></View>
        <View style={styles.copy}>
          <View style={styles.planTitleRow}><Text style={styles.planTitle}>{plan.name}</Text>{current ? <Text style={[styles.currentTag, { color: tone }]}>MEVCUT</Text> : null}</View>
          <Text style={styles.planTagline}>{plan.tagline}</Text>
          <Text style={styles.planDescription}>{plan.description}</Text>
          <View style={styles.featureRow}>
            <Feature enabled label={`${plan.report_days_limit} gün rapor`} />
            <Feature enabled={plan.allow_export} label="CSV" />
            <Feature enabled={plan.advanced_finance} label="Finans analizi" />
          </View>
        </View>
        <View style={styles.planPriceBox}><Text style={[styles.planPrice, { color: tone }]}>{plan.monthly_price ? money(plan.monthly_price) : 'Ücretsiz'}</Text>{plan.monthly_price ? <Text style={styles.planPriceUnit}>/ ay</Text> : null}<Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={active ? tone : colors.textMuted} /></View>
      </Panel>
    </AnimatedPressable>
  );
}

function Feature({ enabled, label }: { enabled: boolean; label: string }) {
  return <View style={styles.feature}><Ionicons name={enabled ? 'checkmark-circle' : 'close-circle'} size={13} color={enabled ? colors.green : colors.textMuted} /><Text style={[styles.featureText, !enabled && { color: colors.textMuted }]}>{label}</Text></View>;
}

function Cycle({ active, title, price, badge, onPress }: { active: boolean; title: string; price: number; badge?: string; onPress: () => void }) {
  return <AnimatedPressable containerStyle={styles.cycleWrap} onPress={onPress}><View style={[styles.cycle, active && styles.cycleActive]}><Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? colors.purple : colors.textMuted} /><Text style={styles.cycleTitle}>{title}</Text><Text style={styles.cyclePrice}>{money(price)}</Text>{badge ? <Text style={styles.cycleBadge}>{badge}</Text> : null}</View></AnimatedPressable>;
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit === 0;
  const ratio = unlimited ? 15 : Math.min(100, used / Math.max(1, limit) * 100);
  const tone = !unlimited && ratio >= 90 ? colors.red : !unlimited && ratio >= 70 ? colors.orange : colors.cyan;
  return <View style={styles.usageItem}><View style={styles.usageTop}><Text style={styles.usageLabel}>{label}</Text><Text style={[styles.usageValue, { color: tone }]}>{used} / {unlimited ? 'Sınırsız' : limit}</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${ratio}%`, backgroundColor: tone }]} /></View></View>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 14, paddingBottom: 132, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, copy: { flex: 1 },
  eyebrow: { color: colors.purple, fontSize: 12, fontWeight: '900', letterSpacing: .9 }, title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 5 }, subtitle: { color: colors.textSoft, fontSize: 14, lineHeight: 21, marginTop: 5 },
  headerIcon: { width: 61, height: 61, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139,107,255,.40)', backgroundColor: 'rgba(139,107,255,.11)', alignItems: 'center', justifyContent: 'center' },
  loading: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 12 }, loadingText: { color: colors.textSoft, fontSize: 14, fontWeight: '700' },
  currentPlan: { gap: 11 }, currentTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, currentIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, currentLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '900' }, currentName: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 2 }, currentText: { color: colors.textSoft, fontSize: 12, marginTop: 3 }, statusBadge: { minHeight: 32, borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }, statusText: { fontSize: 9, fontWeight: '900', textAlign: 'center' }, periodText: { color: colors.cyan, fontSize: 12, fontWeight: '900' }, currentDescription: { color: colors.textSoft, fontSize: 13, lineHeight: 19 },
  usagePanel: { gap: 13 }, usageItem: { gap: 6 }, usageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, usageLabel: { color: colors.textSoft, fontSize: 13, fontWeight: '800' }, usageValue: { fontSize: 12, fontWeight: '900' }, track: { height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,.07)', overflow: 'hidden' }, fill: { height: '100%', borderRadius: 8 },
  pending: { gap: 13, borderColor: 'rgba(255,179,92,.40)' }, pendingTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, pendingIcon: { width: 49, height: 49, borderRadius: 16, backgroundColor: 'rgba(255,179,92,.13)', alignItems: 'center', justifyContent: 'center' }, pendingTitle: { color: colors.orange, fontSize: 16, fontWeight: '900' }, pendingText: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 4 }, pendingMeta: { color: colors.textSoft, fontSize: 11, marginTop: 4 }, cancelButton: { height: 47, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,101,125,.38)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, cancelText: { color: colors.red, fontSize: 12, fontWeight: '900' },
  planList: { gap: 10 }, planCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, planIcon: { width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, planTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, currentTag: { fontSize: 9, fontWeight: '900' }, planTagline: { color: colors.cyan, fontSize: 11, fontWeight: '800', marginTop: 3 }, planDescription: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 5 }, featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 }, feature: { flexDirection: 'row', alignItems: 'center', gap: 4 }, featureText: { color: colors.textSoft, fontSize: 9, fontWeight: '800' }, planPriceBox: { alignItems: 'flex-end', gap: 3, maxWidth: 74 }, planPrice: { fontSize: 13, fontWeight: '900', textAlign: 'right' }, planPriceUnit: { color: colors.textMuted, fontSize: 9 },
  cycleRow: { flexDirection: 'row', gap: 9 }, cycleWrap: { flex: 1 }, cycle: { minHeight: 105, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 11, justifyContent: 'center', gap: 5 }, cycleActive: { borderColor: colors.purple, backgroundColor: 'rgba(139,107,255,.10)' }, cycleTitle: { color: colors.text, fontSize: 15, fontWeight: '900' }, cyclePrice: { color: colors.purple, fontSize: 17, fontWeight: '900' }, cycleBadge: { color: colors.green, fontSize: 9, fontWeight: '900' },
  paymentPanel: { gap: 14 }, paymentInfo: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, paymentTitle: { color: colors.text, fontSize: 16, fontWeight: '900' }, paymentText: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 }, fieldLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '900', marginBottom: 7 }, input: { minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, color: colors.text, fontSize: 15, fontWeight: '700', paddingHorizontal: 13 }, orderSummary: { minHeight: 68, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, orderLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900' }, orderValue: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 4 }, orderPrice: { alignItems: 'flex-end' }, price: { color: colors.green, fontSize: 20, fontWeight: '900', marginTop: 3 }, submit: { minHeight: 57, borderRadius: 18, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, submitDisabled: { opacity: .42 }, submitText: { color: colors.background, fontSize: 13, fontWeight: '900' },
  freeInfo: { flexDirection: 'row', alignItems: 'center', gap: 11, borderColor: 'rgba(67,231,162,.35)' }, freeTitle: { color: colors.green, fontSize: 15, fontWeight: '900' }, freeText: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 },
  invoiceList: { gap: 9 }, invoice: { flexDirection: 'row', alignItems: 'center', gap: 9 }, invoiceIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(67,231,162,.12)', alignItems: 'center', justifyContent: 'center' }, invoiceTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, invoiceText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 }, invoiceAmount: { color: colors.green, fontSize: 14, fontWeight: '900' },
});
