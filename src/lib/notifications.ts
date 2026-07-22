import Constants from 'expo-constants';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let notificationsPromise: Promise<NotificationsModule | null> | null = null;
let handlerConfigured = false;

function isRunningInExpoGo() {
  return Constants.expoGoConfig != null;
}

async function loadNotifications(): Promise<NotificationsModule | null> {
  // Android remote notifications are not available in Expo Go on SDK 53+.
  // Avoid importing the native module there because the import itself can stop
  // the JavaScript runtime before the first screen is rendered.
  if (isRunningInExpoGo()) return null;

  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications')
      .then((Notifications) => {
        if (!handlerConfigured) {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldPlaySound: true,
              shouldSetBadge: false,
              shouldShowBanner: true,
              shouldShowList: true,
            }),
          });
          handlerConfigured = true;
        }
        return Notifications;
      })
      .catch(() => null);
  }

  return notificationsPromise;
}

export async function prepareGateNotifications() {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('draborngate-core', {
      name: 'DraBornGate Geçiş ve Aidat Bildirimleri',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#37D8FF',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (!current.granted) await Notifications.requestPermissionsAsync();
  return true;
}

export async function showGateNotification(
  title: string,
  body: string,
  data: Record<string, string | number | boolean> = {},
) {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null,
  });
  return true;
}
