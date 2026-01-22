import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  club_id: string;
  created_by: string;
}

export default function EventDetailsScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [canScanQR, setCanScanQR] = useState(false);
  const [qrActive, setQrActive] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  useEffect(() => {
    if (eventId && user) {
      fetchEventDetails();
      checkRegistration();
      checkQRStatus();
      // Poll for QR status every 5 seconds
      const interval = setInterval(checkQRStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [eventId, user]);

  // Check time-based QR access
  useEffect(() => {
    if (!event) return;
    
    const checkTime = () => {
      const now = new Date();
      const eventDate = new Date(event.event_date);
      const [startHour, startMin] = event.start_time.split(":").map(Number);
      const [endHour, endMin] = event.end_time.split(":").map(Number);

      const eventStart = new Date(eventDate);
      eventStart.setHours(startHour, startMin, 0);

      const eventEnd = new Date(eventDate);
      eventEnd.setHours(endHour, endMin, 0);

      setCanScanQR(now >= eventStart && now <= eventEnd);
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [event]);

  const fetchEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error("Error fetching event:", error);
      Alert.alert("Error", "Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  const checkRegistration = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .single();

      setIsRegistered(!!data);
    } catch (error) {
      setIsRegistered(false);
    }
  };

  const checkQRStatus = async () => {
    try {
      const { data } = await supabase
        .from("qr_sessions")
        .select("status")
        .eq("event_id", eventId)
        .eq("status", "active")
        .single();

      setQrActive(!!data);
    } catch (error) {
      setQrActive(false);
    }
  };

  const handleRegistrationSuccess = async (email: string, usn: string) => {
    setIsRegistered(true);
    setShowRegistrationModal(false);
    // Refresh registration status
    await checkRegistration();
  };

  const handleScanQR = () => {
    if (!canScanQR) {
      Alert.alert(
        "Not Available",
        `QR scanning is only available during event time:\n${event?.start_time} - ${event?.end_time}`
      );
      return;
    }

    if (!qrActive) {
      Alert.alert(
        "QR Not Generated",
        "The event organizer hasn't generated the QR code yet"
      );
      return;
    }

    router.push({
      pathname: "/qr-scanner",
      params: { eventId, mode: "student" },
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Event Title */}
          <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
            {event.title}
          </Text>

          {/* Registration Status */}
          {isRegistered && (
            <View
              style={[styles.badge, { backgroundColor: "#4caf50" }]}
            >
              <Text style={styles.badgeText}>✓ Registered</Text>
            </View>
          )}

          {/* QR Status */}
          {isRegistered && (
            <View
              style={[
                styles.qrStatusBadge,
                {
                  backgroundColor: qrActive
                    ? canScanQR
                      ? "#2196f3"
                      : "#ff9800"
                    : "#ccc",
                },
              ]}
            >
              <Text style={styles.qrStatusText}>
                {!qrActive
                  ? "QR Not Generated"
                  : !canScanQR
                    ? "QR Available Later"
                    : "✓ QR Ready"}
              </Text>
            </View>
          )}

          {/* Event Details */}
          <View style={styles.detailsSection}>
            <DetailRow
              label="Date"
              value={new Date(event.event_date).toLocaleDateString()}
              isDark={isDark}
            />
            <DetailRow
              label="Time"
              value={`${event.start_time} - ${event.end_time}`}
              isDark={isDark}
            />
            <DetailRow
              label="Location"
              value={event.location || "TBA"}
              isDark={isDark}
            />
          </View>

          {/* Description */}
          {event.description && (
            <View style={styles.descriptionSection}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? "#fff" : "#000" },
                ]}
              >
                Description
              </Text>
              <Text
                style={[
                  styles.description,
                  { color: isDark ? "#aaa" : "#666" },
                ]}
              >
                {event.description}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          {isRegistered ? (
            <TouchableOpacity
              style={[
                styles.scanButton,
                {
                  backgroundColor:
                    canScanQR && qrActive ? "#0066cc" : "#999",
                },
              ]}
              onPress={handleScanQR}
              disabled={!canScanQR || !qrActive}
            >
              <Text style={styles.scanButtonText}>
                {!qrActive
                  ? "QR Not Generated Yet"
                  : !canScanQR
                    ? `Available at ${event.start_time}`
                    : "📱 Scan QR for Attendance"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => setShowRegistrationModal(true)}
            >
              <Text style={styles.registerButtonText}>Register for Event</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Registration Modal */}
      <EventRegistrationModal
        visible={showRegistrationModal}
        eventId={eventId || ""}
        eventTitle={event.title}
        userId={user?.id || ""}
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
  qrStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  qrStatusText: {
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
  scanButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
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
