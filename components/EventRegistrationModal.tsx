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
import {
  EventRegistration,
  getMyRegistration,
  RegisterResult,
  registerForEvent,
} from "../services/registrations";
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
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    const loadRegistrationState = async () => {
      setIsCheckingRegistration(true);

      const existingRegistration = await getMyRegistration(eventId);
      if (!isMounted) {
        return;
      }

      if (existingRegistration) {
        Alert.alert("Already registered", "You're already registered ✅");
        onSuccess(existingRegistration);
        onClose();
        setIsCheckingRegistration(false);
        return;
      }

      if (initialEmail) {
        setEmail(initialEmail);
        setIsCheckingRegistration(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        setEmail(user.email);
      }

      setIsCheckingRegistration(false);
    };

    loadRegistrationState().catch((error) => {
      console.error("Failed to load registration state", error);
      if (isMounted) {
        setIsCheckingRegistration(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [visible, eventId, initialEmail, onClose, onSuccess]);

  const handleRegister = async () => {
    if (isSubmitting || isCheckingRegistration) {
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

      const result: RegisterResult = await registerForEvent(eventId, usn, email);

      if (!result.ok) {
        const message = "message" in result ? result.message : "Registration failed";
        Alert.alert("Error", message);
        return;
      }

      if (result.alreadyRegistered) {
        Alert.alert("Already registered", "You're already registered ✅");
      } else {
        Alert.alert("Success", "Successfully registered!");
      }

      const latestRegistration = await getMyRegistration(eventId);

      if (latestRegistration) {
        onSuccess(latestRegistration);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          Alert.alert("Error", "Registration succeeded but could not load status.");
          return;
        }

        onSuccess({
          id: `optimistic-${eventId}-${user.id}`,
          event_id: eventId,
          user_id: user.id,
          email: email.trim(),
          usn: usn.trim().toUpperCase(),
          registered_at: new Date().toISOString(),
        });
      }

      setEmail("");
      setUsn("");
      onClose();
      router.replace({ pathname: "/event-details", params: { eventId } });
    } catch (error) {
      console.error("Registration error:", error);
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
              editable={!isSubmitting && !isCheckingRegistration}
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
              editable={!isSubmitting && !isCheckingRegistration}
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
              style={[
                styles.cancelButton,
                { opacity: isSubmitting || isCheckingRegistration ? 0.6 : 1 },
              ]}
              onPress={onClose}
              disabled={isSubmitting || isCheckingRegistration}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.registerButton,
                { opacity: isSubmitting || isCheckingRegistration ? 0.6 : 1 },
              ]}
              onPress={handleRegister}
              disabled={isSubmitting || isCheckingRegistration}
            >
              <Text style={styles.registerButtonText}>
                {isCheckingRegistration
                  ? "Checking..."
                  : isSubmitting
                    ? "Registering..."
                    : "Register"}
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
