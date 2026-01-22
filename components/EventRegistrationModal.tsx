import { useState } from "react";
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

interface EventRegistrationModalProps {
  visible: boolean;
  eventId: string;
  eventTitle: string;
  userId: string;
  onClose: () => void;
  onSuccess: (email: string, usn: string) => void;
}

export default function EventRegistrationModal({
  visible,
  eventId,
  eventTitle,
  userId,
  onClose,
  onSuccess,
}: EventRegistrationModalProps) {
  const { isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [usn, setUsn] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !usn.trim()) {
      Alert.alert("Validation Error", "Please fill in both email and USN");
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Validation Error", "Please enter a valid email");
      return;
    }

    try {
      setLoading(true);

      // Check if already registered
      const { data: existing, error: checkError } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .single();

      if (existing) {
        Alert.alert("Already Registered", "You are already registered for this event");
        onClose();
        return;
      }

      // Register for event
      const { error: registerError } = await supabase
        .from("event_registrations")
        .insert({
          event_id: eventId,
          user_id: userId,
          email: email.trim(),
          usn: usn.trim(),
        });

      if (registerError) throw registerError;

      Alert.alert("Success", "Successfully registered for the event!");
      onSuccess(email, usn);
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
              onChangeText={setEmail}
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
              onChangeText={setUsn}
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
