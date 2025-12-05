import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function StudentHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Student Home</Text>
      <Text>This will become the CLUBS dashboard screen.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
});
