import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../services/supabase";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setError("");
    setInfo("");
    setLoading(true);

    // IMPORTANT: replace with your deployed app URL that serves the reset page
    const redirectTo = "https://YOUR_DOMAIN/(auth)/reset-password";

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setError(error.message || "Failed to send reset email.");
      return;
    }

    setInfo("If that email exists, a reset link has been sent.");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Reset Password</Text>

      <Text style={styles.label}>Email Address</Text>
      <TextInput
        placeholder="Email"
        style={styles.input}
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Sending..." : "Send Reset Email"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/login")} style={styles.linkContainer}>
        <Text style={styles.link}>Back to Login</Text>
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
  info: { color: "#2e7d32", marginBottom: 12, textAlign: "center" },
  linkContainer: { marginTop: 14 },
  link: { textAlign: "center", color: "#0077cc" },
});
