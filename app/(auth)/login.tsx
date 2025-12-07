import { useRouter } from "expo-router";
import { useContext, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { UserContext } from "../../context/UserContext";
import { supabase } from "../../services/supabase";

export default function Login() {
  const router = useRouter();
  const ctx = useContext(UserContext);

  if (!ctx) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const { setUser } = ctx;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    // 1. Supabase Auth Login
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      return;
    }

    // 2. Fetch user profile from database
    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("*")
      .single();

    if (profileErr || !profile) {
      setError("Profile not found.");
      return;
    }

    // 3. Clean profile to match UserProfile interface
    const safeProfile = {
      id: profile.id ?? "",
      email: profile.email ?? "",
      name: profile.name ?? "",
      usn: profile.usn ?? "",
      role: profile.role ?? "student",
    };

    // 4. Update global User Context
    setUser(safeProfile);

    // 5. Role-based redirect
    if (safeProfile.role === "student") {
      router.replace("/(student)/home");
    } else {
      router.replace("/(faculty)/dashboard");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
        <Text style={styles.link}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------
// Styles
// ---------------------
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#0066FF",
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: { color: "#fff", textAlign: "center", fontSize: 16 },
  error: { color: "red", marginBottom: 10, textAlign: "center" },
  link: { marginTop: 14, textAlign: "center", color: "#007bff" },
});
