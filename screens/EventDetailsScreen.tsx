import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import EventRegistrationModal from "../components/EventRegistrationModal";
import { useAuth } from "../context/AuthContext";
import { EventDetail, getEventById } from "../services/events";
import { EventRegistration, getMyRegistration } from "../services/registrations";
import { useTheme } from "../theme/ThemeContext";
import {
  formatTimeLocal,
  getEventWindowStatus,
  isWithinEventWindow,
} from "../utils/timeWindow";

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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!resolvedEventId) return;
    let isMounted = true;

    const loadDetails = async () => {
      try {
        setLoading(true);
        const [eventData, registrationData] = await Promise.all([
          getEventById(resolvedEventId),
          getMyRegistration(resolvedEventId),
        ]);

        if (!isMounted) return;
        setEvent(eventData);
        setRegistration(registrationData);

        console.log("📍 Event detail loaded", {
          userId: user?.id,
          eventId: resolvedEventId,
          qrEnabled: eventData.qr_enabled,
          startTime: eventData.start_time,
          endTime: eventData.end_time,
          now: new Date().toISOString(),
          isRegistered: !!registrationData,
        });

        if (!registrationData && !hasPrompted) {
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
  }, [resolvedEventId, user?.id, hasPrompted]);

  const isRegistered = !!registration;

  const scanStatus = useMemo(() => {
    if (!event) return null;

    if (!event.qr_enabled) {
      return {
        enabled: false,
        message: "QR not enabled yet.",
      } as const;
    }

    const status = getEventWindowStatus(event.start_time, event.end_time, now);
    if (status === "before") {
      return {
        enabled: false,
        message: `Scan opens at ${formatTimeLocal(event.start_time)}.`,
      } as const;
    }
    if (status === "after") {
      return {
        enabled: false,
        message: "Event ended. Scan closed.",
      } as const;
    }
    if (status === "invalid") {
      return {
        enabled: false,
        message: "Scan window unavailable.",
      } as const;
    }

    return {
      enabled: true,
      message: "Scan is open now.",
    } as const;
  }, [event, now]);

  const handleRegistrationSuccess = (email: string, usn: string) => {
    setRegistration((prev) =>
      prev ??
      ({
        id: "",
        event_id: resolvedEventId,
        user_id: user?.id ?? "",
        email,
        usn,
        registered_at: new Date().toISOString(),
      } as EventRegistration)
    );
    setShowRegistrationModal(false);
  };

  const handleScanQR = async () => {
    if (!event) return;

    if (!event.qr_enabled || !isWithinEventWindow(event.start_time, event.end_time, now)) {
      Alert.alert("Scan unavailable", scanStatus?.message ?? "Scan not available yet.");
      return;
    }

    if (!isRegistered) {
      Alert.alert("Registration required", "Please register before scanning.");
      return;
    }

    router.push({
      pathname: "/qr-scanner",
      params: { eventId: resolvedEventId, mode: "student" },
    });
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
              <Text style={styles.badgeText}>✓ Registered</Text>
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
            <DetailRow
              label="Location"
              value={event.location || "TBA"}
              isDark={isDark}
            />
          </View>

          {event.description ? (
            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
                Description
              </Text>
              <Text style={[styles.description, { color: isDark ? "#aaa" : "#666" }]}>
                {event.description}
              </Text>
            </View>
          ) : null}

          {isRegistered ? (
            <View style={styles.scanSection}>
              <TouchableOpacity
                style={[
                  styles.scanButton,
                  { backgroundColor: scanStatus?.enabled ? "#0066cc" : "#999" },
                ]}
                onPress={handleScanQR}
                disabled={!scanStatus?.enabled}
              >
                <Text style={styles.scanButtonText}>Scan QR for Attendance</Text>
              </TouchableOpacity>

              <Text
                style={[styles.scanHint, { color: isDark ? "#aaa" : "#666" }]}
              >
                {scanStatus?.message}
              </Text>

            </View>
          ) : (
            <View>
              <Text style={[styles.scanHint, { color: isDark ? "#aaa" : "#666" }]}>
                Please register to scan attendance.
              </Text>
              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => setShowRegistrationModal(true)}
              >
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
      <Text style={[styles.detailLabel, { color: isDark ? "#aaa" : "#666" }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: isDark ? "#fff" : "#000" }]}>
        {value}
      </Text>
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
});
