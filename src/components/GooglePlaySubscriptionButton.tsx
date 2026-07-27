// DKD_V0315_PLAY_BILLING
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, gradients, radius } from '../theme';
import { AnimatedPressable } from './Motion';
import { LinearGradient } from 'expo-linear-gradient';

declare const require: (name: string) => any;
export type BillingCycle = 'weekly' | 'monthly' | 'yearly';
export type GooglePlayPlan = {
  code: string;
  name: string;
  play_product_id?: string;
  play_weekly_base_plan_id?: string;
  play_monthly_base_plan_id?: string;
  play_yearly_base_plan_id?: string;
};

type DkdPlayProduct = Record<string, any>;

function dkdProductId(item: DkdPlayProduct): string {
  return String(item?.id || item?.productId || '');
}

function dkdOffers(item?: DkdPlayProduct): DkdPlayProduct[] {
  const dkd_groups = [
    item?.subscriptionOffers,
    item?.subscriptionOfferDetailsAndroid,
    item?.subscriptionOfferDetails,
  ];
  const dkd_seen = new Set<string>();
  const dkd_output: DkdPlayProduct[] = [];
  for (const dkd_group of dkd_groups) {
    if (!Array.isArray(dkd_group)) continue;
    for (const dkd_offer of dkd_group) {
      const dkd_base_plan_id = dkdBasePlanId(dkd_offer);
      const dkd_offer_token = String(dkd_offer?.offerTokenAndroid || dkd_offer?.offerToken || '');
      const dkd_key = `${dkd_base_plan_id}|${dkd_offer_token}`;
      if (dkd_seen.has(dkd_key)) continue;
      dkd_seen.add(dkd_key);
      dkd_output.push(dkd_offer);
    }
  }
  return dkd_output;
}

function dkdBasePlanId(item: DkdPlayProduct): string {
  return String(item?.basePlanId || item?.basePlanIdAndroid || '');
}

function dkdErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) return String((error as { message?: unknown }).message || '');
  return 'Google Play ürün sorgusu tamamlanamadı.';
}

export function GooglePlaySubscriptionButton({ plan, cycle, scope, siteId, onVerified }: { plan: GooglePlayPlan; cycle: BillingCycle; scope: 'site' | 'courier'; siteId?: string; onVerified?: () => void }) {
  if (!plan.play_product_id) return <View style={s.free}><Ionicons name="checkmark-circle" size={20} color={colors.green} /><Text style={s.freeText}>Ücretsiz paket • satın alma gerekmez</Text></View>;
  const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
  if (isExpoGo) return <View style={s.test}><Ionicons name="phone-portrait" size={21} color={colors.orange} /><View style={s.copy}><Text style={s.testTitle}>Google Play testi APK/AAB sürümünde açılır</Text><Text style={s.testText}>Expo Go native abonelik modülünü çalıştırmaz. Paket ve dönem seçimin korunur.</Text></View></View>;
  return <NativePurchase plan={plan} cycle={cycle} scope={scope} siteId={siteId} onVerified={onVerified} />;
}

function NativePurchase({ plan, cycle, scope, siteId, onVerified }: { plan: GooglePlayPlan; cycle: BillingCycle; scope: 'site' | 'courier'; siteId?: string; onVerified?: () => void }) {
  const iap = require('expo-iap') as any;
  const basePlanId = cycle === 'weekly' ? plan.play_weekly_base_plan_id : cycle === 'monthly' ? plan.play_monthly_base_plan_id : plan.play_yearly_base_plan_id;
  const { connected, products, subscriptions, fetchProducts, requestPurchase, finishTransaction, purchaseInProgress } = iap.useIAP({
    onPurchaseSuccess: async (purchase: any) => {
      try {
        const purchaseToken = purchase.purchaseToken || purchase.purchaseTokenAndroid || purchase.transactionId;
        if (!purchaseToken) throw new Error('Google Play satın alma belirteci alınamadı');
        const result = await supabase.functions.invoke('dkd-gate-play-verify', { body: {
          scope, siteId: siteId || null, planCode: plan.code, billingCycle: cycle,
          productId: plan.play_product_id, basePlanId, purchaseToken,
          orderId: purchase.orderId || purchase.transactionId || '',
        } });
        if (result.error) throw result.error;
        if (!result.data?.ok) throw new Error(result.data?.message || 'Abonelik doğrulanamadı');
        await finishTransaction({ purchase, isConsumable: false });
        Alert.alert('Abonelik etkinleştirildi', `${plan.name} paketi Google Play üzerinden otomatik yenilenecek. Aboneliğini Play Store hesabından iptal edebilirsin.`);
        onVerified?.();
      } catch (error) {
        Alert.alert('Satın alma doğrulanamadı', dkdErrorMessage(error));
      }
    },
    onPurchaseError: (error: any) => Alert.alert('Satın alma tamamlanmadı', error?.message || 'Google Play işlemi iptal edildi.'),
  });

  const [dkdQueryAttempt, setDkdQueryAttempt] = useState(0);
  const [dkdFetchedProducts, setDkdFetchedProducts] = useState<DkdPlayProduct[]>([]);
  const [dkdQueryError, setDkdQueryError] = useState('');
  const [dkdQueryInProgress, setDkdQueryInProgress] = useState(false);

  useEffect(() => {
    let dkdActive = true;
    if (!connected || !plan.play_product_id) return () => { dkdActive = false; };
    void (async () => {
      setDkdQueryInProgress(true);
      setDkdQueryError('');
      try {
        const dkdResult = await fetchProducts({ skus: [plan.play_product_id], type: 'subs' });
        if (!dkdActive) return;
        const dkdResultProducts = Array.isArray(dkdResult)
          ? dkdResult
          : Array.isArray(dkdResult?.products)
            ? dkdResult.products
            : Array.isArray(dkdResult?.subscriptions)
              ? dkdResult.subscriptions
              : [];
        setDkdFetchedProducts(dkdResultProducts);
      } catch (error) {
        if (dkdActive) setDkdQueryError(dkdErrorMessage(error));
      } finally {
        if (dkdActive) setDkdQueryInProgress(false);
      }
    })();
    return () => { dkdActive = false; };
  }, [connected, fetchProducts, plan.play_product_id, dkdQueryAttempt]);

  const dkdCatalog = useMemo(() => {
    const dkdById = new Map<string, DkdPlayProduct>();
    const dkdSources = [
      ...(Array.isArray(products) ? products : []),
      ...(Array.isArray(subscriptions) ? subscriptions : []),
      ...dkdFetchedProducts,
    ];
    for (const item of dkdSources) {
      const id = dkdProductId(item);
      if (id) dkdById.set(id, item);
    }
    return [...dkdById.values()];
  }, [products, subscriptions, dkdFetchedProducts]);

  const product = useMemo(
    () => dkdCatalog.find((item) => dkdProductId(item) === plan.play_product_id),
    [dkdCatalog, plan.play_product_id],
  );
  const exactOffer = useMemo(
    () => dkdOffers(product).find((item) => dkdBasePlanId(item) === basePlanId),
    [product, basePlanId],
  );

  const dkdRetry = () => setDkdQueryAttempt((dkdValue) => dkdValue + 1);
  const purchase = async () => {
    if (!basePlanId) return Alert.alert('Temel plan eksik', 'Bu dönem için Google Play temel plan kimliği tanımlı değil.');
    if (!connected) return Alert.alert('Google Play bağlantısı kurulamadı', 'Uygulamayı Play Store kapalı test bağlantısından, test listesine ekli aynı Google hesabıyla yükle. Play Store uygulamasını da güncelle.');
    if (dkdQueryInProgress) return Alert.alert('Google Play sorgulanıyor', 'Ürün kataloğu yükleniyor. Birkaç saniye sonra tekrar dene.');
    if (!product) {
      const dkdReturned = dkdCatalog.map(dkdProductId).filter(Boolean).join(', ') || 'ürün dönmedi';
      const dkdDetail = dkdQueryError ? `\nSorgu hatası: ${dkdQueryError}` : '';
      const dkdSourceDetail = `\nKaynak sayıları: abonelik=${Array.isArray(subscriptions) ? subscriptions.length : 0}, ürün=${Array.isArray(products) ? products.length : 0}, doğrudan=${dkdFetchedProducts.length}`;
      return Alert.alert(
        'Google Play ürünü bulunamadı',
        `İstenen ürün: ${plan.play_product_id}\nTemel plan: ${basePlanId}\nGoogle Play’den dönen: ${dkdReturned}${dkdSourceDetail}${dkdDetail}\n\nKapalı test ülkesinin test hesabının Play ülkesiyle eşleştiğini, test davetinin kabul edildiğini ve uygulamanın aynı hesapla Play Store’dan yüklendiğini kontrol et.`,
        [{ text: 'KAPAT', style: 'cancel' }, { text: 'TEKRAR SORGULA', onPress: dkdRetry }],
      );
    }
    if (!exactOffer) {
      const dkdAvailable = dkdOffers(product).map(dkdBasePlanId).filter(Boolean).join(', ') || 'temel plan dönmedi';
      return Alert.alert(
        'Temel plan bulunamadı',
        `Ürün bulundu ancak ${basePlanId} temel planı Google Play tarafından bu hesaba sunulmadı.\n\nSunulan temel planlar: ${dkdAvailable}`,
        [{ text: 'KAPAT', style: 'cancel' }, { text: 'TEKRAR SORGULA', onPress: dkdRetry }],
      );
    }
    const dkdOfferToken = exactOffer.offerToken || exactOffer.offerTokenAndroid;
    if (!dkdOfferToken) return Alert.alert('Abonelik teklifi eksik', `${basePlanId} temel planının Google Play teklif belirteci alınamadı.`);
    try {
      await requestPurchase({
        type: 'subs',
        request: {
          apple: { sku: plan.play_product_id },
          google: { skus: [plan.play_product_id], subscriptionOffers: [{ sku: plan.play_product_id, offerToken: dkdOfferToken }] },
        },
      });
    } catch (error) {
      Alert.alert('Google Play açılamadı', dkdErrorMessage(error));
    }
  };

  return <View style={s.wrapper}>
    <AnimatedPressable onPress={() => void purchase()} disabled={!connected || purchaseInProgress}>
      <LinearGradient colors={gradients.success} style={s.button}>{purchaseInProgress || dkdQueryInProgress ? <ActivityIndicator color={colors.background} /> : <Ionicons name="logo-google-playstore" size={22} color={colors.background} />}<Text style={s.buttonText}>{purchaseInProgress ? 'GOOGLE PLAY AÇILIYOR' : dkdQueryInProgress ? 'PAKETLER SORGULANIYOR' : 'GOOGLE PLAY İLE ABONE OL'}</Text></LinearGradient>
    </AnimatedPressable>
    <AnimatedPressable onPress={() => void Linking.openURL('https://play.google.com/store/account/subscriptions?package=com.draborneagle.draborngate')}><Text style={s.manage}>Mevcut abonelikleri yönet veya iptal et</Text></AnimatedPressable>
  </View>;
}

const s = StyleSheet.create({ wrapper: { gap: 9 }, button: { minHeight: 56, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 12 }, buttonText: { color: colors.background, fontSize: 12, fontWeight: '900' }, manage: { color: colors.cyan, fontSize: 10, fontWeight: '800', textAlign: 'center' }, free: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(67,231,162,.4)', backgroundColor: 'rgba(67,231,162,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, freeText: { color: colors.green, fontWeight: '900', fontSize: 11 }, test: { minHeight: 65, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,179,92,.4)', backgroundColor: 'rgba(255,179,92,.07)', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1 }, testTitle: { color: colors.orange, fontWeight: '900', fontSize: 11 }, testText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 } });