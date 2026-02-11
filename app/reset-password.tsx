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

type RecoveryTokens = {
  accessToken: string;
  refreshToken: string;
};

const getRecoveryTokensFromUrl = (url: string): RecoveryTokens | null => {
  const [base, hashPart] = url.split("#");
  const queryPart = base.includes("?") ? base.split("?")[1] : "";

  const hashParams = new URLSearchParams(hashPart ?? "");
  const queryParams = new URLSearchParams(queryPart);

  const accessToken =
    hashParams.get("access_token") ?? queryParams.get("access_token");
  const refreshToken =
    hashParams.get("refresh_token") ?? queryParams.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
};

export default function ResetPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const hydrateSession = async () => {
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        console.log("INCOMING_DEEPLINK", initialUrl);

        const tokens = getRecoveryTokensFromUrl(initialUrl);

        if (tokens) {
          await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          });
        }
      }

      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (data.session) {
        setReady(true);
        setEmail(data.session.user.email ?? "");
      }
    };

    hydrateSession();

    const linkSub = Linking.addEventListener("url", async ({ url }) => {
      console.log("INCOMING_DEEPLINK", url);

      const tokens = getRecoveryTokensFromUrl(url);

      if (tokens) {
        await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AUTH_EVENT", event);

      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setEmail(session?.user?.email ?? "");
      }
    });

    return () => {
      mounted = false;
      linkSub.remove();
      subscription.unsubscribe();
    };
  }, []);

  const canSubmit = useMemo(() => {
    return (
      ready &&
      newPassword.length >= 8 &&
      confirmPassword.length >= 8 &&
      newPassword === confirmPassword &&
      !loading
    );
  }, [confirmPassword, loading, newPassword, ready]);

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

    Alert.alert("Password updated. Signed out.");
    await supabase.auth.signOut();
    setLoading(false);
    router.replace("/login?reason=password_reset");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Set a new password for your account.</Text>

        {!ready ? (
          <View style={styles.pendingState}>
            <ActivityIndicator color="#2563eb" />
            <Text style={styles.pendingText}>
              Open this page from your password reset email link.
            </Text>
          </View>
        ) : null}

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
