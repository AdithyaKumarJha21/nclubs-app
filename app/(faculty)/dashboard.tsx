import { useRouter } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";

export default function FacultyDashboard() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Faculty Dashboard</Text>
      <Text style={styles.subtitle}>Manage your classes and students here.</Text>
      <Button title="Go to Home" onPress={() => router.replace("/")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold" },
  subtitle: { fontSize: 16, marginVertical: 10 },
});
