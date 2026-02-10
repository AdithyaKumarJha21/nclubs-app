import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../services/supabase";

import ClubCard from "../components/ClubCard";
import ClubSearchBar from "../components/ClubSearchBar";
import ClubSearchEmptyState from "../components/ClubSearchEmptyState";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";

type Club = {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
};

export default function PresidentHomeScreen() {
  const router = useRouter();
  const { theme, isDark, setIsDark } = useTheme();
  const { user, loading } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  /* ===============================
     ROUTE PROTECTION (SAFE)
     =============================== */
  useEffect(() => {
    if (loading) return;

    if (!user || user.role !== "president") {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadClubs = async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, logo_url, description")
        .order("name");

      if (error) {
        console.error(error);
        setClubs([]);
        setClubsLoading(false);
        return;
      }

      setClubs(data ?? []);
      setClubsLoading(false);
    };

    loadClubs();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  /* ===============================
     RENDER GUARD (NO NAVIGATION)
     =============================== */
  if (loading || !user || user.role !== "president") {
    return null;
  }

  if (clubsLoading) {
    return null;
  }

  const trimmedQuery = searchQuery.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const filteredClubs = normalizedQuery
    ? clubs.filter((club) => {
        const nameMatch = club.name.toLowerCase().includes(normalizedQuery);
        const descriptionMatch = club.description
          ? club.description.toLowerCase().includes(normalizedQuery)
          : false;
        return nameMatch || descriptionMatch;
      })
    : clubs;

  const showEmptyState = normalizedQuery.length > 0 && filteredClubs.length === 0;

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
        President Dashboard
      </Text>

      <View style={styles.searchWrapper}>
        <ClubSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />
      </View>

      <FlatList
        data={filteredClubs}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push("/clubs")}
            >
              <Text style={styles.buttonText}>Manage Club</Text>
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

            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push("/change-president")}
            >
              <Text style={styles.buttonText}>Change President</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          showEmptyState ? (
            <ClubSearchEmptyState
              searchTerm={trimmedQuery}
              onClear={() => setSearchQuery("")}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <ClubCard
            name={item.name}
            logo={item.logo_url ?? ""}
            onPress={() =>
              router.push({
                pathname: "/club-profile",
                params: { clubId: item.id },
              })
            }
          />
        )}
      />
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
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  searchWrapper: {
    marginBottom: 16,
  },
  list: {
    paddingBottom: 16,
  },
  actions: {
    paddingTop: 8,
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
