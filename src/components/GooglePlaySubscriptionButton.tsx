// DKD_V0318_PLAY_BILLING_ENTITLEMENT
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
export type GooglePlayVerifiedInfo = {
  planCode: string;
  planName: string;
  cycle: BillingCycle;
  restored: boolean;
};

type PlayItem = Record<string, any>;
type RestoreReason = 'auto' | 'manual' | 'already-owned';
type VerifyReason = 'purchase' | RestoreReason;
type VerifyResult = {
  ok?: boolean;
  message?: string;
  code?: string;
  status?: string;
  acknowledged?: boolean;
  acknowledgementWarning?: string;
  subscription?: { plan_code?: string; status?: string; expires_at?: string };
};
type PopupState = {
  visible: boolean;
  tone: 'success' | 'info' | 'warning' | 'error';
  icon: keyof typeof Ionicons.glyphMap;
  eyebrow: string;
  title: string;
  message: string;
  detail?: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
};

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

// OpenIAP Purchase.id Android'de sipariş/işlem kimliğidir. Ürün kimliği her zaman
// productId alanından önce okunmalıdır; v0.3.17'deki ters sıra satın alımı filtreliyordu.
const productIdOf = (item?: PlayItem) => String(item?.productId || item?.productIdAndroid || item?.sku || item?.id || '');
const tokenOf = (item?: PlayItem) => String(item?.purchaseToken || item?.purchaseTokenAndroid || '');
const basePlanOf = (item?: PlayItem) => String(item?.currentPlanId || item?.basePlanId || item?.basePlanIdAndroid || '');
const errorMessage = (error: unknown) => error instanceof Error && error.message
  ? error.message
  : typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message || '')
    : 'Google Play işlemi tamamlanamadı.';
const errorCode = (error: unknown) => typeof error === 'object' && error && 'code' in error
  ? String((error as { code?: unknown }).code || '')
  : '';
const isCancelled = (error: unknown) => /cancel|iptal|user.?cancell/i.test(`${errorCode(error)} ${errorMessage(error)}`);
const isAlreadyOwned = (error: unknown) => /already.?owned|item.?already.?owned|zaten.*abon/i.test(`${errorCode(error)} ${errorMessage(error)}`);
const purchaseIsPending = (item?: PlayItem) => {
  const state = item?.purchaseStateAndroid ?? item?.purchaseState;
  return state === 2 || /pending/i.test(String(state || ''));
};
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
const cycleFromPlan = (plan: GooglePlayPlan, basePlanId: string, fallback: BillingCycle): BillingCycle => {
  if (basePlanId && basePlanId === plan.play_weekly_base_plan_id) return 'weekly';
  if (basePlanId && basePlanId === plan.play_monthly_base_plan_id) return 'monthly';
  if (basePlanId && basePlanId === plan.play_yearly_base_plan_id) return 'yearly';
  if (/week/i.test(basePlanId)) return 'weekly';
  if (/year|annual/i.test(basePlanId)) return 'yearly';
  if (/month/i.test(basePlanId)) return 'monthly';
  return fallback;
};
const rightsText = (planCode: string) => planCode === 'courier_pro'
  ? 'Sınırsız geçiş hakkınız etkinleştirildi.'
  : planCode === 'courier_plus'
    ? 'Aylık 100 geçiş hakkınız etkinleştirildi.'
    : 'Paket haklarınız güncellendi.';

export function GooglePlaySubscriptionButton({
  plan,
  allPlans,
  cycle,
  scope,
  siteId,
  onVerified,
}: {
  plan: GooglePlayPlan;
  allPlans?: GooglePlayPlan[];
  cycle: BillingCycle;
  scope: 'site' | 'courier';
  siteId?: string;
  onVerified?: (info: GooglePlayVerifiedInfo) => void;
}) {
  const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
  if (isExpoGo) return <View style={styles.test}><Ionicons name="phone-portrait" size={21} color={colors.orange} /><View style={styles.copy}><Text style={styles.testTitle}>Google Play testi APK/AAB sürümünde açılır</Text><Text style={styles.testText}>Expo Go native abonelik modülünü çalıştırmaz.</Text></View></View>;
  return <NativePurchase plan={plan} allPlans={allPlans || [plan]} cycle={cycle} scope={scope} siteId={siteId} onVerified={onVerified} />;
}

function NativePurchase({
  plan,
  allPlans,
  cycle,
  scope,
  siteId,
  onVerified,
}: {
  plan: GooglePlayPlan;
  allPlans: GooglePlayPlan[];
  cycle: BillingCycle;
  scope: 'site' | 'courier';
  siteId?: string;
  onVerified?: (info: GooglePlayVerifiedInfo) => void;
}) {
  const iap = require('expo-iap') as any;
  const paidPlans = useMemo(() => allPlans.filter(item => Boolean(item.play_product_id)), [allPlans]);
  const productIds = useMemo(() => [...new Set(paidPlans.map(item => String(item.play_product_id)))], [paidPlans]);
  const selectedBasePlanId = cycle === 'weekly' ? plan.play_weekly_base_plan_id : cycle === 'monthly' ? plan.play_monthly_base_plan_id : plan.play_yearly_base_plan_id;
  const processedTokens = useRef(new Set<string>());
  const autoRestoreKey = useRef('');
  const availablePurchasesRef = useRef<PlayItem[]>([]);
  const activeSubscriptionsRef = useRef<PlayItem[]>([]);
  const verifyRef = useRef<(purchase: PlayItem, reason: VerifyReason, notify: boolean) => Promise<boolean>>(async () => false);
  const restoreRef = useRef<(notify: boolean, reason: RestoreReason) => Promise<void>>(async () => undefined);
  const [fetched, setFetched] = useState<PlayItem[]>([]);
  const [querying, setQuerying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [popup, setPopup] = useState<PopupState>({
    visible: false,
    tone: 'info',
    icon: 'information-circle',
    eyebrow: 'GOOGLE PLAY',
    title: '',
    message: '',
    primaryLabel: 'TAMAM',
  });

  const closePopup = useCallback(() => setPopup(current => ({ ...current, visible: false })), []);
  const openPopup = useCallback((next: Omit<PopupState, 'visible'>) => setPopup({ ...next, visible: true }), []);

  const hook = iap.useIAP({
    onPurchaseSuccess: (purchase: PlayItem) => { void verifyRef.current(purchase, 'purchase', true); },
    onPurchaseError: (error: unknown) => {
      if (isAlreadyOwned(error)) {
        openPopup({
          tone: 'info',
          icon: 'sync-circle',
          eyebrow: 'ABONELİK BULUNDU',
          title: 'Mevcut aboneliğiniz doğrulanıyor',
          message: 'Google Play bu paketin zaten hesabınızda olduğunu bildirdi. Paket hakkınızı şimdi DraBornGate hesabınıza bağlıyoruz.',
          primaryLabel: 'BEKLEYİN',
        });
        void restoreRef.current(true, 'already-owned');
        return;
      }
      if (isCancelled(error)) {
        openPopup({
          tone: 'info',
          icon: 'close-circle',
          eyebrow: 'İŞLEM KAPATILDI',
          title: 'Satın alma tamamlanmadı',
          message: 'Google Play ödeme ekranı kapatıldı. Tamamlanmış bir ödeme yoksa ücret alınmaz.',
          primaryLabel: 'TAMAM',
          onPrimary: closePopup,
        });
        return;
      }
      openPopup({
        tone: 'error',
        icon: 'alert-circle',
        eyebrow: 'GOOGLE PLAY HATASI',
        title: 'Satın alma başlatılamadı',
        message: errorMessage(error),
        primaryLabel: 'TEKRAR DENE',
        onPrimary: closePopup,
      });
    },
  });

  const {
    connected,
    products,
    subscriptions,
    availablePurchases,
    activeSubscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
    getActiveSubscriptions,
    purchaseInProgress,
  } = hook;

  useEffect(() => { availablePurchasesRef.current = Array.isArray(availablePurchases) ? availablePurchases : []; }, [availablePurchases]);
  useEffect(() => { activeSubscriptionsRef.current = Array.isArray(activeSubscriptions) ? activeSubscriptions : []; }, [activeSubscriptions]);

  const planForProduct = useCallback((productId: string) => paidPlans.find(item => item.play_product_id === productId), [paidPlans]);

  const verifyPurchase = useCallback(async (purchase: PlayItem, reason: VerifyReason, notify: boolean) => {
    const purchasedProductId = productIdOf(purchase);
    const purchaseToken = tokenOf(purchase);
    const purchasedPlan = planForProduct(purchasedProductId);
    if (!purchasedPlan) return false;

    if (purchaseIsPending(purchase)) {
      if (notify) openPopup({
        tone: 'warning',
        icon: 'time',
        eyebrow: 'ÖDEME BEKLEMEDE',
        title: 'Google Play ödemeyi işliyor',
        message: 'Ödeme tamamlandığında paket hakkınız otomatik olarak tanımlanacak. Bekleyen işlem onaylanmadan geçiş hakkı verilmez.',
        primaryLabel: 'TAMAM',
        onPrimary: closePopup,
      });
      return false;
    }

    if (!purchaseToken) {
      if (notify) openPopup({
        tone: 'error',
        icon: 'key-outline',
        eyebrow: 'DOĞRULAMA BİLGİSİ EKSİK',
        title: 'Satın alma belirteci alınamadı',
        message: 'Play Store hesabını kontrol edip uygulamayı Google Play üzerinden yeniden açın. Ardından Aboneliği Geri Yükle seçeneğini kullanın.',
        primaryLabel: 'ABONELİKLERİ AÇ',
        secondaryLabel: 'KAPAT',
        onPrimary: () => void Linking.openURL('https://play.google.com/store/account/subscriptions?package=com.draborneagle.draborngate'),
        onSecondary: closePopup,
      });
      return false;
    }

    if (processedTokens.current.has(purchaseToken)) return true;
    processedTokens.current.add(purchaseToken);
    const verifiedBasePlanId = basePlanOf(purchase);
    const verifiedCycle = cycleFromPlan(purchasedPlan, verifiedBasePlanId, cycle);

    try {
      const result = await supabase.functions.invoke('dkd-gate-play-verify', { body: {
        scope,
        siteId: scope === 'site' ? siteId || null : null,
        planCode: purchasedPlan.code,
        billingCycle: verifiedCycle,
        productId: purchasedProductId,
        basePlanId: verifiedBasePlanId || (verifiedCycle === 'weekly' ? purchasedPlan.play_weekly_base_plan_id : verifiedCycle === 'monthly' ? purchasedPlan.play_monthly_base_plan_id : purchasedPlan.play_yearly_base_plan_id) || '',
        purchaseToken,
        orderId: purchase.orderId || purchase.id || purchase.transactionId || '',
      } });
      if (result.error) throw result.error;
      const data = (result.data || {}) as VerifyResult;
      if (!data.ok) throw new Error(data.message || `Abonelik doğrulanamadı${data.code ? ` (${data.code})` : ''}`);
      if (!['active', 'cancelled'].includes(String(data.status || ''))) {
        throw new Error('Google Play aboneliği henüz kullanım hakkı verecek durumda değil. Ödeme durumunu Play Store üzerinden kontrol edin.');
      }

      try { await finishTransaction({ purchase, isConsumable: false }); }
      catch (finishError) { console.warn('DraBornGate finishTransaction:', errorMessage(finishError)); }

      const planCode = String(data.subscription?.plan_code || purchasedPlan.code);
      const planName = paidPlans.find(item => item.code === planCode)?.name || purchasedPlan.name;
      onVerified?.({ planCode, planName, cycle: verifiedCycle, restored: reason !== 'purchase' });

      if (notify) openPopup({
        tone: 'success',
        icon: 'checkmark-circle',
        eyebrow: reason === 'purchase' ? 'SATIN ALMA TAMAMLANDI' : 'ABONELİK GERİ YÜKLENDİ',
        title: `${planName} hazır`,
        message: rightsText(planCode),
        detail: `Google Play doğrulaması tamamlandı. ${verifiedCycle === 'weekly' ? 'Haftalık' : verifiedCycle === 'monthly' ? 'Aylık' : 'Yıllık'} aboneliğiniz iptal edene kadar otomatik yenilenir.`,
        primaryLabel: 'PAKETİ KULLANMAYA BAŞLA',
        secondaryLabel: 'ABONELİĞİ YÖNET',
        onPrimary: closePopup,
        onSecondary: () => void Linking.openURL(`https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(purchasedProductId)}&package=com.draborneagle.draborngate`),
      });
      return true;
    } catch (error) {
      processedTokens.current.delete(purchaseToken);
      if (notify) openPopup({
        tone: 'error',
        icon: 'shield-outline',
        eyebrow: 'DOĞRULAMA TAMAMLANAMADI',
        title: 'Ödemeniz kaybolmadı',
        message: errorMessage(error),
        detail: 'İnternet bağlantısını kontrol edin ve Aboneliği Geri Yükle seçeneğine dokunun. Aynı satın alma ikinci kez ücretlendirilmez.',
        primaryLabel: 'GERİ YÜKLE',
        secondaryLabel: 'ABONELİKLERİ AÇ',
        onPrimary: () => void restoreRef.current(true, 'manual'),
        onSecondary: () => void Linking.openURL('https://play.google.com/store/account/subscriptions?package=com.draborneagle.draborngate'),
      });
      return false;
    }
  }, [closePopup, cycle, finishTransaction, onVerified, openPopup, paidPlans, planForProduct, scope, siteId]);
  verifyRef.current = verifyPurchase;

  const collectPurchases = useCallback(async () => {
    const collected: PlayItem[] = [];
    const add = (items: unknown) => {
      if (Array.isArray(items)) collected.push(...items);
    };

    try {
      if (typeof iap.getAvailablePurchases === 'function') add(await iap.getAvailablePurchases({ includeSuspendedAndroid: false }));
    } catch (error) { console.warn('DraBornGate direct getAvailablePurchases:', errorMessage(error)); }
    try {
      if (typeof iap.getActiveSubscriptions === 'function') add(await iap.getActiveSubscriptions(productIds));
    } catch (error) { console.warn('DraBornGate direct getActiveSubscriptions:', errorMessage(error)); }

    const hookCalls: Promise<unknown>[] = [];
    if (typeof getAvailablePurchases === 'function') hookCalls.push(Promise.resolve(getAvailablePurchases()));
    if (typeof getActiveSubscriptions === 'function') hookCalls.push(Promise.resolve(getActiveSubscriptions(productIds)));
    if (hookCalls.length) await Promise.allSettled(hookCalls);
    await wait(450);
    add(availablePurchasesRef.current);
    add(activeSubscriptionsRef.current);

    const unique = new Map<string, PlayItem>();
    for (const purchase of collected) {
      const productId = productIdOf(purchase);
      if (!productIds.includes(productId)) continue;
      const key = tokenOf(purchase) || `${productId}:${String(purchase?.transactionId || purchase?.id || '')}`;
      if (key) unique.set(key, purchase);
    }
    return [...unique.values()];
  }, [getActiveSubscriptions, getAvailablePurchases, iap, productIds]);

  const restore = useCallback(async (notify: boolean, reason: RestoreReason) => {
    if (!connected) {
      if (notify) openPopup({
        tone: 'error',
        icon: 'cloud-offline',
        eyebrow: 'GOOGLE PLAY BAĞLANTISI',
        title: 'Play Store bağlantısı kurulamadı',
        message: 'İnternet bağlantısını ve Play Store oturumunu kontrol edin. Uygulama Google Play üzerinden yüklenmiş olmalıdır.',
        primaryLabel: 'TAMAM',
        onPrimary: closePopup,
      });
      return;
    }
    setRestoring(true);
    try {
      const purchases = await collectPurchases();
      const ordered = [...purchases].sort((left, right) => {
        const leftPlan = planForProduct(productIdOf(left));
        const rightPlan = planForProduct(productIdOf(right));
        const rank = (item?: GooglePlayPlan) => item?.code === 'courier_pro' ? 3 : item?.code === 'courier_plus' ? 2 : 1;
        return rank(rightPlan) - rank(leftPlan);
      });
      let restored = 0;
      for (const purchase of ordered) {
        const success = await verifyPurchase(purchase, reason, notify && restored === 0);
        if (success) restored += 1;
      }
      if (!restored && notify) openPopup({
        tone: 'warning',
        icon: 'person-circle',
        eyebrow: 'ABONELİK BULUNAMADI',
        title: 'Google Play hesabını kontrol edin',
        message: 'Bu uygulamayı yükleyen Play Store hesabında kullanılabilir DraBornGate aboneliği bulunamadı.',
        detail: 'Birden fazla Google hesabınız varsa aboneliğin bulunduğu hesapla Play Store’dan DraBornGate sayfasını açıp uygulamayı yeniden başlatın.',
        primaryLabel: 'ABONELİKLERİ AÇ',
        secondaryLabel: 'KAPAT',
        onPrimary: () => void Linking.openURL('https://play.google.com/store/account/subscriptions?package=com.draborneagle.draborngate'),
        onSecondary: closePopup,
      });
    } catch (error) {
      if (notify) openPopup({
        tone: 'error',
        icon: 'refresh-circle',
        eyebrow: 'GERİ YÜKLEME HATASI',
        title: 'Abonelik geri yüklenemedi',
        message: errorMessage(error),
        primaryLabel: 'TEKRAR DENE',
        secondaryLabel: 'KAPAT',
        onPrimary: () => void restoreRef.current(true, 'manual'),
        onSecondary: closePopup,
      });
    } finally { setRestoring(false); }
  }, [closePopup, collectPurchases, connected, openPopup, planForProduct, verifyPurchase]);
  restoreRef.current = restore;

  useEffect(() => {
    if (!connected || !productIds.length) return;
    let active = true;
    setQuerying(true);
    setQueryError('');
    void Promise.resolve(fetchProducts({ skus: productIds, type: 'subs' }))
      .then((result: any) => {
        if (!active) return;
        const list = Array.isArray(result) ? result : Array.isArray(result?.subscriptions) ? result.subscriptions : Array.isArray(result?.products) ? result.products : [];
        setFetched(list);
      })
      .catch((error: unknown) => { if (active) setQueryError(errorMessage(error)); })
      .finally(() => { if (active) setQuerying(false); });
    return () => { active = false; };
  }, [attempt, connected, fetchProducts, productIds]);

  useEffect(() => {
    const key = `${scope}:${siteId || ''}:${productIds.join('|')}`;
    if (!connected || !productIds.length || autoRestoreKey.current === key) return;
    autoRestoreKey.current = key;
    const timer = setTimeout(() => { void restore(false, 'auto'); }, 900);
    return () => clearTimeout(timer);
  }, [connected, productIds, restore, scope, siteId]);

  useEffect(() => {
    if (!connected || !productIds.length) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setTimeout(() => { void restore(false, 'auto'); }, 550);
    });
    return () => subscription.remove();
  }, [connected, productIds.length, restore]);

  const catalog = useMemo(() => {
    const map = new Map<string, PlayItem>();
    for (const item of [...(Array.isArray(products) ? products : []), ...(Array.isArray(subscriptions) ? subscriptions : []), ...fetched]) {
      const id = productIdOf(item);
      if (id) map.set(id, item);
    }
    return [...map.values()];
  }, [fetched, products, subscriptions]);
  const product = plan.play_product_id ? catalog.find(item => productIdOf(item) === plan.play_product_id) : undefined;
  const exactOffer = offersOf(product).find(item => basePlanOf(item) === selectedBasePlanId);

  const purchase = async () => {
    if (!plan.play_product_id) return;
    if (!selectedBasePlanId) return openPopup({
      tone: 'error', icon: 'albums-outline', eyebrow: 'PAKET YAPILANDIRMASI', title: 'Temel plan eksik',
      message: 'Seçilen dönem için Google Play temel planı tanımlı değil.', primaryLabel: 'TAMAM', onPrimary: closePopup,
    });
    if (!connected) return openPopup({
      tone: 'error', icon: 'cloud-offline', eyebrow: 'GOOGLE PLAY BAĞLANTISI', title: 'Play Store bağlantısı kurulamadı',
      message: 'Uygulamayı test listesine ekli aynı Google hesabıyla Play Store üzerinden yükleyin.', primaryLabel: 'TAMAM', onPrimary: closePopup,
    });
    if (querying) return openPopup({
      tone: 'info', icon: 'hourglass-outline', eyebrow: 'PAKET HAZIRLANIYOR', title: 'Google Play sorgulanıyor',
      message: 'Paket bilgileri yükleniyor. Birkaç saniye sonra tekrar deneyin.', primaryLabel: 'TAMAM', onPrimary: closePopup,
    });
    if (!product) return openPopup({
      tone: 'error', icon: 'bag-remove-outline', eyebrow: 'ÜRÜN BULUNAMADI', title: 'Google Play ürünü alınamadı',
      message: `${plan.play_product_id} ürünü bu Play Store hesabına sunulmadı.${queryError ? ` ${queryError}` : ''}`,
      primaryLabel: 'TEKRAR SORGULA', secondaryLabel: 'KAPAT',
      onPrimary: () => { closePopup(); setAttempt(value => value + 1); }, onSecondary: closePopup,
    });
    if (!exactOffer) return openPopup({
      tone: 'error', icon: 'pricetag-outline', eyebrow: 'TEKLİF BULUNAMADI', title: 'Seçilen dönem kullanılamıyor',
      message: `${selectedBasePlanId} temel planı bu Google Play hesabına sunulmadı.`, primaryLabel: 'TEKRAR SORGULA', secondaryLabel: 'KAPAT',
      onPrimary: () => { closePopup(); setAttempt(value => value + 1); }, onSecondary: closePopup,
    });
    const offerToken = exactOffer.offerToken || exactOffer.offerTokenAndroid;
    if (!offerToken) return openPopup({
      tone: 'error', icon: 'key-outline', eyebrow: 'TEKLİF BİLGİSİ', title: 'Abonelik teklifi eksik',
      message: 'Google Play teklif belirteci alınamadı.', primaryLabel: 'TAMAM', onPrimary: closePopup,
    });

    try {
      const { data } = await supabase.auth.getUser();
      const obfuscatedAccountIdAndroid = String(data.user?.id || '').replace(/-/g, '');
      await requestPurchase({
        type: 'subs',
        request: {
          apple: { sku: plan.play_product_id },
          google: {
            skus: [plan.play_product_id],
            subscriptionOffers: [{ sku: plan.play_product_id, offerToken }],
            obfuscatedAccountIdAndroid: obfuscatedAccountIdAndroid || undefined,
            isOfferPersonalized: false,
          },
        },
      });
    } catch (error) {
      if (isAlreadyOwned(error)) void restore(true, 'already-owned');
      else if (!isCancelled(error)) openPopup({
        tone: 'error', icon: 'alert-circle', eyebrow: 'GOOGLE PLAY HATASI', title: 'Satın alma açılamadı',
        message: errorMessage(error), primaryLabel: 'TAMAM', onPrimary: closePopup,
      });
    }
  };

  const busy = Boolean(purchaseInProgress || querying || restoring);
  const body = !plan.play_product_id ? (
    <View style={styles.free}><Ionicons name="checkmark-circle" size={20} color={colors.green} /><Text style={styles.freeText}>Ücretsiz paket • satın alma gerekmez</Text></View>
  ) : (
    <AnimatedPressable onPress={() => void purchase()} disabled={busy}>
      <LinearGradient colors={['#31E6A1', '#25B7FF', '#796BFF', '#E45DFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
        <View style={styles.playIcon}>{busy ? <ActivityIndicator color={colors.white} /> : <Ionicons name="logo-google-playstore" size={24} color={colors.white} />}</View>
        <View style={styles.buttonCopy}><Text style={styles.buttonText}>{restoring ? 'ABONELİK GERİ YÜKLENİYOR' : purchaseInProgress ? 'GOOGLE PLAY AÇILIYOR' : querying ? 'PAKET SORGULANIYOR' : 'GOOGLE PLAY İLE ABONE OL'}</Text><Text style={styles.buttonSub}>{plan.name.toLocaleUpperCase('tr-TR')} • {cycle === 'weekly' ? 'HAFTALIK' : cycle === 'monthly' ? 'AYLIK' : 'YILLIK'} • OTOMATİK YENİLENİR</Text></View>
        <Ionicons name="arrow-forward-circle" size={25} color={colors.white} />
      </LinearGradient>
    </AnimatedPressable>
  );

  return <View style={styles.wrapper}>
    {body}
    <View style={styles.links}>
      <AnimatedPressable onPress={() => void restore(true, 'manual')} disabled={restoring}><Text style={styles.restore}>ABONELİĞİ GERİ YÜKLE</Text></AnimatedPressable>
      <AnimatedPressable onPress={() => void Linking.openURL('https://play.google.com/store/account/subscriptions?package=com.draborneagle.draborngate')}><Text style={styles.manage}>YÖNET / İPTAL ET</Text></AnimatedPressable>
    </View>
    <PurchaseStatusModal state={popup} onClose={closePopup} />
  </View>;
}

function PurchaseStatusModal({ state, onClose }: { state: PopupState; onClose: () => void }) {
  const tone = state.tone === 'success' ? colors.green : state.tone === 'error' ? colors.red : state.tone === 'warning' ? colors.orange : colors.cyan;
  return <Modal visible={state.visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.modalCard}>
        <View style={[styles.modalIcon, { borderColor: tone, backgroundColor: `${tone}18` }]}><Ionicons name={state.icon} size={31} color={tone} /></View>
        <Text style={[styles.modalEyebrow, { color: tone }]}>{state.eyebrow}</Text>
        <Text style={styles.modalTitle}>{state.title}</Text>
        <Text style={styles.modalMessage}>{state.message}</Text>
        {state.detail ? <View style={styles.modalDetail}><Ionicons name="information-circle-outline" size={18} color={colors.cyan} /><Text style={styles.modalDetailText}>{state.detail}</Text></View> : null}
        <View style={styles.modalActions}>
          <AnimatedPressable onPress={state.onPrimary || onClose} containerStyle={styles.modalPrimaryWrap}><View style={[styles.modalPrimary, { backgroundColor: tone }]}><Text style={styles.modalPrimaryText}>{state.primaryLabel}</Text></View></AnimatedPressable>
          {state.secondaryLabel ? <AnimatedPressable onPress={state.onSecondary || onClose} containerStyle={styles.modalSecondaryWrap}><View style={styles.modalSecondary}><Text style={styles.modalSecondaryText}>{state.secondaryLabel}</Text></View></AnimatedPressable> : null}
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  button: { minHeight: 70, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,.42)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, overflow: 'hidden' },
  playIcon: { width: 43, height: 43, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,.45)', backgroundColor: 'rgba(2,7,13,.18)', alignItems: 'center', justifyContent: 'center' },
  buttonCopy: { flex: 1 },
  buttonText: { color: colors.white, fontSize: 12.5, fontWeight: '900' },
  buttonSub: { color: 'rgba(255,255,255,.82)', fontSize: 7.5, fontWeight: '900', letterSpacing: .45, marginTop: 4 },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18 },
  restore: { color: colors.green, fontSize: 9.5, fontWeight: '900' },
  manage: { color: colors.cyan, fontSize: 9.5, fontWeight: '900' },
  free: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(67,231,162,.4)', backgroundColor: 'rgba(67,231,162,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  freeText: { color: colors.green, fontWeight: '900', fontSize: 11 },
  test: { minHeight: 65, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,179,92,.4)', backgroundColor: 'rgba(255,179,92,.07)', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { flex: 1 },
  testTitle: { color: colors.orange, fontWeight: '900', fontSize: 11 },
  testText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.74)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { width: '100%', maxWidth: 430, borderRadius: 25, borderWidth: 1, borderColor: colors.border, backgroundColor: '#07131F', padding: 22, alignItems: 'center' },
  modalIcon: { width: 64, height: 64, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalEyebrow: { marginTop: 15, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  modalTitle: { color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: '900', textAlign: 'center', marginTop: 7 },
  modalMessage: { color: colors.textSoft, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9 },
  modalDetail: { width: '100%', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(55,216,255,.28)', backgroundColor: 'rgba(55,216,255,.07)', flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, marginTop: 15 },
  modalDetailText: { flex: 1, color: colors.textSoft, fontSize: 11, lineHeight: 17 },
  modalActions: { width: '100%', gap: 9, marginTop: 19 },
  modalPrimaryWrap: { width: '100%' },
  modalPrimary: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  modalPrimaryText: { color: '#02100B', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  modalSecondaryWrap: { width: '100%' },
  modalSecondary: { minHeight: 47, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  modalSecondaryText: { color: colors.textSoft, fontSize: 10.5, fontWeight: '900', textAlign: 'center' },
});
