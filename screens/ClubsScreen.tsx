import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import ClubCard from "../components/ClubCard";
import ClubSearchBar from "../components/ClubSearchBar";
import { mockClubs } from "../data/mockClubs";

export default function ClubsScreen() {
  const [search, setSearch] = useState("");

  const filteredClubs = mockClubs.filter((club) =>
    club.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CLUBS</Text>

      <ClubSearchBar value={search} onChange={setSearch} />

      <FlatList
        data={filteredClubs}
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
