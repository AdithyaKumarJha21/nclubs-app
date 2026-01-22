import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

export default function NotificationComposerScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [notificationsToday, setNotificationsToday] = useState(0);
  const [canSend, setCanSend] = useState(false);

  useEffect(() => {
    checkNotificationLimit();
  }, []);

  const checkNotificationLimit = async () => {
    try {
      // ✅ CHECK IF USER IS FACULTY/PRESIDENT/ADMIN
      if (!user || (user.role !== "faculty" && user.role !== "president" && user.role !== "admin")) {
        Alert.alert("Error", "Only faculty or president can send notifications");
        router.back();
        return;
      }

      // ✅ GET TODAY'S DATE RANGE
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // ✅ COUNT NOTIFICATIONS CREATED TODAY
      const { data, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString());

      if (error) {
        console.error("Error checking notification limit:", error);
        setCanSend(false);
        return;
      }

      const count = data?.length || 0;
      setNotificationsToday(count);
      setCanSend(count < 2); // Allow up to 2 per day
    } catch (err) {
      console.error("Unexpected error:", err);
      setCanSend(false);
    }
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!canSend) {
      Alert.alert(
        "Limit Reached",
        `You can only send 2 notifications per day. You've already sent ${notificationsToday} today.`
      );
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("notifications").insert({
        title: title.trim(),
        body: body.trim(),
        created_at: new Date().toISOString(),
      });

      if (error) {
        Alert.alert("Error", "Failed to send notification");
        console.error("Insert error:", error);
        setLoading(false);
        return;
      }

      Alert.alert("Success", "Notification sent!");
      setTitle("");
      setBody("");
      setNotificationsToday(notificationsToday + 1);
      setCanSend(notificationsToday + 1 < 2);

      // Navigate back after 1 second
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (err) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error("Unexpected error:", err);
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.heading, { color: theme.text }]}>
        Send Notification
      </Text>

      <Text style={[styles.limitText, { color: theme.text }]}>
        Notifications sent today: {notificationsToday}/2
      </Text>

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
            backgroundColor: canSend ? "#2563eb" : "#d1d5db",
            opacity: loading ? 0.6 : 1,
          },
        ]}
        onPress={handleSendNotification}
        disabled={!canSend || loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Send Notification</Text>
        )}
      </TouchableOpacity>

      {!canSend && (
        <Text style={[styles.warningText, { color: "#ef4444" }]}>
          You've reached the 2 notifications per day limit. Try again tomorrow.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
