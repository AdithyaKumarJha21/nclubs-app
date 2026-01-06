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

    // Get the newly created user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setError("Could not fetch user info");
      return;
    }
    const user = userData.user;

    // Insert profile using auth user ID
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: form.email,
        name: form.name,
        usn: form.usn,
        role: "student",
      });

    if (insertError) {
      setError("RLS prevented profile creation");
      return;
    }

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
