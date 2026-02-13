import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import ClubCard from "../components/ClubCard";
import ClubSearchBar from "../components/ClubSearchBar";
import ClubSearchEmptyState from "../components/ClubSearchEmptyState";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";
import { resolvePublicClubLogoUrl } from "../utils/clubLogos";

type Club = {
  id: string;
  name: string;
  logo_url: string | null;
};

const CLUB_SELECT_TRIES = [
  "id, name, logo_url",
  "id, name",
] as const;

type ClubRowPartial = {
  id: string;
  name: string;
  logo_url?: string | null;
};

type ClubFileLogoRow = {
  club_id: string;
  bucket: string;
  path: string;
  file_type?: string | null;
  title?: string | null;
  created_at?: string | null;
};

export default function ClubsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadClubs = async () => {
      setLoading(true);

      let data: ClubRowPartial[] | null = null;
      let error: { code?: string; message?: string } | null = null;

      // ✅ Try progressively smaller selects to support schemas missing logo_url
      for (const columns of CLUB_SELECT_TRIES) {
        const response = await supabase.from("clubs").select(columns).order("name");

        data = (response.data as ClubRowPartial[]) ?? null;
        error = response.error;

        // If error is NOT "column does not exist", stop trying
        if (!error || error.code !== "42703") break;
      }

      if (!isActive) return;

      if (error) {
        console.error(error);
        setClubs([]);
        setLoading(false);
        return;
      }

      const { data: clubFileRows, error: clubFilesError } = await supabase
        .from("club_files")
        .select("club_id, bucket, path, file_type, title, created_at")
        .order("created_at", { ascending: false });

      const latestLogoByClub = new Map<string, string>();

      if (clubFilesError) {
        // Students may not have SELECT access on club_files in some environments.
        // Fall back to clubs.logo_url without logging noisy errors to end-users.
        console.warn("club_files read skipped:", clubFilesError.message);
      }

      for (const row of ((clubFileRows as ClubFileLogoRow[] | null) ?? [])) {
        if (latestLogoByClub.has(row.club_id)) continue;

        const isLogo = row.file_type === "logo" || row.title === "Club Logo";
        if (!isLogo) continue;

        const publicUrl = resolvePublicClubLogoUrl(row.path, row.bucket);
        if (!publicUrl) continue;
        latestLogoByClub.set(row.club_id, publicUrl);
      }

      const normalizedClubs: Club[] = (data ?? []).map((club) => ({
        id: club.id,
        name: club.name,
        logo_url:
          resolvePublicClubLogoUrl(club.logo_url) ||
          latestLogoByClub.get(club.id) ||
          null,
      }));

      setClubs(normalizedClubs);
      setLoading(false);
    };

    loadClubs();

    return () => {
      isActive = false;
    };
  }, [user]);

  const trimmedQuery = searchQuery.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  const filteredClubs = useMemo(() => {
    if (!normalizedQuery) return clubs;

    return clubs.filter((club) =>
      club.name.toLowerCase().includes(normalizedQuery)
    );
  }, [clubs, normalizedQuery]);

  const title = user?.role === "student" ? "View Clubs" : "Manage Clubs";
  const showSearchEmptyState =
    normalizedQuery.length > 0 && filteredClubs.length === 0;

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
            <Text style={[styles.emptyText, { color: theme.text }]}>
              No clubs found.
            </Text>
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
