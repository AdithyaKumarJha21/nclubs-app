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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const defaultEmail = useMemo(() => {
    if (Array.isArray(params.email)) {
      return params.email[0] ?? "";
    }

    return params.email ?? "";
  }, [params.email]);

  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 0 &&
      otp.trim().length > 0 &&
      newPassword.length >= MIN_PASSWORD_LENGTH &&
      confirmPassword.length >= MIN_PASSWORD_LENGTH &&
      newPassword === confirmPassword &&
      !loading
    );
  }, [confirmPassword, email, loading, newPassword, otp]);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedOtp = otp.trim();

    if (!trimmedEmail || !trimmedOtp || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
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

    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedOtp,
      type: "recovery",
    });

    if (verifyError) {
      console.error("RESET_PASSWORD_VERIFY_OTP_ERROR", verifyError);
      setLoading(false);
      Alert.alert("Unable to verify OTP", verifyError.message || "Please try again.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error("RESET_PASSWORD_UPDATE_ERROR", updateError);
      setLoading(false);
      Alert.alert("Unable to update password", updateError.message || "Please try again.");
      return;
    }

    Alert.alert("Success", "Password updated. You have been signed out.");
    await supabase.auth.signOut();
    setLoading(false);
    router.replace("/login");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter the OTP from your email.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />

        <Text style={styles.label}>OTP Code</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter OTP code"
          value={otp}
          onChangeText={setOtp}
          autoCapitalize="none"
          autoCorrect={false}
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
          placeholder="Confirm new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.buttonText}>
            {loading ? "Updating..." : "Verify OTP & Update Password"}
          </Text>
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
  button: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
});
