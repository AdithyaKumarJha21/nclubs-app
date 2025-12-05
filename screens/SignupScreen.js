import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { signupUser } from "../services/auth";
import { supabase } from "../services/supabase";

export default function SignupScreen({ navigation }) {
  const [form, setForm] = useState({ name: "", usn: "", email: "", password: "" });
  const [error, setError] = useState("");

  function update(key, value) {
    setForm({ ...form, [key]: value });
  }

  async function handleSignup() {
    setError("");

    const { data, error } = await signupUser(form.email, form.password);
    if (error) return setError(error.message);

    await supabase.rpc("insert_profile", {
      p_name: form.name,
      p_usn: form.usn,
      p_email: form.email,
      p_role: "student"
    });

    alert("Account created successfully!");
    navigation.navigate("Login");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signup</Text>

      <TextInput placeholder="Name" style={styles.input} onChangeText={(v) => update("name", v)} />
      <TextInput placeholder="USN" style={styles.input} onChangeText={(v) => update("usn", v)} />
      <TextInput placeholder="Email" style={styles.input} onChangeText={(v) => update("email", v)} />
      <TextInput placeholder="Password" secureTextEntry style={styles.input} onChangeText={(v) => update("password", v)} />

      {error.length > 0 && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.btnText}>Signup</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  input: { borderWidth: 1, padding: 12, marginVertical: 8, borderRadius: 8 },
  button: { backgroundColor: "#00AA55", padding: 14, marginTop: 10, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  error: { color: "red", marginTop: 5 }
});
