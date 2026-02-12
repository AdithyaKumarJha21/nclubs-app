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
import { sanitizeOtp } from "../utils/auth";

type RoleName = "student" | "faculty" | "president" | "admin";

type RoleRow = {
  name: RoleName;
};

type ProfileWithRole = {
  roles: RoleRow | RoleRow[] | null;
};

const OTP_LENGTH = 6;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isInvalidVerifyTypeError = (message?: string) => {
  const normalized = message?.toLowerCase() || "";
  return normalized.includes("invalid") && normalized.includes("type");
};

const resolveRole = (profile: ProfileWithRole | null): RoleName | null => {
  const roleValue = profile?.roles;

  if (Array.isArray(roleValue)) {
    return roleValue[0]?.name ?? null;
  }

  return roleValue?.name ?? null;
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
      token: sanitizeOtp(otp),
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
      token: sanitizeOtp(otp),
      type: "signup",
    });
  };

  const handleVerify = async () => {
    setMessage(null);

    if (!email) {
      setMessage("Missing email context. Please go back and sign up again.");
      return;
    }

    const cleanedOtp = sanitizeOtp(otp);

    if (cleanedOtp.length !== OTP_LENGTH) {
      setMessage("Please enter the 6-digit OTP.");
      return;
    }

    setIsVerifying(true);
    console.log("OTP_VERIFY_REQUEST", { email, tokenLen: cleanedOtp.length });

    const { error } = await verifyWithFallback();

    console.log("OTP_VERIFY_RESULT", {
      ok: !error,
      error: error?.message ?? null,
    });

    if (error) {
      const normalized = error.message.toLowerCase();
      if (normalized.includes("expired") || normalized.includes("invalid")) {
        setMessage("Invalid or expired OTP. Please request a new code.");
      } else {
        setMessage(error.message);
      }
      setIsVerifying(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      setMessage(userError?.message || "Unable to load authenticated user.");
      setIsVerifying(false);
      return;
    }

    const profilePayload = {
      name,
      usn,
      email,
    };

    let { error: profileError } = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", user.id);

    if (profileError) {
      await delay(350);
      const retryResult = await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("id", user.id);
      profileError = retryResult.error;

      if (profileError) {
        const upsertResult = await supabase.from("profiles").upsert(
          {
            id: user.id,
            ...profilePayload,
          },
          { onConflict: "id" }
        );
        profileError = upsertResult.error;
      }
    }

    console.log("PROFILE_UPDATE_RESULT", {
      userId: user.id,
      error: profileError?.message ?? null,
    });

    if (profileError) {
      setMessage(profileError.message);
      setIsVerifying(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("roles(name)")
      .eq("id", user.id)
      .maybeSingle<ProfileWithRole>();

    const role = resolveRole(profile);

    if (role === "faculty" || role === "admin") {
      router.replace("/faculty-home");
    } else if (role === "president") {
      router.replace("/president-home");
    } else {
      router.replace("/student-home");
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
    console.log("OTP_SEND_REQUEST", { email });

    const { error } = await supabase.auth.resend({
      email,
      type: "signup",
    });

    if (error) {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });

      if (otpError) {
        setMessage(otpError.message || error.message || "Unable to resend OTP.");
        setIsResending(false);
        return;
      }
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
            onChangeText={(value) => setOtp(sanitizeOtp(value))}
            placeholder="Enter OTP"
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
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
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  readonlyInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  message: {
    color: "#dc2626",
    fontSize: 13,
    marginBottom: 12,
  },
  verifyButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  verifyButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "600",
  },
  backLink: {
    textAlign: "center",
    color: "#2563eb",
    fontWeight: "500",
  },
});
