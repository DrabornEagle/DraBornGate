import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { APP_VERSION } from '../config/version';
import { supabase } from './supabase';

const IS_EXPO_GO = Constants.appOwnership === 'expo' || (Constants as { executionEnvironment?: string }).executionEnvironment === 'storeClient';
const SOUND_STORAGE_KEY = 'dkd_gate_notification_sound_v2';

type NotificationsModule = typeof import('expo-notifications');
export type GateNotificationSoundKey = 'system' | 'bell' | 'chime' | 'digital' | 'alert' | 'pulse' | 'signal' | 'silent';
export type GateNotificationSoundOption = {
  key: GateNotificationSoundKey;
  title: string;
  description: string;
  sound: string | null;
  channelId: string;
  vibration: number[];
};

export const GATE_NOTIFICATION_SOUND_OPTIONS: GateNotificationSoundOption[] = [
  { key: 'system', title: 'Telefonun Varsayılan Sesi', description: 'Android bildirim ayarlarında seçili olan sistem sesi', sound: 'default', channelId: 'draborngate-user-system-v2', vibration: [0, 180, 80, 180] },
  { key: 'bell', title: 'Premium Kapı Zili', description: 'Uzun, belirgin ve yüksek üç aşamalı klasik zil', sound: 'gate_bell_v2.wav', channelId: 'draborngate-user-bell-v2', vibration: [0, 220, 90, 260, 90, 300] },
  { key: 'chime', title: 'Kristal Melodi', description: 'Modern, temiz ve uzun yükselen melodi', sound: 'gate_chime_v2.wav', channelId: 'draborngate-user-chime-v2', vibration: [0, 170, 70, 190, 70, 230] },
  { key: 'digital', title: 'Dijital Geçiş', description: 'Teknolojik, hızlı ve daha güçlü dijital ton', sound: 'gate_digital_v2.wav', channelId: 'draborngate-user-digital-v2', vibration: [0, 120, 55, 140, 55, 180] },
  { key: 'alert', title: 'Güvenlik Uyarısı', description: 'En yüksek dikkat seviyesinde uzun güvenlik tonu', sound: 'gate_alert_v2.wav', channelId: 'draborngate-user-alert-v2', vibration: [0, 340, 100, 340, 100, 440] },
  { key: 'pulse', title: 'Neon Nabız', description: 'Modern ve ritmik beş aşamalı bildirim melodisi', sound: 'gate_pulse_v2.wav', channelId: 'draborngate-user-pulse-v2', vibration: [0, 130, 60, 160, 60, 220] },
  { key: 'signal', title: 'Akıllı Sinyal', description: 'Uzun, yükselen ve uzaktan kolay duyulan sinyal', sound: 'gate_signal_v2.wav', channelId: 'draborngate-user-signal-v2', vibration: [0, 190, 70, 220, 70, 300] },
  { key: 'silent', title: 'Sessiz', description: 'Yalnızca görsel bildirim ve titreşim', sound: null, channelId: 'draborngate-user-silent-v2', vibration: [0, 160, 90, 160] },
];

let prepared = false;
let dispatching = false;
let handlerConfigured = false;
let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

const DEFAULT_GATE_NOTIFICATION_SOUND = GATE_NOTIFICATION_SOUND_OPTIONS[0]!;

function optionByKey(key?: string | null): GateNotificationSoundOption {
  return GATE_NOTIFICATION_SOUND_OPTIONS.find((item) => item.key === key) ?? DEFAULT_GATE_NOTIFICATION_SOUND;
}

async function getNotificationsModule(): Promise<NotificationsModule | null> {
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

async function ensureSoundChannel(option: GateNotificationSoundOption) {
  if (Platform.OS !== 'android') return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await Notifications.setNotificationChannelAsync(option.channelId, {
    name: `DraBornGate • ${option.title}`,
    description: option.description,
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: option.vibration,
    sound: option.sound,
    enableVibrate: true,
    enableLights: true,
    lightColor: '#37D8FF',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
}

export async function getGateNotificationSound(): Promise<GateNotificationSoundKey> {
  const saved = await AsyncStorage.getItem(SOUND_STORAGE_KEY);
  return optionByKey(saved).key;
}

export async function setGateNotificationSound(key: GateNotificationSoundKey) {
  const option = optionByKey(key);
  await AsyncStorage.setItem(SOUND_STORAGE_KEY, option.key);
  await ensureSoundChannel(option);
  return option.key;
}

export async function previewGateNotificationSound(key: GateNotificationSoundKey) {
  const Notifications = await getNotificationsModule();
  if (!Notifications) throw new Error('Bildirim modülü bu cihazda kullanılamıyor.');
  const option = optionByKey(key);
  await setGateNotificationSound(option.key);
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Bildirim izni verilmedi.');
  await Notifications.scheduleNotificationAsync({
    content: {
      title: option.title,
      body: option.key === 'silent' ? 'Sessiz bildirim seçildi.' : 'DraBornGate zil sesi önizlemesi.',
      sound: option.sound || false,
      data: { kind: 'sound_preview', soundKey: option.key },
    },
    trigger: Platform.OS === 'android'
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: option.channelId }
      : null,
  });
}

export async function dispatchPendingGateNotifications() {
  if (dispatching) return;
  dispatching = true;
  try {
    await supabase.functions.invoke('dkd-gate-push-dispatch', {
      body: { source: IS_EXPO_GO ? 'expo-go' : 'mobile', appVersion: APP_VERSION },
    });
  } catch {
    // Bildirim dağıtımı ana işlemi engellemez.
  } finally {
    dispatching = false;
  }
}

export async function prepareGateNotifications() {
  if (prepared) return true;
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return false;

    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return false;

    const selected = optionByKey(await AsyncStorage.getItem(SOUND_STORAGE_KEY));
    await ensureSoundChannel(selected);

    if (Platform.OS === 'android' && !IS_EXPO_GO) {
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
    if (!IS_EXPO_GO) void dispatchPendingGateNotifications();
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
  if (!IS_EXPO_GO) void dispatchPendingGateNotifications();
  if (!prepared && !(await prepareGateNotifications())) return;

  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;
    const selected = optionByKey(await AsyncStorage.getItem(SOUND_STORAGE_KEY));
    await ensureSoundChannel(selected);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: selected.sound || false,
      },
      trigger: Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
            channelId: selected.channelId,
          }
        : null,
    });
  } catch {
    // İzin kapalıysa veya native bildirim modülü kullanılamıyorsa uygulama akışı devam eder.
  }
}
