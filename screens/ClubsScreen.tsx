import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Clubs</Text>

      <FlatList
        data={clubs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/club-profile",
                params: { clubId: item.id }, // ✅ REAL UUID
              })
            }
          >
            {item.logo_url && (
              <Image source={{ uri: item.logo_url }} style={styles.logo} />
            )}
            <Text style={styles.name}>{item.name}</Text>
          </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    marginBottom: 12,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
});
