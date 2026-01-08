import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../services/supabase";

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", usn: "", email: "", password: "" });
  const [error, setError] = useState("");

  const update = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  async function handleSignup() {
    setError("");

    // Create auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // Note: Profile creation is handled in login.tsx to avoid RLS issues during signup
    alert("Account created! Please check your email for confirmation if required, then login.");
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput placeholder="Name" style={styles.input} onChangeText={(v) => update("name", v)} />

      <Text style={styles.label}>USN</Text>
      <TextInput placeholder="USN" style={styles.input} onChangeText={(v) => update("usn", v)} />

      <Text style={styles.label}>Email</Text>
      <TextInput placeholder="Email" style={styles.input} onChangeText={(v) => update("email", v)} />

      <Text style={styles.label}>Password</Text>
      <TextInput placeholder="Password" secureTextEntry style={styles.input} onChangeText={(v) => update("password", v)} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 16 },
  label: { fontSize: 16, fontWeight: "500", marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 10 },
  button: { backgroundColor: "#28a745", padding: 14, borderRadius: 8 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "bold" },
  error: { color: "red", marginBottom: 10 },
});
