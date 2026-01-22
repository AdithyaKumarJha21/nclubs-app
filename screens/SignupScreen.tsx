import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../services/supabase";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [usn, setUsn] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignupPress = async () => {
    if (!name || !usn || !email || !password) {
      Alert.alert("Missing details", "Please fill all the fields.");
      return;
    }

    setLoading(true);

    /* ✅ SOLUTION 1 — CHECK USN UNIQUENESS (FRONTEND) */
    const { data: existingProfile, error: usnCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("usn", usn)
      .maybeSingle();

    if (existingProfile) {
      Alert.alert(
        "Signup failed",
        "This USN is already registered."
      );
      setLoading(false);
      return;
    }

    if (usnCheckError) {
      Alert.alert("Error", usnCheckError.message);
      setLoading(false);
      return;
    }

    /* 1️⃣ CREATE AUTH USER */
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      Alert.alert("Signup failed", error.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      Alert.alert("Error", "User not created.");
      setLoading(false);
      return;
    }

    /* 2️⃣ INSERT PROFILE */
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        name,
        usn,
        email: email.trim(),
        // role_id handled by backend (default student)
      });

    if (profileError) {
      Alert.alert("Signup failed", profileError.message);
      setLoading(false);
      return;
    }

    Alert.alert(
      "Signup successful 🎉",
      "Please check your email to confirm your account."
    );

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create your NCLUBS account ✨</Text>
        <Text style={styles.subtitle}>
          Use your college details to join clubs and events.
        </Text>

        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Adithya Kumar Jha"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* USN */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>USN</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 1NMITA123"
            autoCapitalize="characters"
            value={usn}
            onChangeText={setUsn}
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>College Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@nmit.ac.in"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Create a strong password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Text style={styles.hintText}>
            Must be 8–15 characters with uppercase, lowercase, number & special
            character.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.signupButton}
          onPress={handleSignupPress}
          disabled={loading}
        >
          <Text style={styles.signupButtonText}>
            {loading ? "Creating..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.helperText}>
          Your profile will be securely stored after signup.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
    color: "#4b5563",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: "#f9fafb",
  },
  hintText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  signupButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  signupButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
  },
});
