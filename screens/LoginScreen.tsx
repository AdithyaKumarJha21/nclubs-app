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
import { isValidEmail, sanitizeOtp } from "../utils/auth";

type RoleName = "student" | "faculty" | "president" | "admin";

type RoleRow = {
  name: RoleName;
};

type ProfileWithRole = {
  roles: RoleRow | RoleRow[] | null;
};

const OTP_LENGTH = 6;

const resolveRole = (profile: ProfileWithRole | null): RoleName | null => {
  const roleValue = profile?.roles;

  if (Array.isArray(roleValue)) {
    return roleValue[0]?.name ?? null;
  }

  return roleValue?.name ?? null;
};

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    signedOut?: string;
    reason?: string;
    email?: string;
  }>();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const topMessage = useMemo(() => {
    if (params.reason === "password_reset") {
      return "Password updated. Log in with OTP.";
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

  const sendOtp = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("Please enter your email.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSendingOtp(true);

    console.log("OTP_SEND_REQUEST", { email: normalizedEmail });

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    setIsSendingOtp(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setOtpSent(true);
    setInfoMessage("OTP sent. Enter the 6-digit code from your email.");
  };

  const verifyOtp = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    const cleanedOtp = sanitizeOtp(otp);

    if (!normalizedEmail) {
      setErrorMessage("Please enter your email.");
      return;
    }

    if (cleanedOtp.length !== OTP_LENGTH) {
      setErrorMessage("Please enter a valid 6-digit OTP.");
      return;
    }

    setIsVerifyingOtp(true);

    console.log("OTP_VERIFY_REQUEST", {
      email: normalizedEmail,
      tokenLen: cleanedOtp.length,
    });

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: cleanedOtp,
      type: "email",
    });

    console.log("OTP_VERIFY_RESULT", {
      ok: !verifyError,
      error: verifyError?.message ?? null,
    });

    if (verifyError) {
      const normalized = verifyError.message.toLowerCase();
      if (normalized.includes("expired") || normalized.includes("invalid")) {
        setErrorMessage("Invalid or expired OTP. Please request a new code.");
      } else {
        setErrorMessage(verifyError.message);
      }
      setIsVerifyingOtp(false);
      return;
    }

    const userId = data.user?.id;

    if (!userId) {
      setErrorMessage("Unable to load signed-in user.");
      setIsVerifyingOtp(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("roles(name)")
      .eq("id", userId)
      .maybeSingle<ProfileWithRole>();

    if (profileError) {
      setErrorMessage(profileError.message);
      setIsVerifyingOtp(false);
      return;
    }

    const role = resolveRole(profile);

    if (!role) {
      router.replace("/student-home");
      setIsVerifyingOtp(false);
      return;
    }

    if (role === "faculty" || role === "admin") {
      router.replace("/faculty-home");
      setIsVerifyingOtp(false);
      return;
    }

    if (role === "president") {
      router.replace("/president-home");
      setIsVerifyingOtp(false);
      return;
    }

    router.replace("/student-home");
    setIsVerifyingOtp(false);
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
            editable={!otpSent && !isSendingOtp && !isVerifyingOtp}
          />
        </View>

        {otpSent ? (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>OTP</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={(value) => setOtp(sanitizeOtp(value))}
              maxLength={OTP_LENGTH}
              editable={!isVerifyingOtp}
            />
          </View>
        ) : null}

        {infoMessage ? <Text style={styles.info}>{infoMessage}</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {otpSent ? (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={verifyOtp}
            disabled={isVerifyingOtp}
          >
            {isVerifyingOtp ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={sendOtp}
            disabled={isSendingOtp}
          >
            {isSendingOtp ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleForgotPasswordPress}>
          <Text style={styles.link}>Forgot Password?</Text>
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
