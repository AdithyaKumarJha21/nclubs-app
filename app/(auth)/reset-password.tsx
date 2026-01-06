import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../services/supabase";

export default function ResetPassword() {
  const router = useRouter();
  // We intentionally DO NOT parse tokens manually. Supabase JS handles URL tokens on redirect.
  const params = useLocalSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setError("");

    if (!password) {
      setError("Password is required.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message || "Failed to reset password.");
      return;
    }

    // On success, redirect to login
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Set New Password</Text>

      <Text style={styles.label}>New Password</Text>
      <TextInput
        placeholder="New password"
        secureTextEntry
        style={styles.input}
        onChangeText={setPassword}
        value={password}
      />

      <Text style={styles.label}>Confirm Password</Text>
      <TextInput
        placeholder="Confirm password"
        secureTextEntry
        style={styles.input}
        onChangeText={setConfirm}
        value={confirm}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Please wait..." : "Reset Password"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 18, textAlign: "center" },
  label: { fontSize: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8, marginBottom: 12 },
  button: { backgroundColor: "#0066FF", padding: 14, borderRadius: 8 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "bold" },
  error: { color: "#d32f2f", marginBottom: 12, textAlign: "center" },
});
