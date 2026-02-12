import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../services/supabase";
import { isValidEmail } from "../utils/auth";

export default function SignupScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [usn, setUsn] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getNormalizedEmail = () => email.trim().toLowerCase();
  const trimmedPassword = password.trim();
  const trimmedConfirmPassword = confirmPassword.trim();
  const hasMinimumPasswordLength = trimmedPassword.length >= 8;
  const hasNumberInPassword = /\d/.test(trimmedPassword);
  const hasUppercaseInPassword = /[A-Z]/.test(trimmedPassword);
  const passwordsMatch =
    trimmedPassword.length > 0 && trimmedPassword === trimmedConfirmPassword;

  const handleSignupPress = async () => {
    setErrorMessage(null);

    const normalizedEmail = getNormalizedEmail();

    if (!name.trim() || !usn.trim() || !normalizedEmail) {
      setErrorMessage("Please enter name, USN, and email.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!hasMinimumPasswordLength) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (!hasNumberInPassword || !hasUppercaseInPassword) {
      setErrorMessage(
        "Password must include at least one uppercase letter and one number."
      );
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("Password and confirm password do not match.");
      return;
    }

    setIsSubmitting(true);

    const { data: existingProfile, error: usnCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("usn", usn.trim())
      .maybeSingle();

    if (existingProfile) {
      setErrorMessage("This USN is already registered.");
      setIsSubmitting(false);
      return;
    }

    if (usnCheckError) {
      setErrorMessage(usnCheckError.message);
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: trimmedPassword,
      options: {
        data: {
          name: name.trim(),
          usn: usn.trim(),
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push(
      `/verify-otp?email=${encodeURIComponent(normalizedEmail)}&name=${encodeURIComponent(
        name.trim()
      )}&usn=${encodeURIComponent(usn.trim())}`
    );
  };

  const handleLoginPress = () => {
    router.push("/login");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create your NCLUBS account ✨</Text>
        <Text style={styles.subtitle}>
          Create your account and verify your email with OTP.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Adithya Kumar Jha"
            value={name}
            onChangeText={setName}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>USN</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 1NMITA123"
            autoCapitalize="characters"
            value={usn}
            onChangeText={setUsn}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>College Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@nmit.ac.in"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Create password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!isSubmitting}
          />
        </View>

        <Text style={styles.info}>
          Password must be at least 8 characters and include an uppercase letter
          and a number.
        </Text>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSignupPress}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLoginPress}>
          <Text style={styles.link}>Already registered? Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
    marginBottom: 4,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0f172a",
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  info: {
    color: "#0c4a6e",
    fontSize: 13,
    textAlign: "center",
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
    textAlign: "center",
  },
  link: {
    textAlign: "center",
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
});
