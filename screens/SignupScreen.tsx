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
import { isValidEmail, sanitizeOtp } from "../utils/auth";

type RoleName = "student" | "faculty" | "president" | "admin";

type RoleRow = {
  name: RoleName;
};

type ProfileWithRole = {
  roles: RoleRow | RoleRow[] | null;
};

const OTP_LENGTH = 6;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const resolveRole = (profile: ProfileWithRole | null): RoleName | null => {
  const roleValue = profile?.roles;

  if (Array.isArray(roleValue)) {
    return roleValue[0]?.name ?? null;
  }

  return roleValue?.name ?? null;
};

export default function SignupScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [usn, setUsn] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const getNormalizedEmail = () => email.trim().toLowerCase();

  const fetchAndRouteByRole = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("roles(name)")
      .eq("id", userId)
      .maybeSingle<ProfileWithRole>();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const role = resolveRole(profile);

    if (role === "faculty" || role === "admin") {
      router.replace("/faculty-home");
      return;
    }

    if (role === "president") {
      router.replace("/president-home");
      return;
    }

    router.replace("/student-home");
  };

  const sendOtp = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    const normalizedEmail = getNormalizedEmail();

    if (!name.trim() || !usn.trim() || !normalizedEmail) {
      setErrorMessage("Please enter name, USN, and email.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSendingOtp(true);

    console.log("OTP_SEND_REQUEST", { email: normalizedEmail });

    const { data: existingProfile, error: usnCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("usn", usn.trim())
      .maybeSingle();

    if (existingProfile) {
      setErrorMessage("This USN is already registered.");
      setIsSendingOtp(false);
      return;
    }

    if (usnCheckError) {
      setErrorMessage(usnCheckError.message);
      setIsSendingOtp(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
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

    const normalizedEmail = getNormalizedEmail();
    const cleanedOtp = sanitizeOtp(otp);

    if (!normalizedEmail) {
      setErrorMessage("Missing email. Please re-enter your details.");
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

    const { error: verifyError } = await supabase.auth.verifyOtp({
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      setErrorMessage(userError?.message || "Unable to load signed-in user.");
      setIsVerifyingOtp(false);
      return;
    }

    const profilePayload = {
      name: name.trim(),
      usn: usn.trim(),
      email: normalizedEmail,
    };

    let { error: updateError } = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", user.id);

    if (updateError) {
      await delay(350);
      const retryResult = await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("id", user.id);
      updateError = retryResult.error;

      if (updateError) {
        const upsertResult = await supabase.from("profiles").upsert(
          {
            id: user.id,
            ...profilePayload,
          },
          { onConflict: "id" }
        );
        updateError = upsertResult.error;
      }
    }

    console.log("PROFILE_UPDATE_RESULT", {
      userId: user.id,
      error: updateError?.message ?? null,
    });

    if (updateError) {
      setErrorMessage(updateError.message);
      setIsVerifyingOtp(false);
      return;
    }

    await fetchAndRouteByRole(user.id);
    setIsVerifyingOtp(false);
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
          Sign up with email OTP. No password required.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Adithya Kumar Jha"
            value={name}
            onChangeText={setName}
            editable={!otpSent && !isSendingOtp && !isVerifyingOtp}
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
            editable={!otpSent && !isSendingOtp && !isVerifyingOtp}
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
            style={styles.primaryButton}
            onPress={verifyOtp}
            disabled={isVerifyingOtp}
          >
            {isVerifyingOtp ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={sendOtp}
            disabled={isSendingOtp}
          >
            {isSendingOtp ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        )}

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
