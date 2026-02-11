import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
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

type RoleRow = {
  name: "student" | "faculty" | "president" | "admin";
};

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    signedOut?: string;
    reason?: string;
    email?: string;
    pendingConfirm?: string;
  }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
  const infoMessage = useMemo(() => {
    if (params.reason === "password_reset") {
      return "Password updated. Please log in with your new password.";
    }

    if (params.pendingConfirm === "1") {
      return "Confirmation email requested. Check inbox/spam, then tap Resend confirmation email once if needed.";
    }

    if (params.signedOut === "1" || params.reason === "signed_out") {
      return "You have been signed out.";
    }

    return null;
  }, [params.pendingConfirm, params.reason, params.signedOut]);


  useEffect(() => {
    if (typeof params.email === "string" && params.email.trim()) {
      setEmail(params.email.trim().toLowerCase());
    }
  }, [params.email]);

  const handleLoginPress = async () => {
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    // 1) AUTH LOGIN
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      setErrorMessage(error?.message || "Invalid login credentials.");
      setIsSubmitting(false);
      return;
    }

    // 2) FETCH ROLE
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("roles(name)")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile?.roles) {
      setErrorMessage("Unable to determine user role.");
      setIsSubmitting(false);
      return;
    }

    // Normalize role (Supabase may return object or array depending on relation)
    const roleRow = Array.isArray(profile.roles)
      ? (profile.roles[0] as RoleRow)
      : (profile.roles as RoleRow);

    const role = roleRow?.name;

    if (!role) {
      setErrorMessage("User role not found.");
      setIsSubmitting(false);
      return;
    }

    // 3) ROLE-BASED REDIRECT / BLOCK
    if (role === "faculty" || role === "admin") {
      await supabase.auth.signOut();
      setErrorMessage(
        "Faculty must use Faculty Login. Please use 'Login as Faculty' option below."
      );
      setIsSubmitting(false);
      return;
    }

    if (role === "president") {
      router.replace("/president-home");
    } else {
      router.replace("/student-home");
    }

    setIsSubmitting(false);
  };

  const handleForgotPasswordPress = () => {
    router.push("/forgot-password");
  };

  const handleRegisterPress = () => {
    router.push("/signup");
  };

  const handleFacultyLoginPress = () => {
    router.push("/faculty-login");
  };

  const handleResendConfirmationPress = async () => {
    setErrorMessage(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("Enter your email first to resend confirmation.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    const emailRedirectTo = Linking.createURL("/auth-callback");
    console.log("[auth] resend signup emailRedirectTo", emailRedirectTo);

    setIsResendingConfirmation(true);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsResendingConfirmation(false);
      return;
    }

    setErrorMessage("Confirmation email sent. Please check your inbox and spam folder.");
    setIsResendingConfirmation(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back!</Text>
        {infoMessage ? <Text style={styles.info}>{infoMessage}</Text> : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@nmit.ac.in"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter password"
              secureTextEntry={!isPasswordVisible}
              value={password}
              onChangeText={setPassword}
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
        </View>

        <TouchableOpacity onPress={handleForgotPasswordPress}>
          <Text style={styles.registerLink}>Forgot Password?</Text>
        </TouchableOpacity>

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

        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <TouchableOpacity onPress={handleRegisterPress}>
          <Text style={styles.registerLink}>New user? Register</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResendConfirmationPress}
          disabled={isResendingConfirmation || isSubmitting}
        >
          <Text style={styles.registerLink}>
            {isResendingConfirmation
              ? "Resending confirmation..."
              : "Resend confirmation email"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleFacultyLoginPress}>
          <Text style={styles.facultyLink}>Login as Faculty</Text>
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
    maxWidth: 380,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
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
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  registerLink: {
    marginTop: 8,
    color: "#2563eb",
    textAlign: "center",
  },
  facultyLink: {
    marginTop: 12,
    color: "#2563eb",
    textAlign: "center",
  },
  error: {
    color: "red",
    fontSize: 13,
    marginTop: 8,
  },
  info: {
    color: "#166534",
    fontSize: 13,
    marginBottom: 10,
  },
});
