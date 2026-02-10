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
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadClubs = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, logo_url, description")
        .order("name");

      if (error) {
        console.error(error);
        setClubs([]);
        setLoading(false);
        return;
      }

      let visibleClubs = data ?? [];

      if (user?.role === "president" || user?.role === "faculty") {
        const myClubIds = await getMyClubs(user);
        visibleClubs = visibleClubs.filter((club) => myClubIds.includes(club.id));
      }

      setClubs(visibleClubs);
      setLoading(false);
    };

    loadClubs();
  }, [user]);

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

  const title = user?.role === "student" ? "View Clubs" : "Manage Clubs";
  const showSearchEmptyState = normalizedQuery.length > 0 && filteredClubs.length === 0;

  if (loading) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

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
        ListEmptyComponent={
          showSearchEmptyState ? (
            <ClubSearchEmptyState
              searchTerm={trimmedQuery}
              onClear={() => setSearchQuery("")}
            />
          ) : (
            <Text style={[styles.emptyText, { color: theme.text }]}>No clubs found.</Text>
          )
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
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  searchWrapper: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 16,
    flexGrow: 1,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    opacity: 0.7,
  },
});
