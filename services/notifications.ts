import { Platform } from "react-native";
import OneSignal from "react-native-onesignal";
import { supabase } from "./supabase";

type ForegroundEvent = {
  getNotification: () => unknown;
  complete: (notification?: unknown) => void;
};

/**
 * Init OneSignal ONCE (call from root layout).
 * Compatible with react-native-onesignal v5.x (with local typings).
 */
export function initOneSignal(appId: string) {
  if (!appId) {
    console.warn("initOneSignal: missing OneSignal appId");
    return;
  }

  OneSignal.initialize(appId);

  // Ask permission (iOS + Android 13+)
  // v5 API
  void OneSignal.Notifications.requestPermission(true);

  // Keep handler reference so removeEventListener works if you ever need it.
  const handler = (event: ForegroundEvent) => {
    try {
      const notif = event.getNotification();
      // show notification while foreground (optional)
      event.complete(notif);
    } catch {
      // if anything fails, complete without showing
      event.complete();
    }
  };

  OneSignal.Notifications.addEventListener("foregroundWillDisplay", handler);
}

/**
 * Register/refresh device token + OneSignal userId in Supabase user_devices.
 */
export async function registerDeviceForPush() {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return;

  const state = await OneSignal.User.getDeviceState();
  const onesignalId = state?.userId ?? null;
  const token = state?.pushToken ?? null;

  const platform =
    Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";

  // Avoid writing an empty record
  if (!onesignalId && !token) return;

  const { error } = await supabase.from("user_devices").upsert(
    {
      user_id: user.id,
      onesignal_id: onesignalId,
      device_token: token,
      platform,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,onesignal_id" }
  );

  if (error) console.log("registerDeviceForPush error:", error);
}

export async function hasPushPermission(): Promise<boolean> {
  try {
    return await OneSignal.Notifications.getPermissionAsync();
  } catch {
    return false;
  }
}
