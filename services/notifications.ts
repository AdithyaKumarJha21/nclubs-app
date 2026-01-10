import { Platform } from "react-native";
import OneSignal from "react-native-onesignal";
import { supabase } from "./supabase";

/**
 * Call once after app start (e.g. in root layout).
 */
export function initOneSignal() {
  // Put your OneSignal App ID here:
  OneSignal.init("ONESIGNAL_APP_ID");

  // Recommended: ask permission (iOS) + Android 13+ prompt
  OneSignal.requestPermissions({
    iosSettings: {
      alert: true,
      badge: true,
      sound: true,
    },
  });
}

/**
 * Store/refresh device token + OneSignal ID in Supabase user_devices table.
 * This is your "device registered" requirement.
 */
export async function registerDeviceForPush() {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return;

  // Get device state
  const state = await OneSignal.getPermissionSubscriptionState();

  // OneSignal's unique device identifier
  const onesignalId = state?.subscriptionStatus?.userId;

  // Native push subscription token
  const token = state?.subscriptionStatus?.pushToken;

  const platform =
    Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";

  // Upsert device record: one user can have multiple devices.
  // We'll use onesignal_id as the "uniqueness" key client-side.
  // If you want true uniqueness, create a unique index in DB on (user_id, onesignal_id).
  const { error } = await supabase.from("user_devices").upsert(
    {
      user_id: user.id,
      onesignal_id: onesignalId ?? null,
      device_token: token ?? null,
      platform,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,onesignal_id" }
  );

  if (error) {
    console.log("registerDeviceForPush error:", error);
  }
}
