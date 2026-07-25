import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { APP_VERSION } from '../config/version';
import { supabase } from './supabase';

const CHANNEL_ID = 'draborngate-core';
const IS_EXPO_GO = Constants.appOwnership === 'expo' || (Constants as { executionEnvironment?: string }).executionEnvironment === 'storeClient';

type NotificationsModule = typeof import('expo-notifications');

let prepared = false;
let dispatching = false;
let handlerConfigured = false;
let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (IS_EXPO_GO) return null;

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((Notifications) => {
        if (!handlerConfigured) {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
            }),
          });
          handlerConfigured = true;
        }
        return Notifications;
      })
      .catch(() => null);
  }

  return notificationsModulePromise;
}

export async function dispatchPendingGateNotifications() {
  if (dispatching) return;
  dispatching = true;
  try {
    await supabase.functions.invoke('dkd-gate-push-dispatch', {
      body: { source: 'mobile', appVersion: APP_VERSION },
    });
  } catch {
    // Bildirim dağıtımı ana işlemi engellemez.
  } finally {
    dispatching = false;
  }
}

export async function prepareGateNotifications() {
  if (prepared) return true;

  // SDK 53 ve sonrasında Expo Go, Android uzak bildirimlerini desteklemez.
  // Modülü hiç yüklemeyerek Expo Go'nun açılışta kırmızı hata ekranına düşmesini önleriz.
  if (IS_EXPO_GO) {
    prepared = true;
    return true;
  }

  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'DraBornGate Geçiş Bildirimleri',
        description: 'Kurye, güvenlik, ziyaretçi, aidat ve yönetim işlemleri',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 150, 250],
        sound: 'default',
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return false;

    if (Platform.OS === 'android') {
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        const token = typeof deviceToken.data === 'string' ? deviceToken.data : JSON.stringify(deviceToken.data);
        if (token) {
          await supabase.rpc('dkd_gate_register_push_token', {
            p_token: token,
            p_platform: 'fcm',
            p_device_name: `${Platform.OS} v${APP_VERSION}`,
          });
        }
      } catch {
        // FCM cihaz anahtarı development/release APK içinde yeniden denenecek.
      }
    }

    prepared = true;
    void dispatchPendingGateNotifications();
    return true;
  } catch {
    return false;
  }
}

export async function showGateNotification(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
) {
  void dispatchPendingGateNotifications();

  // Expo Go'da uzak bildirim modülüne dokunma; uygulama içi veri akışı devam eder.
  if (IS_EXPO_GO) return;

  if (!prepared && !(await prepareGateNotifications())) return;

  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;

    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: 'default' },
      trigger: Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
            channelId: CHANNEL_ID,
          }
        : null,
    });
  } catch {
    // İzin kapalıysa veya native bildirim modülü kullanılamıyorsa uygulama akışı devam eder.
  }
}
