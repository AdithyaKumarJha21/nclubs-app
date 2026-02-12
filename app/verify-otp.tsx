import { useLocalSearchParams, useRouter } from "expo-router";
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

type RoleRow = {
  name: "student" | "faculty" | "president" | "admin";
};

const isInvalidVerifyTypeError = (message?: string) => {
  const normalized = message?.toLowerCase() || "";
  return normalized.includes("invalid") && normalized.includes("type");
};

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    name?: string;
    usn?: string;
  }>();

  const email = (params.email || "").trim().toLowerCase();
  const name = (params.name || "").trim();
  const usn = (params.usn || "").trim();

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const verifyWithFallback = async () => {
    const primary = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (!primary.error) {
      return primary;
    }

    if (!isInvalidVerifyTypeError(primary.error.message)) {
      return primary;
    }

    return supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });
  };

  const handleVerify = async () => {
    setMessage(null);

    if (!email) {
      setMessage("Missing email context. Please go back and sign up again.");
      return;
    }

    if (otp.trim().length !== 6) {
      setMessage("Please enter the 6-digit OTP.");
      return;
    }

    setIsVerifying(true);
    console.log("[otp] verify request", { email });

    const { error } = await verifyWithFallback();

    if (error) {
      setMessage(error.message);
      setIsVerifying(false);
      return;
    }

    console.log("[otp] verify success");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      setMessage(userError?.message || "Unable to load authenticated user.");
      setIsVerifying(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .update({
        name,
        usn,
      })
      .eq("id", user.id)
      .select("roles(name)")
      .single();

    if (profileError) {
      setMessage(profileError.message);
      setIsVerifying(false);
      return;
    }

    console.log("[otp] profile updated");

    const roleRow = Array.isArray(profileData?.roles)
      ? (profileData.roles[0] as RoleRow)
      : (profileData?.roles as RoleRow | null);

    const role = roleRow?.name;

    if (role === "faculty" || role === "admin") {
      router.replace("/faculty-home");
    } else if (role === "president") {
      router.replace("/president-home");
    } else if (role === "student") {
      router.replace("/student-home");
    } else {
      router.replace("/login");
    }

    setIsVerifying(false);
  };

  const handleResendOtp = async () => {
    setMessage(null);

    if (!email) {
      setMessage("Missing email context. Please go back and sign up again.");
      return;
    }

    setIsResending(true);
    console.log("[otp] resend requested");

    let resendError: string | null = null;

    if (typeof supabase.auth.resend === "function") {
      const { error } = await supabase.auth.resend({
        email,
        type: "signup",
      });

      if (!error) {
        setMessage("OTP resent successfully.");
        setIsResending(false);
        return;
      }

      resendError = error.message;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({ email });

    if (otpError) {
      setMessage(otpError.message || resendError || "Unable to resend OTP.");
      setIsResending(false);
      return;
    }

    setMessage("A new OTP has been sent to your email.");
    setIsResending(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit OTP sent to your email address.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.readonlyInput} value={email} editable={false} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>OTP</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={(value) => setOtp(value.replace(/[^0-9]/g, "").slice(0, 6))}
            placeholder="Enter OTP"
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <TouchableOpacity
          style={styles.verifyButton}
          onPress={handleVerify}
          disabled={isVerifying || isResending}
        >
          {isVerifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleResendOtp}
          disabled={isVerifying || isResending}
        >
          <Text style={styles.secondaryButtonText}>
            {isResending ? "Resending..." : "Resend OTP"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Back to Signup</Text>
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
  readonlyInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  message: {
    fontSize: 12,
    color: "#dc2626",
    marginBottom: 8,
  },
  verifyButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  verifyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "600",
  },
  backLink: {
    marginTop: 12,
    color: "#2563eb",
    textAlign: "center",
    fontSize: 13,
  },
});
