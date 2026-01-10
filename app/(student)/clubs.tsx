import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fetchClubs } from "../../services/clubDetails";

export default function ClubsList() {
  const router = useRouter();
  const [clubs, setClubs] = useState([]);

  useEffect(() => {
    fetchClubs().then(setClubs).catch(console.error);
  }, []);

  const renderClub = ({ item }) => (
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
      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(student)/home")}>
        <Text style={styles.backText}>Back to Home</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Clubs</Text>
      <FlatList
        data={clubs}
        keyExtractor={(item) => item.id}
        renderItem={renderClub}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  backButton: { alignSelf: "flex-start", marginBottom: 10, padding: 10, backgroundColor: "#007bff", borderRadius: 5 },
  backText: { color: "white", fontSize: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  clubItem: { flexDirection: "row", padding: 10, borderBottomWidth: 1, borderColor: "#ccc" },
  logo: { width: 50, height: 50, borderRadius: 25 },
  textContainer: { flex: 1, marginLeft: 10 },
  name: { fontSize: 18, fontWeight: "bold" },
  description: { fontSize: 14, color: "#666" },
});