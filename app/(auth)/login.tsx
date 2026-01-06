import { useRouter } from "expo-router";
import { useContext, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { UserContext } from "../../context/UserContext";
import { supabase } from "../../services/supabase";

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  usn: string | null;
  role_id: string | null; // UUID FK
};

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

  // Use the context setter. Cast to any to avoid strict type mismatches here.
  const { setUser } = ctx as any;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Put your real role UUIDs here (from roles table)
  const ROLE_STUDENT_ID = "STUDENT_ROLE_UUID";
  const ROLE_ADMIN_ID = "ADMIN_ROLE_UUID";
  const ROLE_STAFF_ID = "STAFF_ROLE_UUID";

  async function handleLogin() {
    setError("");
    setLoading(true);

    // 1) Login with Supabase Auth
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setLoading(false);
      setError("Invalid email or password.");
      return;
    }

    // 2) Get logged-in user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user ?? null;

    if (userErr || !user) {
      setLoading(false);
      setError("Login succeeded but user session could not be read.");
      return;
    }

    // 3) Fetch profile (RLS-safe) from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,name,email,usn,role_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setLoading(false);

      // ✅ IMPORTANT: do NOT auto-insert here unless DB policies allow it.
      // This error usually means:
      // - profile row doesn't exist (trigger missing)
      // - OR RLS blocked read
      setError(
        "Profile not found. Please sign up first, or ask admin to fix profile trigger/RLS."
      );
      return;
    }

    // 4) Normalize profile (avoid null crashes)
    const profileRow = profile as ProfileRow;
    const safeProfile = {
      id: profileRow.id,
      name: profileRow.name ?? "",
      email: profileRow.email ?? user.email ?? "",
      usn: profileRow.usn ?? "",
      role_id: profileRow.role_id ?? "",
    };

    // 5) Store profile in context
    setUser(safeProfile);

    // 6) Role-based redirect using role_id (UUID)
    if (safeProfile.role_id === ROLE_STUDENT_ID) {
      router.replace("/(student)/home");
    } else if (safeProfile.role_id === ROLE_ADMIN_ID) {
      // Admins reuse faculty dashboard by default
      router.replace("/(faculty)/dashboard");
    } else if (safeProfile.role_id === ROLE_STAFF_ID) {
      router.replace("/(faculty)/dashboard");
    } else {
      // fallback
      router.replace("/(student)/home");
    }

    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Login to N-Clubs</Text>

      <Text style={styles.label}>Email Address</Text>
      <TextInput
        placeholder="Email"
        style={styles.input}
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        onChangeText={setPassword}
        value={password}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(auth)/signup")}
        style={styles.linkContainer}
      >
        <Text style={styles.link}>Create Account</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(auth)/forgot-password" as any)}
        style={styles.linkContainer}
      >
        <Text style={styles.linkSecondary}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#222",
  },
  label: { fontSize: 16, fontWeight: "500", marginBottom: 6, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 18,
    backgroundColor: "#f9f9f9",
  },
  button: { backgroundColor: "#0066FF", padding: 14, borderRadius: 8, marginTop: 8 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "bold", fontSize: 16 },
  error: {
    color: "#d32f2f",
    backgroundColor: "#fdecea",
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  linkContainer: { marginTop: 14 },
  link: { textAlign: "center", color: "#0077cc", fontSize: 15, fontWeight: "500" },
  linkSecondary: { textAlign: "center", color: "#555", fontSize: 14, fontWeight: "500" },
});
