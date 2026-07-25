import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { APP_VERSION } from '../config/version';
import { supabase } from './supabase';

const CHANNEL_ID = 'draborngate-core';
let prepared = false;
let dispatching = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function dispatchPendingGateNotifications() {
  if (dispatching) return;
  dispatching = true;
  try { await supabase.functions.invoke('dkd-gate-push-dispatch', { body: { source: 'mobile', appVersion: APP_VERSION } }); }
  catch { /* Bildirim dağıtımı ana işlemi engellemez. */ }
  finally { dispatching = false; }
}

export async function prepareGateNotifications() {
  try {
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

    const isExpoGo = Constants.appOwnership === 'expo';
    if (Platform.OS === 'android' && !isExpoGo) {
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        const token = typeof deviceToken.data === 'string' ? deviceToken.data : JSON.stringify(deviceToken.data);
        if (token) {
          await supabase.rpc('dkd_gate_register_push_token', {
            p_provider: 'fcm',
            p_token: token,
            p_device_type: Platform.OS,
            p_app_version: APP_VERSION,
          });
        }
      } catch { /* FCM tokeni APK içinde yeniden denenecek. */ }
    }

    prepared = true;
    void dispatchPendingGateNotifications();
    return true;
  } catch {
    return false;
  }
}

export async function showGateNotification(title: string, body: string, data: Record<string, unknown> = {}) {
  void dispatchPendingGateNotifications();
  if (!prepared) await prepareGateNotifications();
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: 'default' },
      trigger: Platform.OS === 'android' ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: CHANNEL_ID } : null,
    });
  } catch {
    // Expo Go veya izin kapalıyken uygulama akışı devam eder.
  }
}
