import Constants from 'expo-constants';
import { dkdGatherConsentForAds } from './dkdAdConsent';

declare const require: (name: string) => any;

export type DkdRewardResult = { amount: number; type: string };

export async function dkdShowRewardedPassAd(): Promise<DkdRewardResult> {
  const dkdIsExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
  if (dkdIsExpoGo) throw new Error('Ödüllü video yalnızca DraBornGate APK/AAB sürümünde çalışır.');

  await dkdGatherConsentForAds();
  const dkdAds = require('react-native-google-mobile-ads') as any;
  const dkdMobileAds = dkdAds.default;
  const dkdAdUnitId = process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID || dkdAds.TestIds.REWARDED;
  await dkdMobileAds().initialize();

  return new Promise<DkdRewardResult>((dkdResolve, dkdReject) => {
    const dkdRewarded = dkdAds.RewardedAd.createForAdRequest(dkdAdUnitId, {
      keywords: ['delivery', 'courier', 'access'],
      requestNonPersonalizedAdsOnly: true,
    });
    let dkdEarned = false;
    let dkdSettled = false;
    const dkdSubscriptions: Array<() => void> = [];

    const dkdCleanup = () => dkdSubscriptions.splice(0).forEach((dkdUnsubscribe) => dkdUnsubscribe());
    const dkdFinishReject = (dkdError: Error) => {
      if (dkdSettled) return;
      dkdSettled = true;
      dkdCleanup();
      dkdReject(dkdError);
    };
    const dkdFinishResolve = (dkdReward: DkdRewardResult) => {
      if (dkdSettled) return;
      dkdSettled = true;
      dkdCleanup();
      dkdResolve(dkdReward);
    };

    dkdSubscriptions.push(dkdRewarded.addAdEventListener(dkdAds.RewardedAdEventType.LOADED, () => {
      void dkdRewarded.show().catch((dkdError: unknown) => dkdFinishReject(dkdError instanceof Error ? dkdError : new Error('Video açılamadı.')));
    }));
    dkdSubscriptions.push(dkdRewarded.addAdEventListener(dkdAds.RewardedAdEventType.EARNED_REWARD, (dkdReward: DkdRewardResult) => {
      dkdEarned = true;
      dkdFinishResolve({ amount: Number(dkdReward?.amount || 1), type: String(dkdReward?.type || 'pass_credit') });
    }));
    dkdSubscriptions.push(dkdRewarded.addAdEventListener(dkdAds.AdEventType.CLOSED, () => {
      if (!dkdEarned) dkdFinishReject(new Error('Video tamamlanmadığı için geçiş hakkı eklenmedi.'));
    }));
    dkdSubscriptions.push(dkdRewarded.addAdEventListener(dkdAds.AdEventType.ERROR, (dkdError: { message?: string }) => {
      dkdFinishReject(new Error(dkdError?.message || 'Ödüllü video yüklenemedi.'));
    }));

    dkdRewarded.load();
  });
}

export function dkdRewardedAdUnitId() {
  try {
    const dkdAds = require('react-native-google-mobile-ads') as any;
    return process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID || dkdAds.TestIds.REWARDED;
  } catch {
    return process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID || 'test-rewarded';
  }
}
