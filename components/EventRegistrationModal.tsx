import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { EventRegistration, registerForEvent } from "../services/registrations";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

interface EventRegistrationModalProps {
  visible: boolean;
  eventId: string;
  eventTitle: string;
  initialEmail?: string | null;
  onClose: () => void;
  onSuccess: (registration: EventRegistration) => void;
}

export default function EventRegistrationModal({
  visible,
  eventId,
  eventTitle,
  initialEmail,
  onClose,
  onSuccess,
}: EventRegistrationModalProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [usn, setUsn] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const loadEmail = async () => {
      if (initialEmail && !email) {
        setEmail(initialEmail);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email && !email) {
        setEmail(user.email);
      }
    };

    loadEmail();
  }, [visible, initialEmail, email]);

  const handleRegister = async () => {
    if (isSubmitting) {
      return;
    }

    if (!email.trim() || !usn.trim()) {
      Alert.alert("Validation Error", "Please fill in both email and USN");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Validation Error", "Please enter a valid email");
      return;
    }

    try {
      setIsSubmitting(true);

      const { registration, alreadyRegistered } = await registerForEvent(
        eventId,
        usn,
        email
      );

      if (!registration) {
        throw new Error("Could not confirm registration state. Please try again.");
      }

      if (alreadyRegistered) {
        Alert.alert("Already registered", "You are already registered");
      } else {
        Alert.alert("Success", "Successfully registered!");
      }

      onSuccess(registration);
      setEmail("");
      setUsn("");
      onClose();
      router.replace({ pathname: "/event-details", params: { eventId } });
    } catch (error) {
      console.error("Registration error:", error);

      const message =
        error instanceof Error && error.message
          ? error.message
          : "Registration failed";

      if (message === "You are already registered") {
        Alert.alert("Already registered", "You are already registered");
        return;
      }

      if (message === "Not allowed (RLS)") {
        Alert.alert("Not allowed", "Not allowed (RLS)");
        return;
      }

      Alert.alert("Error", "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[
            styles.container,
            { backgroundColor: isDark ? "#2a2a2a" : "#fff" },
          ]}
        >
          <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
            Register for Event
          </Text>

          <Text style={[styles.eventName, { color: isDark ? "#aaa" : "#666" }]}>
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
              onChangeText={setEmail}
              keyboardType="email-address"
              editable={!isSubmitting}
              style={[
                styles.input,
                {
                  borderColor: isDark ? "#444" : "#ddd",
                  color: isDark ? "#fff" : "#000",
                  backgroundColor: isDark ? "#1a1a1a" : "#f9f9f9",
                },
              ]}
            />
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
              onChangeText={(value) => setUsn(value.toUpperCase())}
              editable={!isSubmitting}
              style={[
                styles.input,
                {
                  borderColor: isDark ? "#444" : "#ddd",
                  color: isDark ? "#fff" : "#000",
                  backgroundColor: isDark ? "#1a1a1a" : "#f9f9f9",
                },
              ]}
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.registerButton, { opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              <Text style={styles.registerButtonText}>
                {isSubmitting ? "Registering..." : "Register"}
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
