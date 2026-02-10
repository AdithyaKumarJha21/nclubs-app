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
  const hashPart = url.includes("#") ? url.split("#")[1] : "";
  const queryPart = url.includes("?") ? url.split("?")[1].split("#")[0] : "";

  const hashParams = new URLSearchParams(hashPart);
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

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeRecoverySession = async () => {
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        const tokens = getRecoveryTokensFromUrl(initialUrl);

        if (tokens) {
          await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          });
        }
      }

      const { data } = await supabase.auth.getSession();

      if (isMounted && data.session) {
        setIsRecoveryReady(true);
      }
    };

    initializeRecoverySession();

    const linkingSubscription = Linking.addEventListener("url", async ({ url }) => {
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
      if (__DEV__) {
        console.log("Auth event", event);
      }

      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setIsRecoveryReady(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const isFormValid = useMemo(() => {
    return newPassword.length >= 6 && newPassword === confirmPassword;
  }, [confirmPassword, newPassword]);

  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Please fill in both password fields.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Success", "Password updated", [
      {
        text: "OK",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/login?reason=password_reset");
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Set a new password for your account.
        </Text>

        {!isRecoveryReady ? (
          <View style={styles.pendingState}>
            <ActivityIndicator color="#2563eb" />
            <Text style={styles.pendingText}>
              Open this screen from your password reset email link.
            </Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="New password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={[
            styles.button,
            (!isRecoveryReady || !isFormValid || loading) && styles.buttonDisabled,
          ]}
          onPress={handleUpdatePassword}
          disabled={!isRecoveryReady || !isFormValid || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Updating..." : "Update Password"}
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
    marginBottom: 16,
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
