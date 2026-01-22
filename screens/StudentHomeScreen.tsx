import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";

export default function StudentHomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, loading } = useAuth();

  /* ===============================
     ROUTE PROTECTION (CORRECT WAY)
     =============================== */
  useEffect(() => {
    if (loading) return;

    if (!user || user.role !== "student") {
      router.replace("/login");
    }
  }, [user, loading]);

  /* ===============================
     RENDER GUARD (NO NAVIGATION)
     =============================== */
  if (loading || !user || user.role !== "student") {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Student Dashboard
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/clubs")}
      >
        <Text style={styles.buttonText}>View Clubs</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/events")}
      >
        <Text style={styles.buttonText}>Events</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/attendance-history")}
      >
        <Text style={styles.buttonText}>Attendance History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/notifications")}
      >
        <Text style={styles.buttonText}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.buttonText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    width: "80%",
    marginBottom: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});
