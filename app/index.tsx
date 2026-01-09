import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function Index() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Welcome to NClubs App 🎉
      </Text>

      <Text style={[styles.subtitle, { color: theme.text }]}>
        Choose a role to continue:
      </Text>

      {/* Auth */}
      <Link href="/login" style={styles.button}>
        Go to Login
      </Link>

      <Link href="/signup" style={styles.button}>
        Go to Signup
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
