import Constants from 'expo-constants';

declare const require: (name: string) => any;

function dkdIsNativeBuild() {
  return Constants.appOwnership !== 'expo' && Constants.executionEnvironment !== 'storeClient';
}

function dkdAdsModule() {
  if (!dkdIsNativeBuild()) return undefined;
  return require('react-native-google-mobile-ads') as any;
}

export async function dkdRefreshAdConsent() {
  const dkdAds = dkdAdsModule();
  if (!dkdAds?.AdsConsent) return false;
  try {
    await dkdAds.AdsConsent.gatherConsent();
    const dkdConsentInfo = await dkdAds.AdsConsent.getConsentInfo();
    return Boolean(dkdConsentInfo?.canRequestAds);
  } catch {
    try {
      const dkdConsentInfo = await dkdAds.AdsConsent.getConsentInfo();
      return Boolean(dkdConsentInfo?.canRequestAds);
    } catch {
      return false;
    }
  }
}

export async function dkdGatherConsentForAds() {
  const dkdAds = dkdAdsModule();
  if (!dkdAds?.AdsConsent) throw new Error('Reklam gizlilik modülü yalnızca DraBornGate APK/AAB sürümünde çalışır.');
  try {
    await dkdAds.AdsConsent.gatherConsent();
  } catch {
    // UMP çevrimdışıysa önceki oturumdaki geçerli karar kullanılabilir.
  }
  const dkdConsentInfo = await dkdAds.AdsConsent.getConsentInfo();
  if (!dkdConsentInfo?.canRequestAds) {
    throw new Error('Reklam gizlilik tercihi tamamlanmadan ödüllü video açılamaz.');
  }
  return dkdConsentInfo;
}

export async function dkdShowAdPrivacyOptions() {
  const dkdAds = dkdAdsModule();
  if (!dkdAds?.AdsConsent) throw new Error('Reklam tercihleri yalnızca DraBornGate APK/AAB sürümünde açılır.');
  await dkdAds.AdsConsent.requestInfoUpdate();
  const dkdConsentInfo = await dkdAds.AdsConsent.getConsentInfo();
  if (String(dkdConsentInfo?.privacyOptionsRequirementStatus || '').toUpperCase() === 'NOT_REQUIRED') {
    throw new Error('Bulunduğun bölgede ek reklam gizlilik formu gerekmiyor.');
  }
  await dkdAds.AdsConsent.showPrivacyOptionsForm();
  return dkdAds.AdsConsent.getConsentInfo();
}
