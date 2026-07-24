import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo } from 'react';
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

export function GooglePlaySubscriptionButton({ plan, cycle, scope, siteId, onVerified }: { plan: GooglePlayPlan; cycle: BillingCycle; scope: 'site' | 'courier'; siteId?: string; onVerified?: () => void }) {
  if (!plan.play_product_id) return <View style={s.free}><Ionicons name="checkmark-circle" size={20} color={colors.green} /><Text style={s.freeText}>Ücretsiz paket • satın alma gerekmez</Text></View>;
  const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
  if (isExpoGo) return <View style={s.test}><Ionicons name="phone-portrait" size={21} color={colors.orange} /><View style={s.copy}><Text style={s.testTitle}>Google Play testi APK/AAB sürümünde açılır</Text><Text style={s.testText}>Expo Go native abonelik modülünü çalıştırmaz. Paket ve dönem seçimin korunur.</Text></View></View>;
  return <NativePurchase plan={plan} cycle={cycle} scope={scope} siteId={siteId} onVerified={onVerified} />;
}

function NativePurchase({ plan, cycle, scope, siteId, onVerified }: { plan: GooglePlayPlan; cycle: BillingCycle; scope: 'site' | 'courier'; siteId?: string; onVerified?: () => void }) {
  const iap = require('expo-iap') as any;
  const basePlanId = cycle === 'weekly' ? plan.play_weekly_base_plan_id : cycle === 'monthly' ? plan.play_monthly_base_plan_id : plan.play_yearly_base_plan_id;
  const { connected, products, fetchProducts, requestPurchase, finishTransaction, purchaseInProgress } = iap.useIAP({
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
      } catch (error) { Alert.alert('Satın alma doğrulanamadı', error instanceof Error ? error.message : 'Tekrar dene.'); }
    },
    onPurchaseError: (error: any) => Alert.alert('Satın alma tamamlanmadı', error?.message || 'Google Play işlemi iptal edildi.'),
  });
  useEffect(() => { if (connected && plan.play_product_id) void fetchProducts({ skus: [plan.play_product_id], type: 'subs' }); }, [connected, fetchProducts, plan.play_product_id]);
  const product = useMemo(() => (products || []).find((item: any) => item.id === plan.play_product_id || item.productId === plan.play_product_id), [products, plan.play_product_id]);
  const purchase = async () => {
    if (!basePlanId) return Alert.alert('Temel plan eksik', 'Admin Profil ekranından bu dönem için Google Play temel plan kimliğini tanımla.');
    if (!product) return Alert.alert('Google Play ürünü bulunamadı', 'Ürün Play Console’da etkinleştirildikten ve test hesabına yayınlandıktan sonra tekrar dene.');
    const offers = product.subscriptionOfferDetailsAndroid || product.subscriptionOfferDetails || [];
    const offer = offers.find((item: any) => item.basePlanId === basePlanId || item.basePlanIdAndroid === basePlanId) || offers[0];
    if (!offer?.offerToken) return Alert.alert('Abonelik teklifi bulunamadı', `${basePlanId} temel planı Google Play Console’da etkin değil.`);
    await requestPurchase({ type: 'subs', request: { apple: { sku: plan.play_product_id }, google: { skus: [plan.play_product_id], subscriptionOffers: [{ sku: plan.play_product_id, offerToken: offer.offerToken }] } } });
  };
  return <View style={s.wrapper}>
    <AnimatedPressable onPress={() => void purchase()} disabled={!connected || purchaseInProgress}>
      <LinearGradient colors={gradients.success} style={s.button}>{purchaseInProgress ? <ActivityIndicator color={colors.background} /> : <Ionicons name="logo-google-playstore" size={22} color={colors.background} />}<Text style={s.buttonText}>{purchaseInProgress ? 'GOOGLE PLAY AÇILIYOR' : 'GOOGLE PLAY İLE ABONE OL'}</Text></LinearGradient>
    </AnimatedPressable>
    <AnimatedPressable onPress={() => void Linking.openURL('https://play.google.com/store/account/subscriptions?package=com.draborneagle.draborngate')}><Text style={s.manage}>Mevcut abonelikleri yönet veya iptal et</Text></AnimatedPressable>
  </View>;
}

const s = StyleSheet.create({ wrapper: { gap: 9 }, button: { minHeight: 56, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 12 }, buttonText: { color: colors.background, fontSize: 12, fontWeight: '900' }, manage: { color: colors.cyan, fontSize: 10, fontWeight: '800', textAlign: 'center' }, free: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(67,231,162,.4)', backgroundColor: 'rgba(67,231,162,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, freeText: { color: colors.green, fontWeight: '900', fontSize: 11 }, test: { minHeight: 65, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,179,92,.4)', backgroundColor: 'rgba(255,179,92,.07)', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1 }, testTitle: { color: colors.orange, fontWeight: '900', fontSize: 11 }, testText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 } });
