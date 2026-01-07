import { FlatList, StyleSheet, Text, View } from "react-native";
import ClubCard from "../components/ClubCard";
import { mockClubs } from "../data/mockClubs"; // 👈 B’s file

export default function ClubsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CLUBS</Text>

      <FlatList
        data={mockClubs}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <ClubCard name={item.name} logo={item.logo} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
});
