import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  const router = useRouter();

  const [name, setName] = useState("");
  const [usn, setUsn] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const passwordChecks = [
    {
      key: "length",
      label: "Password must be at least 8 characters",
      isMet: password.length >= 8,
    },
    {
      key: "uppercase",
      label: "Must include at least one uppercase letter",
      isMet: /[A-Z]/.test(password),
    },
    {
      key: "lowercase",
      label: "Must include at least one lowercase letter",
      isMet: /[a-z]/.test(password),
    },
    {
      key: "number",
      label: "Must include at least one number",
      isMet: /\d/.test(password),
    },
    {
      key: "special",
      label: "Must include at least one special character (!@#$%^&* etc.)",
      isMet: /[!@#$%^&*()_+\-=[\]{}|\\:;"'<>,.?/]/.test(password),
    },
  ];

  const metCount = passwordChecks.filter((check) => check.isMet).length;
  const isPasswordValid = metCount === passwordChecks.length;
  const isConfirmValid =
    confirmPassword.length > 0 && confirmPassword === password;
  const isFormValid = isPasswordValid && isConfirmValid;

  const strengthLabel =
    metCount <= 2 ? "Weak" : metCount <= 4 ? "Medium" : "Strong";
  const strengthColor =
    metCount <= 2 ? "#dc2626" : metCount <= 4 ? "#f59e0b" : "#16a34a";

  const handleSignupPress = async () => {
    setPasswordError(null);

    if (!name || !usn || !email || !password || !confirmPassword) {
      Alert.alert("Missing details", "Please fill all the fields.");
      return;
    }

    if (!isPasswordValid) {
      const missingMessage = passwordChecks
        .filter((check) => !check.isMet)
        .map((check) => check.label)
        .join("\n");
      setPasswordError(missingMessage);
      return;
    }

    if (!isConfirmValid) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // ✅ CHECK USN UNIQUENESS
    const { data: existingProfile, error: usnCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("usn", usn)
      .maybeSingle();

    if (existingProfile) {
      Alert.alert("Signup failed", "This USN is already registered.");
      setLoading(false);
      return;
    }

    if (usnCheckError) {
      Alert.alert("Error", usnCheckError.message);
      setLoading(false);
      return;
    }

    // 1) CREATE AUTH USER
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

    // 2) INSERT PROFILE
    const { error: profileError } = await supabase.from("profiles").insert({
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

  const handleLoginPress = () => {
    router.push("/login");
  };

  const handlePasswordSubmit = () => {
    if (isFormValid && !loading) {
      handleSignupPress();
    } else if (!isPasswordValid) {
      const missingMessage = passwordChecks
        .filter((check) => !check.isMet)
        .map((check) => check.label)
        .join("\n");
      setPasswordError(missingMessage);
    } else if (!isConfirmValid) {
      setPasswordError("Passwords do not match.");
    }
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
          <View style={styles.passwordField}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Create a strong password"
              secureTextEntry={!isPasswordVisible}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setPasswordError(null);
              }}
              onSubmitEditing={handlePasswordSubmit}
            />
            <TouchableOpacity
              onPress={() => setIsPasswordVisible((prev) => !prev)}
              accessibilityLabel={
                isPasswordVisible ? "Hide password" : "Show password"
              }
              style={styles.passwordToggle}
            >
              <Ionicons
                name={isPasswordVisible ? "eye-off" : "eye"}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordMeta}>
            <Text style={styles.passwordStrengthLabel}>
              Strength:{" "}
              <Text
                style={[styles.passwordStrengthValue, { color: strengthColor }]}
              >
                {strengthLabel}
              </Text>
            </Text>
          </View>

          <View style={styles.passwordChecklist}>
            {passwordChecks.map((check) => (
              <Text
                key={check.key}
                style={[
                  styles.checklistItem,
                  { color: check.isMet ? "#16a34a" : "#dc2626" },
                ]}
              >
                {check.isMet ? "✓ " : "• "}
                {check.label}
              </Text>
            ))}
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Re-enter your password"
              secureTextEntry={!isConfirmPasswordVisible}
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setPasswordError(null);
              }}
              onSubmitEditing={handlePasswordSubmit}
            />
            <TouchableOpacity
              onPress={() => setIsConfirmPasswordVisible((prev) => !prev)}
              accessibilityLabel={
                isConfirmPasswordVisible
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              style={styles.passwordToggle}
            >
              <Ionicons
                name={isConfirmPasswordVisible ? "eye-off" : "eye"}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>

          {!!confirmPassword.length && (
            <Text
              style={[
                styles.confirmationText,
                { color: isConfirmValid ? "#16a34a" : "#dc2626" },
              ]}
            >
              {isConfirmValid ? "Passwords match" : "Passwords do not match"}
            </Text>
          )}
        </View>

        {passwordError && (
          <Text style={styles.passwordError}>{passwordError}</Text>
        )}

        <TouchableOpacity
          style={styles.signupButton}
          onPress={handleSignupPress}
          disabled={!isFormValid || loading}
        >
          <Text style={styles.signupButtonText}>
            {loading ? "Creating..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.helperText}>
          Your profile will be securely stored after signup.
        </Text>

        <TouchableOpacity onPress={handleLoginPress}>
          <Text style={styles.loginLink}>Already a user? Log in</Text>
        </TouchableOpacity>
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
  passwordField: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    paddingRight: 40,
  },
  passwordToggle: {
    position: "absolute",
    right: 10,
    padding: 4,
  },
  passwordMeta: {
    marginTop: 6,
  },
  passwordStrengthLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  passwordStrengthValue: {
    fontWeight: "700",
  },
  passwordChecklist: {
    marginTop: 8,
    gap: 4,
  },
  checklistItem: {
    fontSize: 12,
  },
  confirmationText: {
    marginTop: 6,
    fontSize: 12,
  },
  passwordError: {
    color: "#dc2626",
    fontSize: 12,
    marginBottom: 8,
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
  loginLink: {
    marginTop: 12,
    color: "#2563eb",
    textAlign: "center",
    fontSize: 13,
  },
});
