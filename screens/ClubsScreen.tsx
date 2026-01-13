import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import ClubCard from "../components/ClubCard";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

type Club = {
  id: string;
  name: string;
  logo_url: string | null;
};

export default function ClubsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClubs = async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, logo_url")
        .order("name");

      if (error) {
        console.error(error);
        return;
      }

      setClubs(data ?? []);
      setLoading(false);
    };

    loadClubs();
  }, []);

  if (loading) return null;

  // 🔤 Defensive A → Z sort (UI-level, safe)
  const sortedClubs = [...clubs].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Clubs</Text>

      <FlatList
        data={sortedClubs}
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
                params: { clubId: item.id }, // ✅ REAL UUID
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
  list: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
});
