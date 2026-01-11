import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fetchClubs } from "../../services/clubDetails";

// Define or import Club type
type Club = {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
};

export default function ClubsList() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]); // ✅ FIXED

  useEffect(() => {
    fetchClubs().then(setClubs).catch(console.error);
  }, []);

  const renderClub = ({ item }: { item: Club }) => ( // ✅ FIXED
    <TouchableOpacity
      style={styles.clubItem}
      onPress={() => router.push(`/club-details?clubId=${item.id}`)}
    >
      <Image source={{ uri: item.logo_url }} style={styles.logo} />
      <View style={styles.textContainer}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clubs</Text>

      <FlatList
        data={clubs}
        keyExtractor={(item) => item.id}
        renderItem={renderClub}
        ListEmptyComponent={
          <Text style={styles.emptyState}>No clubs found. Please check back later.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },

  clubItem: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  logo: { width: 50, height: 50, borderRadius: 25 },
  textContainer: { flex: 1, marginLeft: 10 },
  name: { fontSize: 18, fontWeight: "bold" },
  description: { fontSize: 14, color: "#666" },

  emptyState: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
    fontSize: 16,
  },
});
