import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to NClubs App 🎉</Text>
      <Text style={styles.subtitle}>Choose a role to continue:</Text>

      {/* Auth */}
      <Link href="/login" style={styles.button}>
        Go to Login
      </Link>

      <Link href="/signup" style={styles.button}>
        Go to Signup
      </Link>

      {/* 🔥 Day 11: Events & Attendance test */}
      <Link href="/events" style={styles.button}>
        Events (Test)
      </Link>

      <Link href="/attendance-history" style={styles.button}>
        Attendance History (Test)
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    fontSize: 18,
    marginVertical: 8,
    color: "blue",
  },
});
