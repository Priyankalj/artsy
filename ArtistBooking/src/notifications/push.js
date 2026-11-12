import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { getAuthToken } from '../api/client';
import {
  registerDeviceTokenApi,
  unregisterDeviceTokenApi,
} from '../api/notifications';

const CHANNEL_ID = 'artsy-default';
let lastRegisteredToken = null;

async function ensureAndroidPermission() {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function getDeviceToken() {
  const allowed = await ensureAndroidPermission();
  if (!allowed) {
    return null;
  }

  const msg = safeMessaging();
  if (!msg) {
    return null;
  }

  const authStatus = await msg.requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    return null;
  }

  return msg.getToken();
}

export async function registerPushToken() {
  if (!getAuthToken()) {
    return null;
  }

  try {
    const token = await getDeviceToken();
    if (!token) {
      return null;
    }
    await registerDeviceTokenApi(token, Platform.OS === 'ios' ? 'ios' : 'android');
    lastRegisteredToken = token;
    return token;
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] register failed', error?.message);
    }
    return null;
  }
}

export async function unregisterPushToken() {
  const token = lastRegisteredToken;
  lastRegisteredToken = null;
  if (!token || !getAuthToken()) {
    return;
  }
  try {
    await unregisterDeviceTokenApi(token);
  } catch {
    // logout should still succeed
  }
}

export async function displayForegroundNotification(remoteMessage) {
  const notification = remoteMessage?.notification;
  const data = remoteMessage?.data || {};
  const title = notification?.title || 'Artsy';
  const body = notification?.body || '';

  const channelId = await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Artsy',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      sound: 'default',
      pressAction: { id: 'default' },
    },
    ios: { sound: 'default' },
    data,
  });
}

function safeMessaging() {
  try {
    return messaging();
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] messaging unavailable', error?.message);
    }
    return null;
  }
}

export function listenForPushTokenRefresh() {
  const msg = safeMessaging();
  if (!msg) {
    return () => {};
  }
  return msg.onTokenRefresh(async token => {
    lastRegisteredToken = token;
    if (!getAuthToken() || !token) {
      return;
    }
    try {
      await registerDeviceTokenApi(
        token,
        Platform.OS === 'ios' ? 'ios' : 'android',
      );
    } catch {
      // ignore
    }
  });
}

export function listenForForegroundMessages() {
  const msg = safeMessaging();
  if (!msg) {
    return () => {};
  }
  return msg.onMessage(async remoteMessage => {
    await displayForegroundNotification(remoteMessage);
  });
}

export function listenForNotificationOpens(onOpen) {
  const msg = safeMessaging();
  if (!msg) {
    return () => {};
  }
  const unsubOpened = msg.onNotificationOpenedApp(remoteMessage => {
    if (remoteMessage?.data) {
      onOpen(remoteMessage.data);
    }
  });

  const unsubNotifee = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS && detail?.notification?.data) {
      onOpen(detail.notification.data);
    }
  });

  msg.getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage?.data) {
        onOpen(remoteMessage.data);
      }
    });

  return () => {
    unsubOpened();
    unsubNotifee();
  };
}
