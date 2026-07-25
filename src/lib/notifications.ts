import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { APP_VERSION } from '../config/version';
import { supabase } from './supabase';

const IS_EXPO_GO = Constants.appOwnership === 'expo' || (Constants as { executionEnvironment?: string }).executionEnvironment === 'storeClient';
type NotificationsModule = typeof import('expo-notifications');
type SoundProfile = { channelId: string; sound: string; name: string; description: string; vibration: number[] };

const PROFILES: Record<'default' | 'arrival' | 'success' | 'warning' | 'urgent', SoundProfile> = {
  default: { channelId: 'draborngate-system-default-v2', sound: 'gate_bell.wav', name: 'DraBornGate Bildirimleri', description: 'Genel kurye, ziyaretçi, aidat ve yönetim bildirimleri', vibration: [0, 180, 100, 180] },
  arrival: { channelId: 'draborngate-arrival-v2', sound: 'gate_chime.wav', name: 'Kapıya Varış Bildirimleri', description: 'Kurye kapıya geldi, kod hazır ve Akıllı Geçiş bildirimleri', vibration: [0, 250, 100, 250] },
  success: { channelId: 'draborngate-success-v2', sound: 'gate_digital.wav', name: 'Tamamlanan İşlemler', description: 'Onay, kod eşleşmesi, geçiş ve ödeme tamamlanma bildirimleri', vibration: [0, 120, 70, 120] },
  warning: { channelId: 'draborngate-warning-v2', sound: 'gate_alert.wav', name: 'Uyarılar ve Retler', description: 'Reddedilen, iptal edilen ve dikkat gerektiren işlemler', vibration: [0, 350, 120, 350, 120, 350] },
  urgent: { channelId: 'draborngate-urgent-v2', sound: 'gate_siren.wav', name: 'Acil Güvenlik Bildirimleri', description: 'Acil güvenlik ve kritik site bildirimleri', vibration: [0, 500, 150, 500, 150, 500] },
};

let prepared = false;
let dispatching = false;
let handlerConfigured = false;
let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

function profileFor(kindValue: unknown): SoundProfile {
  const kind = typeof kindValue === 'string' ? kindValue.toLowerCase() : '';
  if (kind.includes('urgent') || kind.includes('emergency') || kind.includes('critical')) return PROFILES.urgent;
  if (kind.includes('rejected') || kind.includes('cancel') || kind.includes('failed') || kind.includes('error') || kind.includes('overdue')) return PROFILES.warning;
  if (kind.includes('completed') || kind.includes('approved') || kind.includes('verified') || kind.includes('paid')) return PROFILES.success;
  if (kind.includes('arrived') || kind.includes('airpass') || kind.includes('code') || kind.includes('near_gate')) return PROFILES.arrival;
  return PROFILES.default;
}

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (IS_EXPO_GO) return null;
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications').then((Notifications) => {
      if (!handlerConfigured) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
        });
        handlerConfigured = true;
      }
      return Notifications;
    }).catch(() => null);
  }
  return notificationsModulePromise;
}

export async function dispatchPendingGateNotifications() {
  if (dispatching) return;
  dispatching = true;
  try {
    await supabase.functions.invoke('dkd-gate-push-dispatch', { body: { source: 'mobile', appVersion: APP_VERSION } });
  } catch {
    // Bildirim dağıtımı ana işlemi engellemez.
  } finally {
    dispatching = false;
  }
}

export async function prepareGateNotifications() {
  if (prepared) return true;
  if (IS_EXPO_GO) { prepared = true; return true; }
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return false;
    if (Platform.OS === 'android') {
      for (const profile of Object.values(PROFILES)) {
        await Notifications.setNotificationChannelAsync(profile.channelId, {
          name: profile.name,
          description: profile.description,
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: profile.vibration,
          sound: profile.sound,
          enableVibrate: true,
          enableLights: true,
          lightColor: '#37D8FF',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false,
        });
      }
    }
    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return false;
    if (Platform.OS === 'android') {
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        const token = typeof deviceToken.data === 'string' ? deviceToken.data : JSON.stringify(deviceToken.data);
        if (token) await supabase.rpc('dkd_gate_register_push_token', { p_token: token, p_platform: 'fcm', p_device_name: `${Platform.OS} v${APP_VERSION}` });
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

export async function showGateNotification(title: string, body: string, data: Record<string, unknown> = {}) {
  void dispatchPendingGateNotifications();
  if (IS_EXPO_GO) return;
  if (!prepared && !(await prepareGateNotifications())) return;
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;
    const profile = profileFor(data.kind);
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: profile.sound, badge: 1, priority: Notifications.AndroidNotificationPriority.MAX },
      trigger: Platform.OS === 'android' ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: profile.channelId } : null,
    });
  } catch {
    // İzin kapalıysa veya native bildirim modülü kullanılamıyorsa uygulama akışı devam eder.
  }
}
