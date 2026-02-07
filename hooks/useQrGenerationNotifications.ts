import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  checkNotificationsTableAvailable,
  subscribeToEventQrUpdates,
  subscribeToUserNotifications,
} from "../services/notifications";

type UseQrGenerationNotificationsOptions = {
  eventId?: string | null;
  hasQrToken: boolean;
  onQrGenerated?: () => void;
};

export const useQrGenerationNotifications = ({
  eventId,
  hasQrToken,
  onQrGenerated,
}: UseQrGenerationNotificationsOptions) => {
  const { user } = useAuth();
  const hasQrTokenRef = useRef(hasQrToken);
  const notifiedRef = useRef(false);

  useEffect(() => {
    hasQrTokenRef.current = hasQrToken;
  }, [hasQrToken]);

  useEffect(() => {
    if (!user?.id || !eventId) return undefined;
    let isActive = true;
    let channel: { unsubscribe: () => Promise<"ok" | "error"> } | null = null;
    notifiedRef.current = false;

    const notify = () => {
      if (!isActive || notifiedRef.current || hasQrTokenRef.current) {
        return;
      }
      notifiedRef.current = true;
      Alert.alert("QR already generated");
      onQrGenerated?.();
    };

    const setup = async () => {
      const notificationsAvailable = await checkNotificationsTableAvailable();
      if (!isActive) return;

      if (notificationsAvailable) {
        channel = subscribeToUserNotifications(user.id, () => notify());
      } else {
        channel = subscribeToEventQrUpdates(eventId, notify);
      }
    };

    setup();

    return () => {
      isActive = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [eventId, onQrGenerated, user?.id]);
};
