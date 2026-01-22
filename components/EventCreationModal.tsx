import { useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";

interface EventCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (eventData: EventFormData) => void;
  loading: boolean;
}

export interface EventFormData {
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  club_id: string;
}

export default function EventCreationModal({
  visible,
  onClose,
  onSubmit,
  loading,
}: EventCreationModalProps) {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    event_date: "",
    start_time: "",
    end_time: "",
    location: "",
    description: "",
    club_id: "",
  });

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.title.trim()) {
      Alert.alert("Error", "Please enter event title");
      return;
    }
    if (!formData.event_date.trim()) {
      Alert.alert("Error", "Please enter event date (YYYY-MM-DD)");
      return;
    }
    if (!formData.start_time.trim()) {
      Alert.alert("Error", "Please enter start time (HH:MM)");
      return;
    }
    if (!formData.end_time.trim()) {
      Alert.alert("Error", "Please enter end time (HH:MM)");
      return;
    }
    if (!formData.location.trim()) {
      Alert.alert("Error", "Please enter location");
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.event_date)) {
      Alert.alert("Error", "Date must be in YYYY-MM-DD format");
      return;
    }

    // Validate time format
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(formData.start_time)) {
      Alert.alert("Error", "Start time must be in HH:MM format");
      return;
    }
    if (!timeRegex.test(formData.end_time)) {
      Alert.alert("Error", "End time must be in HH:MM format");
      return;
    }

    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData({
      title: "",
      event_date: "",
      start_time: "",
      end_time: "",
      location: "",
      description: "",
      club_id: "",
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)" },
        ]}
      >
        <View
          style={[
            styles.modalContent,
            { backgroundColor: isDark ? "#2a2a2a" : "#fff" },
          ]}
        >
          <Text
            style={[
              styles.title,
              { color: isDark ? "#fff" : "#000" },
            ]}
          >
            Create New Event
          </Text>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Event Title */}
            <View style={styles.formGroup}>
              <Text
                style={[
                  styles.label,
                  { color: isDark ? "#ccc" : "#333" },
                ]}
              >
                Event Title *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                    color: isDark ? "#fff" : "#000",
                    borderColor: isDark ? "#444" : "#ddd",
                  },
                ]}
                placeholder="Enter event title"
                placeholderTextColor={isDark ? "#666" : "#999"}
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
                editable={!loading}
              />
            </View>

            {/* Event Date */}
            <View style={styles.formGroup}>
              <Text
                style={[
                  styles.label,
                  { color: isDark ? "#ccc" : "#333" },
                ]}
              >
                Event Date (YYYY-MM-DD) *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                    color: isDark ? "#fff" : "#000",
                    borderColor: isDark ? "#444" : "#ddd",
                  },
                ]}
                placeholder="2025-12-25"
                placeholderTextColor={isDark ? "#666" : "#999"}
                value={formData.event_date}
                onChangeText={(text) =>
                  setFormData({ ...formData, event_date: text })
                }
                editable={!loading}
              />
            </View>

            {/* Start Time */}
            <View style={styles.formGroup}>
              <Text
                style={[
                  styles.label,
                  { color: isDark ? "#ccc" : "#333" },
                ]}
              >
                Start Time (HH:MM) *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                    color: isDark ? "#fff" : "#000",
                    borderColor: isDark ? "#444" : "#ddd",
                  },
                ]}
                placeholder="14:30"
                placeholderTextColor={isDark ? "#666" : "#999"}
                value={formData.start_time}
                onChangeText={(text) =>
                  setFormData({ ...formData, start_time: text })
                }
                editable={!loading}
              />
            </View>

            {/* End Time */}
            <View style={styles.formGroup}>
              <Text
                style={[
                  styles.label,
                  { color: isDark ? "#ccc" : "#333" },
                ]}
              >
                End Time (HH:MM) *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                    color: isDark ? "#fff" : "#000",
                    borderColor: isDark ? "#444" : "#ddd",
                  },
                ]}
                placeholder="16:00"
                placeholderTextColor={isDark ? "#666" : "#999"}
                value={formData.end_time}
                onChangeText={(text) =>
                  setFormData({ ...formData, end_time: text })
                }
                editable={!loading}
              />
            </View>

            {/* Location */}
            <View style={styles.formGroup}>
              <Text
                style={[
                  styles.label,
                  { color: isDark ? "#ccc" : "#333" },
                ]}
              >
                Location *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                    color: isDark ? "#fff" : "#000",
                    borderColor: isDark ? "#444" : "#ddd",
                  },
                ]}
                placeholder="Enter event location"
                placeholderTextColor={isDark ? "#666" : "#999"}
                value={formData.location}
                onChangeText={(text) =>
                  setFormData({ ...formData, location: text })
                }
                editable={!loading}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text
                style={[
                  styles.label,
                  { color: isDark ? "#ccc" : "#333" },
                ]}
              >
                Description
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                    color: isDark ? "#fff" : "#000",
                    borderColor: isDark ? "#444" : "#ddd",
                  },
                ]}
                placeholder="Enter event description"
                placeholderTextColor={isDark ? "#666" : "#999"}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={4}
                editable={!loading}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { opacity: loading ? 0.6 : 1 },
              ]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.createButton,
                { opacity: loading ? 0.6 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Creating..." : "Create Event"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  formContainer: {
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    textAlignVertical: "top",
    paddingVertical: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#999",
  },
  createButton: {
    backgroundColor: "#0066cc",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
