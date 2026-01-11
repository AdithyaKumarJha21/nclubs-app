// services/notifications.ts
import OneSignal from 'react-native-onesignal';
import { supabase } from './supabase';
import { Platform } from 'react-native';

const ONESIGNAL_APP_ID = 'YOUR_ONESIGNAL_APP_ID'; // Replace with real one

export function initOneSignal() {
  OneSignal.setAppId(ONESIGNAL_APP_ID);

  // Prompt for push on iOS
  OneSignal.promptForPushNotificationsWithUserResponse((granted) => {
    console.log('Permission granted:', granted);
  });

  // Optional: Set notification handlers
  OneSignal.setNotificationWillShowInForegroundHandler((event) => {
    let notification = event.getNotification();
    console.log('Notification in foreground:', notification);
    event.complete(notification);
  });

  OneSignal.setNotificationOpenedHandler((openedEvent) => {
    console.log('Notification opened:', openedEvent);
  });
}

export async function registerDeviceForPush() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.log('Not logged in, cannot register device.');
    return;
  }

  const state = await OneSignal.getDeviceState();

  const onesignalId = state?.userId ?? null;
  const token = state?.pushToken ?? null;

  const platform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown';

  if (!onesignalId || !token) {
    console.warn('OneSignal device not ready yet.');
    return;
  }

  const { error: upsertError } = await supabase.from('user_devices').upsert(
    {
      user_id: user.id,
      onesignal_id: onesignalId,
      device_token: token,
      platform,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,onesignal_id' }
  );

  if (upsertError) {
    console.error('Failed to upsert device:', upsertError);
  }
}
