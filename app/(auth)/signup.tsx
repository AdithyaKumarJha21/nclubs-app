import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { supabase } from "../../services/supabase";
import { useRouter } from "expo-router";

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", usn: "", email: "", password: "" });
  const [error, setError] = useState("");

  const update = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  async function handleSignup() {
    setError("");

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (error) return setError(error.message);

    await supabase.rpc("insert_profile", {
      p_name: form.name,
      p_usn: form.usn,
      p_email: form.email,
      p_role: "student",
    });

    alert("Account created!");
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signup</Text>

      <TextInput placeholder="Name" style={styles.input} onChangeText={(v) => update("name", v)} />
      <TextInput placeholder="USN" style={styles.input} onChangeText={(v) => update("usn", v)} />
      <TextInput placeholder="Email" style={styles.input} onChangeText={(v) => update("email", v)} />
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
  input: { borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 10 },
  button: { backgroundColor: "#28a745", padding: 14, borderRadius: 8 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "bold" },
  error: { color: "red", marginBottom: 10 },
});
