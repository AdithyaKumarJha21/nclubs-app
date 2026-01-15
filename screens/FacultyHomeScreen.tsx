import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";

export default function FacultyHomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, loading } = useAuth();

  /* ===============================
     ROUTE PROTECTION (CORRECT)
     =============================== */
  if (loading) {
    return null;
  }

  if (!user || (user.role !== "faculty" && user.role !== "admin")) {
    router.replace("/login");
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Faculty Dashboard
      </Text>

      {/* Clubs */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/clubs")}
      >
        <Text style={styles.buttonText}>Manage Clubs</Text>
      </TouchableOpacity>

      {/* Events */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/events")}
      >
        <Text style={styles.buttonText}>Events</Text>
      </TouchableOpacity>

      {/* Attendance History */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/attendance-history")}
      >
        <Text style={styles.buttonText}>Attendance History</Text>
      </TouchableOpacity>

      {/* Notifications */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/notifications")}
      >
        <Text style={styles.buttonText}>Notifications</Text>
      </TouchableOpacity>

      {/* Settings */}
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
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
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
