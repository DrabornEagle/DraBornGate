// DKD_V0317_PLAY_BILLING_RESTORE
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Linking, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../theme';
import { AnimatedPressable } from './Motion';

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
type PlayItem = Record<string, any>;

type VerifyResult = { ok?: boolean; message?: string; code?: string; status?: string; acknowledged?: boolean; acknowledgementWarning?: string };

const productIdOf = (item?: PlayItem) => String(item?.id || item?.productId || '');
const tokenOf = (item?: PlayItem) => String(item?.purchaseToken || item?.purchaseTokenAndroid || item?.transactionId || '');
const basePlanOf = (item?: PlayItem) => String(item?.basePlanId || item?.basePlanIdAndroid || item?.currentPlanId || '');
const errorMessage = (error: unknown) => error instanceof Error && error.message ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message?: unknown }).message || '') : 'Google Play işlemi tamamlanamadı.';
const isCancelled = (error: unknown) => /cancel|iptal|user.?cancell/i.test(errorMessage(error)) || /user.?cancel/i.test(String((error as any)?.code || ''));
const offersOf = (item?: PlayItem) => {
  const groups = [item?.subscriptionOffers, item?.subscriptionOfferDetailsAndroid, item?.subscriptionOfferDetails];
  const seen = new Set<string>();
  const output: PlayItem[] = [];
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const offer of group) {
      const key = `${basePlanOf(offer)}|${String(offer?.offerToken || offer?.offerTokenAndroid || '')}`;
      if (!seen.has(key)) { seen.add(key); output.push(offer); }
    }
  }
  return output;
};

export function GooglePlaySubscriptionButton({ plan, cycle, scope, siteId, onVerified }: { plan: GooglePlayPlan; cycle: BillingCycle; scope: 'site' | 'courier'; siteId?: string; onVerified?: () => void }) {
  if (!plan.play_product_id) return <View style={styles.free}><Ionicons name="checkmark-circle" size={20} color={colors.green} /><Text style={styles.freeText}>Ücretsiz paket • satın alma gerekmez</Text></View>;
  const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
  if (isExpoGo) return <View style={styles.test}><Ionicons name="phone-portrait" size={21} color={colors.orange} /><View style={styles.copy}><Text style={styles.testTitle}>Google Play testi APK/AAB sürümünde açılır</Text><Text style={styles.testText}>Expo Go native abonelik modülünü çalıştırmaz.</Text></View></View>;
  return <NativePurchase plan={plan} cycle={cycle} scope={scope} siteId={siteId} onVerified={onVerified} />;
}

function NativePurchase({ plan, cycle, scope, siteId, onVerified }: { plan: GooglePlayPlan; cycle: BillingCycle; scope: 'site' | 'courier'; siteId?: string; onVerified?: () => void }) {
  const iap = require('expo-iap') as any;
  const basePlanId = cycle === 'weekly' ? plan.play_weekly_base_plan_id : cycle === 'monthly' ? plan.play_monthly_base_plan_id : plan.play_yearly_base_plan_id;
  const verifyRef = useRef<(purchase: PlayItem, notify: boolean) => Promise<boolean>>(async () => false);
  const processedTokens = useRef(new Set<string>());
  const restoredKey = useRef('');
  const [fetched, setFetched] = useState<PlayItem[]>([]);
  const [querying, setQuerying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const motion = useRef(new Animated.Value(0)).current;

  const hook = iap.useIAP({
    onPurchaseSuccess: (purchase: PlayItem) => { void verifyRef.current(purchase, true); },
    onPurchaseError: (error: unknown) => {
      if (isCancelled(error)) Alert.alert('Satın alma iptal edildi', 'Google Play işlemi tamamlanmadı ve ücret alınmadı.');
      else Alert.alert('Satın alma tamamlanmadı', errorMessage(error));
    },
  });
  const { connected, products, subscriptions, fetchProducts, requestPurchase, finishTransaction, purchaseInProgress } = hook;

  const verifyPurchase = useCallback(async (purchase: PlayItem, notify: boolean) => {
    const purchaseToken = tokenOf(purchase);
    const purchasedProductId = productIdOf(purchase);
    if (!purchaseToken || !purchasedProductId) {
      if (notify) Alert.alert('Satın alma doğrulanamadı', 'Google Play satın alma belirteci alınamadı.');
      return false;
    }
    const allowedPrefix = scope === 'courier' ? 'draborngate.courier.' : 'draborngate.site.';
    if (!purchasedProductId.startsWith(allowedPrefix)) return false;
    const pendingState = String(purchase?.purchaseStateAndroid || purchase?.purchaseState || '');
    if (/pending/i.test(pendingState)) {
      if (notify) Alert.alert('Ödeme beklemede', 'Google Play ödemeyi tamamladığında abonelik otomatik olarak etkinleştirilecek.');
      return false;
    }
    if (processedTokens.current.has(purchaseToken)) return true;
    processedTokens.current.add(purchaseToken);
    try {
      const result = await supabase.functions.invoke('dkd-gate-play-verify', { body: {
        scope,
        siteId: scope === 'site' ? siteId || null : null,
        planCode: plan.code,
        billingCycle: cycle,
        productId: purchasedProductId,
        basePlanId: basePlanOf(purchase) || basePlanId || '',
        purchaseToken,
        orderId: purchase.orderId || purchase.transactionId || '',
      } });
      if (result.error) throw result.error;
      const data = (result.data || {}) as VerifyResult;
      if (!data.ok) throw new Error(data.message || `Abonelik doğrulanamadı${data.code ? ` (${data.code})` : ''}`);
      if (!['active', 'cancelled'].includes(String(data.status || ''))) throw new Error('Google Play aboneliği henüz aktif değil. Ödeme durumunu Play Store üzerinden kontrol edin.');
      try { await finishTransaction({ purchase, isConsumable: false }); }
      catch (finishError) { console.warn('DraBornGate finishTransaction:', errorMessage(finishError)); }
      onVerified?.();
      if (notify) Alert.alert('Abonelik etkinleştirildi', 'Google Play satın alımı doğrulandı, paket hakkınız ve geçiş limitiniz güncellendi.');
      return true;
    } catch (error) {
      processedTokens.current.delete(purchaseToken);
      if (notify) Alert.alert('Satın alma doğrulanamadı', `${errorMessage(error)}\n\nSatın alımınız kaybolmadı. İnternet bağlantısını kontrol edip “ABONELİĞİ GERİ YÜKLE” düğmesine dokunun.`);
      return false;
    }
  }, [basePlanId, cycle, finishTransaction, onVerified, plan.code, scope, siteId]);
  verifyRef.current = verifyPurchase;

  const restore = useCallback(async (notify: boolean) => {
    if (!connected) { if (notify) Alert.alert('Google Play bağlantısı kurulamadı', 'Play Store hesabınızı ve internet bağlantınızı kontrol edin.'); return; }
    setRestoring(true);
    try {
      const getter = iap.getAvailablePurchases;
      const purchases = typeof getter === 'function' ? await getter() : [];
      const list = Array.isArray(purchases) ? purchases : [];
      const relevant = list.filter((purchase: PlayItem) => productIdOf(purchase).startsWith(scope === 'courier' ? 'draborngate.courier.' : 'draborngate.site.'));
      let restored = 0;
      for (const purchase of relevant) if (await verifyPurchase(purchase, false)) restored += 1;
      if (notify) Alert.alert(restored ? 'Abonelik geri yüklendi' : 'Aktif abonelik bulunamadı', restored ? 'Google Play aboneliğiniz doğrulandı ve haklarınız güncellendi.' : 'Bu Play Store hesabında DraBornGate için etkin bir abonelik bulunamadı.');
    } catch (error) {
      if (notify) Alert.alert('Abonelik geri yüklenemedi', errorMessage(error));
    } finally { setRestoring(false); }
  }, [connected, iap, scope, verifyPurchase]);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 1450, useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 1450, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [motion]);

  useEffect(() => {
    if (!connected || !plan.play_product_id) return;
    let active = true;
    setQuerying(true); setQueryError('');
    void Promise.resolve(fetchProducts({ skus: [plan.play_product_id], type: 'subs' }))
      .then((result: any) => {
        if (!active) return;
        const list = Array.isArray(result) ? result : Array.isArray(result?.subscriptions) ? result.subscriptions : Array.isArray(result?.products) ? result.products : [];
        setFetched(list);
      })
      .catch((error: unknown) => { if (active) setQueryError(errorMessage(error)); })
      .finally(() => { if (active) setQuerying(false); });
    return () => { active = false; };
  }, [attempt, connected, fetchProducts, plan.play_product_id]);

  useEffect(() => {
    const key = `${scope}:${siteId || ''}`;
    if (!connected || restoredKey.current === key) return;
    restoredKey.current = key;
    const timer = setTimeout(() => { void restore(false); }, 700);
    return () => clearTimeout(timer);
  }, [connected, restore, scope, siteId]);

  const catalog = useMemo(() => {
    const map = new Map<string, PlayItem>();
    for (const item of [...(Array.isArray(products) ? products : []), ...(Array.isArray(subscriptions) ? subscriptions : []), ...fetched]) {
      const id = productIdOf(item); if (id) map.set(id, item);
    }
    return [...map.values()];
  }, [fetched, products, subscriptions]);
  const product = catalog.find(item => productIdOf(item) === plan.play_product_id);
  const exactOffer = offersOf(product).find(item => basePlanOf(item) === basePlanId);

  const purchase = async () => {
    if (!basePlanId) return Alert.alert('Temel plan eksik', 'Seçilen dönem için Google Play temel planı tanımlı değil.');
    if (!connected) return Alert.alert('Google Play bağlantısı kurulamadı', 'Uygulamayı test listesine ekli aynı Google hesabıyla Play Store üzerinden yükleyin.');
    if (querying) return Alert.alert('Google Play sorgulanıyor', 'Paket bilgileri yükleniyor. Birkaç saniye sonra tekrar deneyin.');
    if (!product) return Alert.alert('Google Play ürünü bulunamadı', `İstenen ürün: ${plan.play_product_id}\nTemel plan: ${basePlanId}${queryError ? `\nSorgu: ${queryError}` : ''}`, [{ text: 'KAPAT', style: 'cancel' }, { text: 'TEKRAR SORGULA', onPress: () => setAttempt(value => value + 1) }]);
    if (!exactOffer) return Alert.alert('Temel plan bulunamadı', `${basePlanId} temel planı bu Google Play hesabına sunulmadı.`, [{ text: 'KAPAT', style: 'cancel' }, { text: 'TEKRAR SORGULA', onPress: () => setAttempt(value => value + 1) }]);
    const offerToken = exactOffer.offerToken || exactOffer.offerTokenAndroid;
    if (!offerToken) return Alert.alert('Abonelik teklifi eksik', 'Google Play teklif belirteci alınamadı.');
    try {
      await requestPurchase({ type: 'subs', request: { apple: { sku: plan.play_product_id }, google: { skus: [plan.play_product_id], subscriptionOffers: [{ sku: plan.play_product_id, offerToken }], isOfferPersonalized: false } } });
    } catch (error) {
      if (!isCancelled(error)) Alert.alert('Google Play açılamadı', errorMessage(error));
    }
  };

  const busy = Boolean(purchaseInProgress || querying || restoring);
  return <View style={styles.wrapper}>
    <Animated.View style={{ transform: [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }) }] }}>
      <AnimatedPressable onPress={() => void purchase()} disabled={busy}>
        <LinearGradient colors={['#31E6A1', '#25B7FF', '#796BFF', '#E45DFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          <View style={styles.playIcon}>{busy ? <ActivityIndicator color={colors.white} /> : <Ionicons name="logo-google-playstore" size={24} color={colors.white} />}</View>
          <View style={styles.buttonCopy}><Text style={styles.buttonText}>{restoring ? 'ABONELİK GERİ YÜKLENİYOR' : purchaseInProgress ? 'GOOGLE PLAY AÇILIYOR' : querying ? 'PAKET SORGULANIYOR' : 'GOOGLE PLAY İLE ABONE OL'}</Text><Text style={styles.buttonSub}>{plan.name.toLocaleUpperCase('tr-TR')} • {cycle === 'weekly' ? 'HAFTALIK' : cycle === 'monthly' ? 'AYLIK' : 'YILLIK'} • OTOMATİK YENİLENİR</Text></View>
          <Ionicons name="arrow-forward-circle" size={25} color={colors.white} />
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
    <View style={styles.links}>
      <AnimatedPressable onPress={() => void restore(true)} disabled={restoring}><Text style={styles.restore}>ABONELİĞİ GERİ YÜKLE</Text></AnimatedPressable>
      <AnimatedPressable onPress={() => void Linking.openURL('https://play.google.com/store/account/subscriptions?package=com.draborneagle.draborngate')}><Text style={styles.manage}>YÖNET / İPTAL ET</Text></AnimatedPressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 }, button: { minHeight: 70, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,.42)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, overflow: 'hidden' },
  playIcon: { width: 43, height: 43, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,.45)', backgroundColor: 'rgba(2,7,13,.18)', alignItems: 'center', justifyContent: 'center' }, buttonCopy: { flex: 1 }, buttonText: { color: colors.white, fontSize: 12.5, fontWeight: '900' }, buttonSub: { color: 'rgba(255,255,255,.82)', fontSize: 7.5, fontWeight: '900', letterSpacing: .45, marginTop: 4 },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18 }, restore: { color: colors.green, fontSize: 9.5, fontWeight: '900' }, manage: { color: colors.cyan, fontSize: 9.5, fontWeight: '900' },
  free: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(67,231,162,.4)', backgroundColor: 'rgba(67,231,162,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, freeText: { color: colors.green, fontWeight: '900', fontSize: 11 },
  test: { minHeight: 65, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,179,92,.4)', backgroundColor: 'rgba(255,179,92,.07)', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1 }, testTitle: { color: colors.orange, fontWeight: '900', fontSize: 11 }, testText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 },
});
