import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
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

const TRANSFER_CONFIRMATION_PHRASE = "TRANSFER PRESIDENT";

const isValidEmailAddress = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function PresidentHomeScreen() {
  const router = useRouter();
  const { theme, isDark, setIsDark } = useTheme();
  const { user, loading } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubIdLoading, setClubIdLoading] = useState(true);
  const [transferEmail, setTransferEmail] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

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
    if (!user?.id || user.role !== "president") {
      return;
    }

    const loadPresidentClubId = async () => {
      setClubIdLoading(true);

      const { data, error } = await supabase
        .from("president_assignments")
        .select("club_id")
        .eq("user_id", user.id)
        .maybeSingle<{ club_id: string | null }>();

      if (error || !data?.club_id) {
        setClubId(null);
        setClubIdLoading(false);
        return;
      }

      setClubId(data.club_id);
      setClubIdLoading(false);
    };

    loadPresidentClubId();
  }, [user?.id, user?.role]);

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

  const trimmedTransferEmail = transferEmail.trim();
  const emailError =
    trimmedTransferEmail.length === 0
      ? "Email is required."
      : isValidEmailAddress(trimmedTransferEmail)
      ? null
      : "Please enter a valid email address.";

  const confirmError =
    confirmText.length === 0
      ? "Confirmation phrase is required."
      : confirmText === TRANSFER_CONFIRMATION_PHRASE
      ? null
      : `Type \"${TRANSFER_CONFIRMATION_PHRASE}\" exactly to continue.`;

  const isTransferDisabled =
    Boolean(emailError) ||
    Boolean(confirmError) ||
    isTransferring ||
    clubIdLoading ||
    !clubId;

  const handleTransferPresident = async () => {
    if (isTransferDisabled || !clubId) {
      return;
    }

    setIsTransferring(true);

    const { error } = await supabase.rpc("transfer_president_by_email", {
      p_club_id: clubId,
      p_new_president_email: trimmedTransferEmail,
      p_confirm: confirmText,
    });

    if (error) {
      Alert.alert("Transfer failed", error.message);
      setIsTransferring(false);
      return;
    }

    Alert.alert("Success", "President role transferred successfully.");
    await supabase.auth.signOut();
    router.replace({
      pathname: "/login",
      params: { signedOut: "1" },
    });
    setIsTransferring(false);
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
              onPress={() => router.push("/club-profile")}
            >
              <Text style={styles.buttonText}>Change President</Text>
            </TouchableOpacity>

            <View style={styles.transferSection}>
              <Text style={[styles.transferTitle, { color: theme.text }]}>Transfer President</Text>
              <Text style={[styles.transferHint, { color: theme.text }]}>Type the new president email and the exact confirmation phrase.</Text>

              <TextInput
                style={[styles.transferInput, { color: theme.text, borderColor: "#d1d5db" }]}
                placeholder="new-president@email.com"
                placeholderTextColor="#9ca3af"
                value={transferEmail}
                onChangeText={setTransferEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {emailError ? <Text style={styles.inlineError}>{emailError}</Text> : null}

              <TextInput
                style={[styles.transferInput, { color: theme.text, borderColor: "#d1d5db" }]}
                placeholder={TRANSFER_CONFIRMATION_PHRASE}
                placeholderTextColor="#9ca3af"
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
              />
              {confirmError ? <Text style={styles.inlineError}>{confirmError}</Text> : null}

              {clubIdLoading ? (
                <View style={styles.clubStatusRow}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={[styles.transferHint, { color: theme.text }]}>Loading club assignment...</Text>
                </View>
              ) : !clubId ? (
                <Text style={styles.inlineError}>No club assigned.</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.button, isTransferDisabled && styles.disabledButton]}
                onPress={handleTransferPresident}
                disabled={isTransferDisabled}
              >
                {isTransferring ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Transfer President</Text>
                )}
              </TouchableOpacity>
            </View>
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
  transferSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
  },
  transferTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  transferHint: {
    fontSize: 12,
    marginBottom: 10,
  },
  transferInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  inlineError: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  clubStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
