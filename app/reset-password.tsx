import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

type RecoveryParams = {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
};

const getRecoveryParamsFromUrl = (url: string): RecoveryParams => {
  const [withoutHash, hashPart = ""] = url.split("#");
  const queryPart = withoutHash.includes("?")
    ? withoutHash.split("?")[1]
    : "";

  const hashParams = new URLSearchParams(hashPart);
  const queryParams = new URLSearchParams(queryPart);

  const accessToken =
    hashParams.get("access_token") ?? queryParams.get("access_token");
  const refreshToken =
    hashParams.get("refresh_token") ?? queryParams.get("refresh_token");
  const code = hashParams.get("code") ?? queryParams.get("code");

  return {
    accessToken,
    refreshToken,
    code,
  };
};

export default function ResetPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const setBlockedState = () => {
      if (!isMounted) {
        return;
      }

      setIsRecoveryReady(false);
      setIsCheckingLink(false);
      setEmail("");
    };

    const syncFromSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (session?.user?.email) {
        setEmail(session.user.email);
        setIsRecoveryReady(true);
      } else {
        setIsRecoveryReady(false);
      }

      setIsCheckingLink(false);
    };

    const handleIncomingUrl = async (url: string) => {
      console.log("INCOMING_DEEPLINK_URL", url);

      const { accessToken, refreshToken, code } = getRecoveryParamsFromUrl(url);
      const hasTokenPair = Boolean(accessToken && refreshToken);
      const hasCode = Boolean(code);

      console.log("RECOVERY_LINK_DETECTED", {
        hasTokenPair,
        hasCode,
      });

      if (!hasTokenPair && !hasCode) {
        setBlockedState();
        return;
      }

      if (hasTokenPair) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken as string,
          refresh_token: refreshToken as string,
        });

        if (error) {
          console.log("RESET_SET_SESSION_ERROR", error.message);
          setBlockedState();
          return;
        }
      } else if (hasCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          code as string,
        );

        if (error) {
          console.log("RESET_EXCHANGE_CODE_ERROR", error.message);
          setBlockedState();
          return;
        }
      }

      await syncFromSession();
    };

    const initialize = async () => {
      const initialUrl = await Linking.getInitialURL();

      if (!initialUrl) {
        setBlockedState();
        return;
      }

      await handleIncomingUrl(initialUrl);
    };

    const linkSubscription = Linking.addEventListener("url", ({ url }) => {
      setIsCheckingLink(true);
      void handleIncomingUrl(url);
    });

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event) => {
      console.log("AUTH_EVENT", event);
    });

    void initialize();

    return () => {
      isMounted = false;
      linkSubscription.remove();
      authSubscription.unsubscribe();
    };
  }, []);

  const canSubmit = useMemo(() => {
    return (
      isRecoveryReady &&
      newPassword.length >= 8 &&
      confirmPassword.length >= 8 &&
      newPassword === confirmPassword &&
      !loading
    );
  }, [confirmPassword, isRecoveryReady, loading, newPassword]);

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Password updated. Please log in again.");
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
        <Text style={styles.subtitle}>Set a new password for your account.</Text>

        {isCheckingLink ? (
          <View style={styles.pendingState}>
            <ActivityIndicator color="#2563eb" />
            <Text style={styles.pendingText}>Validating reset link...</Text>
          </View>
        ) : null}

        {!isCheckingLink && !isRecoveryReady ? (
          <View style={styles.invalidState}>
            <Text style={styles.invalidText}>
              Invalid or expired link. Please request a new reset email.
            </Text>
          </View>
        ) : null}

        {!isCheckingLink && isRecoveryReady ? (
          <>
            <TextInput
              style={[styles.input, styles.readOnlyInput]}
              placeholder="Email"
              value={email}
              editable={false}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="New password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm password"
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
                {loading ? "Updating..." : "Update password"}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
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
  pendingState: {
    alignItems: "center",
    marginBottom: 12,
  },
  pendingText: {
    marginTop: 8,
    color: "#64748b",
    textAlign: "center",
  },
  invalidState: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  invalidText: {
    color: "#991b1b",
    textAlign: "center",
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  readOnlyInput: {
    backgroundColor: "#f8fafc",
    color: "#334155",
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
  },
});
