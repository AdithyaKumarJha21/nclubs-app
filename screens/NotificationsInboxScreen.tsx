import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

type Notification = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export default function NotificationsInboxScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAndFilterNotifications();
    // Refresh notifications every 10 seconds to catch expirations
    const interval = setInterval(fetchAndFilterNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAndFilterNotifications = async () => {
    try {
      setLoading(true);

      // ✅ FETCH ALL NOTIFICATIONS FROM DATABASE
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        setNotifications([]);
        setLoading(false);
        return;
      }

      // ✅ FILTER OUT EXPIRED NOTIFICATIONS (OLDER THAN 48 HOURS)
      const now = new Date();
      const validNotifications = (data || []).filter(
        (notification: any) => {
          const createdAt = new Date(notification.created_at);
          const ageInMs = now.getTime() - createdAt.getTime();
          const ageInHours = ageInMs / (1000 * 60 * 60);
          return ageInHours < 48; // Only show if less than 48 hours old
        }
      );

      setNotifications(validNotifications);
      setLoading(false);
    } catch (err) {
      console.error("Unexpected error:", err);
      setNotifications([]);
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    // Check if user is faculty or president
    if (!user || (user.role !== "faculty" && user.role !== "president" && user.role !== "admin")) {
      Alert.alert("Error", "Only faculty or president can delete notifications");
      return;
    }

    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("notifications")
                .delete()
                .eq("id", notificationId);

              if (error) {
                Alert.alert("Error", "Failed to delete notification");
                console.error("Delete error:", error);
                return;
              }

              setNotifications((prev) =>
                prev.filter((n) => n.id !== notificationId)
              );
              Alert.alert("Success", "Notification deleted");
            } catch (err) {
              Alert.alert("Error", "An unexpected error occurred");
              console.error("Unexpected error:", err);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: theme.text }]}>
          Notifications
        </Text>
        {(user?.role === "faculty" ||
          user?.role === "president" ||
          user?.role === "admin") && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/compose-notification")}
          >
            <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.text }]}>
          No notifications at the moment.
        </Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.card || "#f9fafb" },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardText}>
                  <Text style={[styles.title, { color: theme.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.message, { color: theme.text }]}>
                    {item.body}
                  </Text>
                </View>
                {(user?.role === "faculty" ||
                  user?.role === "president" ||
                  user?.role === "admin") && (
                  <TouchableOpacity
                    onPress={() => handleDeleteNotification(item.id)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color="#ef4444"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
  },
  addButton: {
    padding: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
  card: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardText: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontWeight: "600",
    fontSize: 14,
  },
  message: {
    fontSize: 12,
    marginTop: 4,
  },
  meta: {
    fontSize: 11,
    marginTop: 4,
  },
});
