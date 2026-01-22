import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../services/supabase";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";

export default function FacultyHomeScreen() {
  const router = useRouter();
  const { theme, isDark, setIsDark } = useTheme();
  const { user, loading } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  /* ===============================
     ROUTE PROTECTION (CORRECT WAY)
     =============================== */
  useEffect(() => {
    if (loading) return;

    if (!user || (user.role !== "faculty" && user.role !== "admin")) {
      router.replace("/login");
    }
  }, [user, loading]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  /* ===============================
     RENDER GUARD (NO NAVIGATION)
     =============================== */
  if (
    loading ||
    !user ||
    (user.role !== "faculty" && user.role !== "admin")
  ) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Notifications and Settings */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/notifications")}>
          <Ionicons
            name="notifications-outline"
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Settings Dropdown Menu */}
      {showMenu && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: theme.card || "#f5f5f5" },
          ]}
        >
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              router.push("/edit-profile");
              setShowMenu(false);
            }}
          >
            <Ionicons name="person-outline" size={18} color={theme.text} />
            <Text style={[styles.menuText, { color: theme.text }]}>
              Edit Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              router.push("/change-password");
              setShowMenu(false);
            }}
          >
            <Ionicons name="lock-closed-outline" size={18} color={theme.text} />
            <Text style={[styles.menuText, { color: theme.text }]}>
              Change Password
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              router.push("/calendar");
              setShowMenu(false);
            }}
          >
            <Ionicons name="calendar-outline" size={18} color={theme.text} />
            <Text style={[styles.menuText, { color: theme.text }]}>
              Calendar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setIsDark(!isDark);
            }}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color={theme.text}
            />
            <Text style={[styles.menuText, { color: theme.text }]}>
              {isDark ? "Light Mode" : "Dark Mode"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutItem]}
            onPress={() => {
              setShowMenu(false);
              handleLogout();
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={[styles.menuText, { color: "#ef4444" }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.title, { color: theme.text }]}>
        Faculty Dashboard
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/clubs")}
      >
        <Text style={styles.buttonText}>Manage Clubs</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/event-management")}
      >
        <Text style={styles.buttonText}>Manage Events</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/attendance-history")}
      >
        <Text style={styles.buttonText}>Attendance History</Text>
      </TouchableOpacity>
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
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    paddingTop: 8,
  },
  settingsButton: {
    padding: 8,
  },
  dropdown: {
    position: "absolute",
    top: 60,
    right: 16,
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "500",
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
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
    width: "100%",
    marginBottom: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});
