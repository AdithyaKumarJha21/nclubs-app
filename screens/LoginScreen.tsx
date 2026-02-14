import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    signedOut?: string;
    reason?: string;
    email?: string;
  }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const topMessage = useMemo(() => {
    if (params.reason === "password_reset") {
      return "Password updated. Log in with your password.";
    }

    if (params.signedOut === "1" || params.reason === "signed_out") {
      return "You have been signed out.";
    }

    return null;
  }, [params.reason, params.signedOut]);

  useEffect(() => {
    if (typeof params.email === "string" && params.email.trim()) {
      setEmail(params.email.trim().toLowerCase());
    }
  }, [params.email]);

  const handleLoginPress = async () => {
    setErrorMessage(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user?.id) {
      setErrorMessage(error?.message || "Invalid login credentials.");
      setIsSubmitting(false);
      return;
    }

    console.log("[auth] login success", { userId: data.user.id });
    setIsSubmitting(false);
  };

  const handleRegisterPress = () => {
    router.push("/signup");
  };

  const handleForgotPasswordPress = () => {
    router.push("/forgot-password");
  };

  const handleFacultyLoginPress = () => {
    router.push("/faculty-login");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back!</Text>
        {topMessage ? <Text style={styles.info}>{topMessage}</Text> : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@nmit.ac.in"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              onPress={() => setIsPasswordVisible((prev) => !prev)}
              accessibilityLabel={
                isPasswordVisible ? "Hide password" : "Show password"
              }
              style={styles.passwordToggle}
              disabled={isSubmitting}
            >
              <Ionicons
                name={isPasswordVisible ? "eye-off" : "eye"}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={handleForgotPasswordPress}>
          <Text style={styles.link}>Forgot Password?</Text>
        </TouchableOpacity>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLoginPress}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRegisterPress}>
          <Text style={styles.link}>New user? Register</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleFacultyLoginPress}>
          <Text style={styles.link}>Login as Faculty</Text>
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
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 24,
    gap: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
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
  loginButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 2,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  info: {
    textAlign: "center",
    color: "#0c4a6e",
    fontSize: 13,
  },
  error: {
    textAlign: "center",
    color: "#dc2626",
    fontSize: 13,
  },
  link: {
    textAlign: "center",
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
});
