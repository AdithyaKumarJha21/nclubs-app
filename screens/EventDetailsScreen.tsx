import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import EventRegistrationModal from "../components/EventRegistrationModal";
import { useAuth } from "../context/AuthContext";
import { hasMarkedAttendance, markAttendance } from "../services/attendance";
import { EventDetail, getEventById } from "../services/events";
import {
  EventRegistration,
  getMyRegistration,
  isEventRegisteredLocally,
} from "../services/registrations";
import { useTheme } from "../theme/ThemeContext";
import { formatTimeLocal } from "../utils/timeWindow";

export default function EventDetailsScreen() {
  const router = useRouter();
  const { eventId, id } = useLocalSearchParams<{ eventId?: string; id?: string }>();
  const resolvedEventId = eventId ?? id ?? "";
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  useEffect(() => {
    if (!resolvedEventId) return;
    let isMounted = true;

    const loadDetails = async () => {
      try {
        setLoading(true);
        const [eventData, registrationData, cachedRegistration, alreadyMarked] =
          await Promise.all([
            getEventById(resolvedEventId),
            getMyRegistration(resolvedEventId),
            isEventRegisteredLocally(resolvedEventId),
            hasMarkedAttendance(resolvedEventId),
          ]);

        if (!isMounted) return;

        const resolvedRegistration =
          registrationData ??
          (cachedRegistration
            ? {
                id: `cached-${resolvedEventId}-${user?.id ?? "unknown"}`,
                event_id: resolvedEventId,
                user_id: user?.id ?? "unknown",
                email: user?.email ?? "",
                usn: "",
                registered_at: new Date().toISOString(),
              }
            : null);

        setEvent(eventData);
        setRegistration(resolvedRegistration);
        setAttendanceMarked(alreadyMarked);

        if (!resolvedRegistration && !hasPrompted) {
          setShowRegistrationModal(true);
          setHasPrompted(true);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        Alert.alert("Error", "Failed to load event details");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [resolvedEventId, user?.id, user?.email, hasPrompted]);

  const isRegistered = !!registration;

  const attendanceStatus = useMemo(() => {
    if (!event) return null;

    if (!event.qr_enabled) {
      return {
        enabled: false,
        message: "Attendance is disabled by faculty/president.",
      } as const;
    }

    if (attendanceMarked) {
      return {
        enabled: false,
        message: "Attendance already submitted.",
      } as const;
    }

    return {
      enabled: true,
      message: "Attendance is enabled. You can submit once.",
    } as const;
  }, [attendanceMarked, event]);

  const handleRegistrationSuccess = (newRegistration: EventRegistration) => {
    setRegistration(newRegistration);
    setShowRegistrationModal(false);
  };

  const openAttendanceModal = () => {
    if (!isRegistered) {
      Alert.alert("Registration required", "Please register before submitting attendance.");
      return;
    }

    if (!attendanceStatus?.enabled) {
      Alert.alert("Attendance unavailable", attendanceStatus?.message ?? "Not available now.");
      return;
    }

    setShowAttendanceModal(true);
  };

  const handleSubmitAttendance = async () => {
    if (!event || !registration || submittingAttendance) return;

    try {
      setSubmittingAttendance(true);
      const result = await markAttendance(event.id);

      if (result.status === "already") {
        setAttendanceMarked(true);
        Alert.alert("Attendance already marked", "You can submit attendance only once.");
        setShowAttendanceModal(false);
        return;
      }

      if (result.status === "forbidden") {
        Alert.alert("Not allowed", "You are not allowed to mark attendance right now.");
        return;
      }

      setAttendanceMarked(true);
      setShowAttendanceModal(false);
      Alert.alert("Success", "Attendance submitted successfully ✅");
    } catch (error) {
      console.error("Attendance submit failed:", error);
      Alert.alert("Error", "Failed to submit attendance");
    } finally {
      setSubmittingAttendance(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
        ]}
      >
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  if (!event) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
        ]}
      >
        <Text style={{ color: isDark ? "#aaa" : "#666" }}>Event not found</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={[
          styles.container,
          { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
            {event.title}
          </Text>

          {isRegistered && (
            <View style={[styles.badge, { backgroundColor: "#4caf50" }]}>
              <Text style={styles.badgeText}>You are registered</Text>
            </View>
          )}

          <View style={styles.detailsSection}>
            <DetailRow
              label="Date"
              value={new Date(event.event_date).toLocaleDateString()}
              isDark={isDark}
            />
            <DetailRow
              label="Time"
              value={`${formatTimeLocal(event.start_time)} - ${formatTimeLocal(
                event.end_time
              )}`}
              isDark={isDark}
            />
            <DetailRow label="Location" value={event.location || "TBA"} isDark={isDark} />
          </View>

          {event.description ? (
            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>Description</Text>
              <Text style={[styles.description, { color: isDark ? "#aaa" : "#666" }]}>
                {event.description}
              </Text>
            </View>
          ) : null}

          {isRegistered ? (
            <View style={styles.scanSection}>
              <TouchableOpacity style={[styles.registeredButton]} disabled>
                <Text style={styles.registeredButtonText}>Registered ✓</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scanButton,
                  { backgroundColor: attendanceStatus?.enabled ? "#0066cc" : "#999" },
                ]}
                onPress={openAttendanceModal}
                disabled={!attendanceStatus?.enabled}
              >
                <Text style={styles.scanButtonText}>Attendance</Text>
              </TouchableOpacity>

              <Text style={[styles.scanHint, { color: isDark ? "#aaa" : "#666" }]}>
                {attendanceStatus?.message}
              </Text>
            </View>
          ) : (
            <View>
              <Text style={[styles.scanHint, { color: isDark ? "#aaa" : "#666" }]}>Please register to access attendance.</Text>
              <TouchableOpacity style={styles.registerButton} onPress={() => setShowRegistrationModal(true)}>
                <Text style={styles.registerButtonText}>Register for Event</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <EventRegistrationModal
        visible={showRegistrationModal}
        eventId={resolvedEventId}
        eventTitle={event.title}
        onClose={() => setShowRegistrationModal(false)}
        onSuccess={handleRegistrationSuccess}
      />

      <Modal visible={showAttendanceModal} transparent animationType="fade" onRequestClose={() => setShowAttendanceModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAttendanceModal(false)}>
          <View style={[styles.modalContainer, { backgroundColor: isDark ? "#2a2a2a" : "#fff" }]}> 
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#000" }]}>Submit Attendance</Text>
            <Text style={[styles.modalSubtitle, { color: isDark ? "#aaa" : "#666" }]}>Your registered USN</Text>
            <TextInput
              value={registration?.usn ?? ""}
              editable={false}
              style={[
                styles.usnInput,
                {
                  borderColor: isDark ? "#444" : "#ddd",
                  color: isDark ? "#fff" : "#000",
                  backgroundColor: isDark ? "#1a1a1a" : "#f4f4f4",
                },
              ]}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { opacity: submittingAttendance ? 0.6 : 1 }]}
                onPress={() => setShowAttendanceModal(false)}
                disabled={submittingAttendance}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitButton, { opacity: submittingAttendance ? 0.6 : 1 }]}
                onPress={handleSubmitAttendance}
                disabled={submittingAttendance}
              >
                <Text style={styles.modalSubmitButtonText}>{submittingAttendance ? "Submitting..." : "Submit"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  isDark: boolean;
}

function DetailRow({ label, value, isDark }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: isDark ? "#aaa" : "#666" }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: isDark ? "#fff" : "#000" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
  content: {
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  detailsSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  scanSection: {
    marginBottom: 12,
  },
  registeredButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4caf50",
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    marginBottom: 10,
  },
  registeredButtonText: {
    color: "#2e7d32",
    fontWeight: "700",
    fontSize: 15,
  },
  scanButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  scanHint: {
    marginTop: 10,
    fontSize: 12,
  },
  registerButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#0066cc",
    alignItems: "center",
  },
  registerButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  usnInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalCancelButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  modalSubmitButton: {
    backgroundColor: "#0066cc",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSubmitButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
