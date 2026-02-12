import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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

const MIN_PASSWORD_LENGTH = 8;

const isOtpInvalidOrExpired = (message?: string) => {
  const normalizedMessage = message?.toLowerCase() ?? "";
  return (
    normalizedMessage.includes("expired") || normalizedMessage.includes("invalid")
  );
};

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[] }>();

  const email = useMemo(() => {
    const paramValue = Array.isArray(params.email) ? params.email[0] : params.email;
    return (paramValue ?? "").trim().toLowerCase();
  }, [params.email]);

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Missing email context. Please go back and try again.");
      return;
    }

    const cleanedOtp = otp.replace(/\s/g, "").trim();

    if (!cleanedOtp || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (cleanedOtp.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP.");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      Alert.alert("Error", "Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    console.log("[reset-otp] verify otp", { email, otpLength: cleanedOtp.length });

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: cleanedOtp,
      type: "email",
    });

    if (verifyError) {
      setIsSubmitting(false);

      if (isOtpInvalidOrExpired(verifyError.message)) {
        Alert.alert("Unable to verify OTP", "OTP expired or invalid. Please resend OTP.");
        return;
      }

      Alert.alert("Unable to verify OTP", verifyError.message || "Please try again.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    console.log("[reset-otp] update password result", { error: updateError?.message ?? null });

    if (updateError) {
      setIsSubmitting(false);
      Alert.alert("Unable to update password", updateError.message || "Please try again.");
      return;
    }

    await supabase.auth.signOut();
    setIsSubmitting(false);
    Alert.alert("Success", "Password updated. Please login again.");
    router.replace("/login");
  };

  const handleResendOtp = async () => {
    if (!email) {
      Alert.alert("Error", "Missing email context. Please go back and try again.");
      return;
    }

    setIsResending(true);
    console.log("[reset-otp] send otp", { email });

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    setIsResending(false);

    if (error) {
      Alert.alert("Unable to resend OTP", error.message || "Please try again.");
      return;
    }

    Alert.alert("Success", "OTP sent to your email.");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your OTP and choose a new password.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.readOnlyInput]}
          value={email}
          editable={false}
          selectTextOnFocus={false}
        />

        <Text style={styles.label}>OTP</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChangeText={(value) =>
            setOtp(value.replace(/[^0-9\s]/g, "").slice(0, 6))
          }
          keyboardType="number-pad"
          autoCorrect={false}
          maxLength={6}
        />

        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter new password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleResetPassword}
          disabled={isSubmitting || isResending}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? "Updating..." : "Verify OTP & Reset Password"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleResendOtp}
          disabled={isSubmitting || isResending}
        >
          <Text style={styles.secondaryButtonText}>
            {isResending ? "Resending..." : "Resend OTP"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          disabled={isSubmitting || isResending}
        >
          <Text style={styles.backLink}>Back</Text>
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
    maxWidth: 380,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  readOnlyInput: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 14,
  },
  backLink: {
    marginTop: 12,
    color: "#2563eb",
    textAlign: "center",
    fontSize: 13,
  },
});
