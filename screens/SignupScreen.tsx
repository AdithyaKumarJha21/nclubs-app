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

  const handleSignupPress = async () => {
  if (!name || !usn || !email || !password) {
    Alert.alert("Missing details", "Please fill all the fields.");
    return;
  }

  // 1. Create auth user
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    Alert.alert("Signup failed", error.message);
    return;
  }

  if (!data.user) {
    Alert.alert("Error", "User not created.");
    return;
  }

  // 2. Save profile (SAFE method)
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: data.user.id,
      name,
      usn,
      email: email.trim(),
    });

  if (profileError) {
    Alert.alert(
      "Profile error",
      "Account created, but profile could not be saved."
    );
    return;
  }

  Alert.alert(
    "Signup successful 🎉",
    "Please check your email to confirm your account."
  );
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
            character. (We will enforce this rule later.)
          </Text>
        </View>

        {/* Signup button */}
        <TouchableOpacity style={styles.signupButton} onPress={handleSignupPress}>
          <Text style={styles.signupButtonText}>Create Account</Text>
        </TouchableOpacity>

        {/* Info text */}
        <Text style={styles.helperText}>
          After signup, your profile (name, USN, email, role) will be stored in
          Supabase by Group 2 (backend).
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a", // same dark background as login
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
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
