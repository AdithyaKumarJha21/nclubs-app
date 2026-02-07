import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type NotificationRow = {
  id: string;
  title: string | null;
  body: string | null;
  user_id: string | null;
  created_at: string | null;
};

type EventRow = {
  id: string;
  qr_enabled: boolean | null;
};

export const checkNotificationsTableAvailable = async (): Promise<boolean> => {
  const { error } = await supabase.from("notifications").select("id").limit(1);

  if (!error) {
    return true;
  }

  if (error.code === "42P01") {
    return false;
  }

  console.error("Notifications table check failed:", error);
  return false;
};

export const subscribeToUserNotifications = (
  userId: string,
  onInsert: (notification: NotificationRow) => void
): RealtimeChannel => {
  return supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
        if (payload.new) {
          onInsert(payload.new);
        }
      }
    )
    .subscribe();
};

export const subscribeToEventQrUpdates = (
  eventId: string,
  onQrEnabled: () => void
): RealtimeChannel => {
  return supabase
    .channel(`event-qr-${eventId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "events",
        filter: `id=eq.${eventId}`,
      },
      (payload: RealtimePostgresChangesPayload<EventRow>) => {
        if (payload.new?.qr_enabled && !payload.old?.qr_enabled) {
          onQrEnabled();
        }
      }
    )
    .subscribe();
};
