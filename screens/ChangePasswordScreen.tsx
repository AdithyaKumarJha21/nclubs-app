import { useRouter } from "expo-router";
import { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOldPasswordVisible, setIsOldPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  // ✅ PASSWORD VALIDATION FUNCTION
  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one capital letter (A-Z)";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one small letter (a-z)";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one numerical digit (0-9)";
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return "Password must contain at least one special character (!@#$%^&*...)";
    }
    return null; // Password is valid
  };

  const handleSubmit = async () => {
    // ✅ VALIDATION
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // ✅ CHECK PASSWORD STRENGTH
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      Alert.alert("Weak Password", passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New password and confirm password do not match");
      return;
    }

    if (oldPassword === newPassword) {
      Alert.alert("Error", "New password must be different from old password");
      return;
    }

    setLoading(true);

    try {
      // ✅ UPDATE PASSWORD IN SUPABASE
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        Alert.alert("Error", error.message || "Failed to change password");
        console.error("Password change error:", error);
        setLoading(false);
        return;
      }

      Alert.alert(
        "Success",
        "Password changed successfully. Please login again with your new password.",
        [
          {
            text: "OK",
            onPress: async () => {
              // Sign out and redirect to login
              await supabase.auth.signOut();
              router.replace("/login");
            },
          },
        ]
      );

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error("Unexpected error:", err);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>Change Password</Text>

        <Text style={[styles.subtitle, { color: theme.text }]}>
          Update your password to keep your account secure
        </Text>

        <View style={[styles.passwordField, { borderColor: theme.text }]}>
          <TextInput
            placeholder="Old Password"
            secureTextEntry={!isOldPasswordVisible}
            style={[
              styles.input,
              styles.passwordInput,
              { color: theme.text },
            ]}
            placeholderTextColor={theme.text}
            value={oldPassword}
            onChangeText={setOldPassword}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setIsOldPasswordVisible((prev) => !prev)}
            accessibilityLabel={isOldPasswordVisible ? "Hide old password" : "Show old password"}
            disabled={loading}
            style={styles.passwordToggle}
          >
            <Ionicons
              name={isOldPasswordVisible ? "eye-off" : "eye"}
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.passwordField, { borderColor: theme.text }]}>
          <TextInput
            placeholder="New Password"
            secureTextEntry={!isNewPasswordVisible}
            style={[
              styles.input,
              styles.passwordInput,
              { color: theme.text },
            ]}
            placeholderTextColor={theme.text}
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setIsNewPasswordVisible((prev) => !prev)}
            accessibilityLabel={isNewPasswordVisible ? "Hide new password" : "Show new password"}
            disabled={loading}
            style={styles.passwordToggle}
          >
            <Ionicons
              name={isNewPasswordVisible ? "eye-off" : "eye"}
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.passwordField, { borderColor: theme.text }]}>
          <TextInput
            placeholder="Confirm Password"
            secureTextEntry={!isConfirmPasswordVisible}
            style={[
              styles.input,
              styles.passwordInput,
              { color: theme.text },
            ]}
            placeholderTextColor={theme.text}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setIsConfirmPasswordVisible((prev) => !prev)}
            accessibilityLabel={isConfirmPasswordVisible ? "Hide confirm password" : "Show confirm password"}
            disabled={loading}
            style={styles.passwordToggle}
          >
            <Ionicons
              name={isConfirmPasswordVisible ? "eye-off" : "eye"}
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, { opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={[styles.cancelText, { color: theme.text }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    padding: 12,
    fontSize: 16,
  },
  passwordField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
  },
  passwordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  cancelText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    fontWeight: "500",
  },
});
