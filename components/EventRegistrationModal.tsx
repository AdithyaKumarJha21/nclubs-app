import { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { registerForEvent } from "../services/registrations";
import { useTheme } from "../theme/ThemeContext";

interface EventRegistrationModalProps {
  visible: boolean;
  eventId: string;
  eventTitle: string;
  initialEmail?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EventRegistrationModal({
  visible,
  eventId,
  eventTitle,
  initialEmail,
  onClose,
  onSuccess,
}: EventRegistrationModalProps) {
  const { isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [usn, setUsn] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [usnError, setUsnError] = useState("");

  useEffect(() => {
    if (!visible) return;

    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [visible, initialEmail, email]);

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const trimmedUsn = usn.trim();
    const nextEmailError =
      !trimmedEmail || !trimmedEmail.includes("@") ? "Enter a valid email." : "";
    const nextUsnError = !trimmedUsn ? "USN is required." : "";

    setEmailError(nextEmailError);
    setUsnError(nextUsnError);

    if (nextEmailError || nextUsnError) {
      return;
    }

    try {
      setLoading(true);

      const { status } = await registerForEvent(eventId, trimmedEmail, trimmedUsn);

      if (status === "exists") {
        Alert.alert("Already Registered", "You are already registered.");
      } else {
        Alert.alert("Success", "Registered successfully!");
      }

      onSuccess();
      setEmail("");
      setUsn("");
      onClose();
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", "Failed to register for event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: isDark ? "#2a2a2a" : "#fff" },
          ]}
        >
          <Text
            style={[
              styles.title,
              { color: isDark ? "#fff" : "#000" },
            ]}
          >
            Register for Event
          </Text>

          <Text
            style={[
              styles.eventName,
              { color: isDark ? "#aaa" : "#666" },
            ]}
          >
            {eventTitle}
          </Text>

          {/* Email Input */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: isDark ? "#aaa" : "#666" }]}>
              Email
            </Text>
            <TextInput
              placeholder="you@nmit.ac.in"
              placeholderTextColor={isDark ? "#666" : "#ccc"}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (emailError) {
                  setEmailError("");
                }
              }}
              keyboardType="email-address"
              editable={!loading}
              style={[
                styles.input,
                {
                  borderColor: isDark ? "#444" : "#ddd",
                  color: isDark ? "#fff" : "#000",
                  backgroundColor: isDark ? "#1a1a1a" : "#f9f9f9",
                },
              ]}
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          {/* USN Input */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: isDark ? "#aaa" : "#666" }]}>
              USN
            </Text>
            <TextInput
              placeholder="1NMxx..."
              placeholderTextColor={isDark ? "#666" : "#ccc"}
              value={usn}
              onChangeText={(value) => {
                setUsn(value);
                if (usnError) {
                  setUsnError("");
                }
              }}
              editable={!loading}
              style={[
                styles.input,
                {
                  borderColor: isDark ? "#444" : "#ddd",
                  color: isDark ? "#fff" : "#000",
                  backgroundColor: isDark ? "#1a1a1a" : "#f9f9f9",
                },
              ]}
            />
            {usnError ? (
              <Text style={styles.errorText}>{usnError}</Text>
            ) : null}
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { opacity: loading ? 0.6 : 1 }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.registerButton, { opacity: loading ? 0.6 : 1 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? "Registering..." : "Register"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    borderRadius: 12,
    padding: 20,
    width: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  eventName: {
    fontSize: 14,
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 12,
    marginTop: 6,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0066cc",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#0066cc",
    fontWeight: "600",
    fontSize: 14,
  },
  registerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#0066cc",
    alignItems: "center",
  },
  registerButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
