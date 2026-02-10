import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

const isValidEmailAddress = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function ChangePresidentScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  const [newEmail, setNewEmail] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user || user.role !== "president") {
      router.replace("/login");
    }
  }, [loading, router, user]);

  const trimmedEmail = newEmail.trim();
  const normalizedConfirmText = confirmText.trim().toUpperCase();

  const emailError = useMemo(() => {
    if (!trimmedEmail) {
      return "Email is required.";
    }

    if (!isValidEmailAddress(trimmedEmail)) {
      return "Please enter a valid email address.";
    }

    return null;
  }, [trimmedEmail]);

  const confirmError = useMemo(() => {
    if (!confirmText.trim()) {
      return 'Type "YES" to confirm.';
    }

    if (normalizedConfirmText !== "YES") {
      return 'Confirmation must be "YES".';
    }

    return null;
  }, [confirmText, normalizedConfirmText]);

  const isTransferDisabled = Boolean(emailError) || Boolean(confirmError) || isSubmitting;

  const handleTransferPresident = async () => {
    if (isTransferDisabled) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.log("change-president auth error", authError);
      }

      if (!auth?.user) {
        Alert.alert("Session expired", "Please login again.");
        router.replace("/login");
        return;
      }

      console.log("change-president currentUserId", auth.user.id);
      console.log("change-president newEmail", trimmedEmail);
      console.log("change-president confirmTextNormalized", normalizedConfirmText);

      const { data: presidentAssignment, error: assignmentError } = await supabase
        .from("president_assignments")
        .select("club_id")
        .eq("user_id", auth.user.id)
        .maybeSingle<{ club_id: string | null }>();

      if (assignmentError) {
        console.log("change-president assignment error", assignmentError);
        Alert.alert("Transfer failed", "Unable to resolve your club assignment.");
        return;
      }

      if (!presidentAssignment?.club_id) {
        Alert.alert("Transfer failed", "No club assigned. Contact admin.");
        return;
      }

      console.log("change-president club_id resolved", presidentAssignment.club_id);

      const { data: transferData, error: transferError } = await supabase.rpc(
        "transfer_president_by_email",
        {
          p_club_id: presidentAssignment.club_id,
          p_new_president_email: trimmedEmail,
          p_confirm: "TRANSFER PRESIDENT",
        }
      );

      console.log("change-president rpc data", transferData);

      if (transferError) {
        console.log("change-president rpc error", transferError);
        Alert.alert("Transfer failed", transferError.message || "Could not transfer president.");
        return;
      }

      Alert.alert(
        "Success",
        "President transferred successfully. You will be signed out."
      );

      await supabase.auth.signOut();
      router.replace({
        pathname: "/login",
        params: { signedOut: "1", reason: "signed_out" },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user || user.role !== "president") {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: "Transfer President" }} />

      <Text style={[styles.title, { color: theme.text }]}>Transfer President</Text>

      <TextInput
        style={[styles.input, { color: theme.text }]}
        placeholder="new-president@email.com"
        placeholderTextColor="#9ca3af"
        value={newEmail}
        onChangeText={setNewEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {emailError ? <Text style={styles.inlineError}>{emailError}</Text> : null}

      <TextInput
        style={[styles.input, { color: theme.text }]}
        placeholder='Type YES to confirm'
        placeholderTextColor="#9ca3af"
        value={confirmText}
        onChangeText={setConfirmText}
        autoCapitalize="characters"
      />
      {confirmError ? <Text style={styles.inlineError}>{confirmError}</Text> : null}

      <TouchableOpacity
        style={[styles.button, isTransferDisabled && styles.disabledButton]}
        onPress={handleTransferPresident}
        disabled={isTransferDisabled}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Transfer President</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  inlineError: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  button: {
    marginTop: 8,
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
