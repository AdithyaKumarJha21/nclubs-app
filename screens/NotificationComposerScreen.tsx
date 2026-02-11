import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { normalizeSupabaseError } from "../services/api/errors";
import {
  getNotificationClubOptions,
  NotificationClubOption,
  sendNotification,
} from "../services/notifications";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

type SupabaseRequestError = Error & { code?: string };

export default function NotificationComposerScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [notificationsToday, setNotificationsToday] = useState(0);
  const [canSend, setCanSend] = useState(false);
  const [clubOptions, setClubOptions] = useState<NotificationClubOption[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);
  const [loadingClubs, setLoadingClubs] = useState(true);

  const loadClubOptions = useCallback(async () => {
    try {
      if (!user || (user.role !== "faculty" && user.role !== "president" && user.role !== "admin")) {
        return;
      }

      setLoadingClubs(true);
      const options = await getNotificationClubOptions(user.role, user.id);
      setClubOptions(options);

      if (user.role === "faculty" || user.role === "president") {
        setClubId(options[0]?.id ?? null);
      } else {
        setClubId((currentClubId) => {
          if (currentClubId && options.some((option) => option.id === currentClubId)) {
            return currentClubId;
          }

          return options[0]?.id ?? null;
        });
      }
    } catch (error) {
      console.error("Error loading notification clubs:", error);
      setClubOptions([]);
      setClubId(null);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to load clubs.");
    } finally {
      setLoadingClubs(false);
    }
  }, [user]);

  const checkNotificationLimit = useCallback(async () => {
    try {
      if (!user || (user.role !== "faculty" && user.role !== "president" && user.role !== "admin")) {
        Alert.alert("Error", "Only faculty or president can send notifications");
        router.back();
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString());

      if (error) {
        console.error("Error checking notification limit:", error);
        setCanSend(false);
        return;
      }

      const resolvedCount = count ?? 0;
      setNotificationsToday(resolvedCount);
      setCanSend(resolvedCount < 2);
    } catch (err) {
      console.error("Unexpected error:", err);
      setCanSend(false);
    }
  }, [router, user]);

  useEffect(() => {
    checkNotificationLimit();
    loadClubOptions();
  }, [checkNotificationLimit, loadClubOptions]);

  const handleSendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!clubId) {
      Alert.alert("Error", "Please select a club before sending.");
      return;
    }

    if (!canSend) {
      Alert.alert(
        "Limit Reached",
        `You can only send 2 notifications per day. You've already sent ${notificationsToday} today.`
      );
      return;
    }

    if (!user || (user.role !== "faculty" && user.role !== "president" && user.role !== "admin")) {
      Alert.alert("Error", "Only faculty or president can send notifications");
      return;
    }

    setLoading(true);

    try {
      await sendNotification({
        clubId,
        title,
        body,
        role: user.role,
      });

      Alert.alert("Success", "Notification sent!");
      setTitle("");
      setBody("");
      setNotificationsToday((prev) => prev + 1);
      setCanSend(notificationsToday + 1 < 2);

      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error) {
      console.error("Notification send failed:", error);
      const typedError = error as SupabaseRequestError;

      if (typedError.code === "42501") {
        Alert.alert(
          "Error",
          "Not authorized to send notification for this club. Check assignment."
        );
      } else {
        Alert.alert("Error", normalizeSupabaseError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <Text style={[styles.heading, { color: theme.text }]}>Send Notification</Text>

      <Text style={[styles.limitText, { color: theme.text }]}>Notifications sent today: {notificationsToday}/2</Text>

      <Text style={[styles.label, { color: theme.text }]}>Club</Text>
      {loadingClubs ? (
        <ActivityIndicator color={theme.text} style={styles.clubLoader} />
      ) : (
        <View style={styles.clubOptionsWrap}>
          {clubOptions.map((option) => {
            const selected = option.id === clubId;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.clubChip,
                  {
                    borderColor: selected ? "#2563eb" : "#9ca3af",
                    backgroundColor: selected ? "#dbeafe" : "transparent",
                  },
                ]}
                onPress={() => setClubId(option.id)}
                disabled={loading}
              >
                <Text style={{ color: theme.text, fontWeight: selected ? "700" : "500" }}>
                  {option.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {clubOptions.length === 0 && (
            <Text style={[styles.assignmentWarning, { color: "#ef4444" }]}>No club assignment found. Contact admin.</Text>
          )}
        </View>
      )}

      <TextInput
        style={[
          styles.input,
          { borderColor: theme.text, color: theme.text },
        ]}
        placeholder="Title"
        placeholderTextColor={theme.text}
        value={title}
        onChangeText={setTitle}
        editable={!loading}
      />

      <TextInput
        style={[
          styles.input,
          styles.textArea,
          { borderColor: theme.text, color: theme.text },
        ]}
        placeholder="Body"
        placeholderTextColor={theme.text}
        multiline
        value={body}
        onChangeText={setBody}
        editable={!loading}
      />

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: canSend && !loadingClubs && Boolean(clubId) ? "#2563eb" : "#d1d5db",
            opacity: loading ? 0.6 : 1,
          },
        ]}
        onPress={handleSendNotification}
        disabled={!canSend || loading || loadingClubs || !clubId}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Send Notification</Text>
        )}
      </TouchableOpacity>

      {!canSend && (
        <Text style={[styles.warningText, { color: "#ef4444" }]}>You have reached the 2 notifications per day limit. Try again tomorrow.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  limitText: {
    fontSize: 12,
    marginBottom: 16,
    fontWeight: "500",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  clubLoader: {
    marginBottom: 12,
  },
  clubOptionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  clubChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  assignmentWarning: {
    fontSize: 12,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
  },
  button: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  warningText: {
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
});
