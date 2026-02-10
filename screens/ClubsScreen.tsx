import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import ClubCard from "../components/ClubCard";
import ClubSearchBar from "../components/ClubSearchBar";
import ClubSearchEmptyState from "../components/ClubSearchEmptyState";
import { useAuth } from "../context/AuthContext";
import { getMyClubs } from "../services/assignments";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

type Club = {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
};

export default function ClubsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, loading: userLoading } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadClubs = async () => {
      if (userLoading) {
        return;
      }

      let query = supabase
        .from("clubs")
        .select("id, name, logo_url, description")
        .order("name");

      if (user?.role === "faculty" || user?.role === "president") {
        const managedClubIds = await getMyClubs(user);

        if (managedClubIds.length === 0) {
          setClubs([]);
          setLoading(false);
          return;
        }

        query = query.in("id", managedClubIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);
        setClubs([]);
        setLoading(false);
        return;
      }

      setClubs(data ?? []);
      setLoading(false);
    };

    loadClubs();
  }, [user, userLoading]);

  const trimmedQuery = searchQuery.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  const filteredClubs = useMemo(() => {
    if (!normalizedQuery) {
      return clubs;
    }

    return clubs.filter((club) => {
      const nameMatch = club.name.toLowerCase().includes(normalizedQuery);
      const descriptionMatch = club.description
        ? club.description.toLowerCase().includes(normalizedQuery)
        : false;

      return nameMatch || descriptionMatch;
    });
  }, [clubs, normalizedQuery]);

  const isManagerView = user?.role === "faculty" || user?.role === "president";
  const showSearchEmptyState = normalizedQuery.length > 0 && filteredClubs.length === 0;
  const showNoClubsMessage = normalizedQuery.length === 0 && clubs.length === 0;

  if (loading || userLoading) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        {isManagerView ? "Manage Clubs" : "View Clubs"}
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
        ListEmptyComponent={
          showSearchEmptyState ? (
            <ClubSearchEmptyState
              searchTerm={trimmedQuery}
              onClear={() => setSearchQuery("")}
            />
          ) : showNoClubsMessage ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyMessage, { color: theme.text }]}>
                {isManagerView
                  ? "No clubs are currently assigned to your account."
                  : "No clubs available right now."}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  searchWrapper: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: "center",
  },
});
