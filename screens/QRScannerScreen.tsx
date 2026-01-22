import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";
import { canAccessQRScreen } from "../utils/permissions";

export default function QRScannerScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { eventId, mode } = useLocalSearchParams<{ eventId?: string; mode?: string }>();
  const { isDark } = useTheme();

  const [recording, setRecording] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [canScanQR, setCanScanQR] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!canAccessQRScreen(user)) {
      // 🚫 Unauthorized users go to their home
      if (user.role === "student") {
        router.replace("/student-home");
      } else {
        router.replace("/faculty-home");
      }
    }
  }, [user, loading]);

  // Fetch event and check time
  useEffect(() => {
    if (eventId && mode === "student") {
      fetchEventAndCheckTime();
    }
  }, [eventId, mode]);

  const fetchEventAndCheckTime = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_time, end_time, event_date")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      setEvent(data);

      // Check if we're within event time
      checkEventTime(data);
    } catch (error) {
      console.error("Error fetching event:", error);
      Alert.alert("Error", "Failed to load event details");
    } finally {
      setEventLoading(false);
    }
  };

  const checkEventTime = (event: any) => {
    const now = new Date();
    const eventDate = new Date(event.event_date);
    const [startHour, startMin] = event.start_time.split(":").map(Number);
    const [endHour, endMin] = event.end_time.split(":").map(Number);

    const eventStart = new Date(eventDate);
    eventStart.setHours(startHour, startMin, 0);

    const eventEnd = new Date(eventDate);
    eventEnd.setHours(endHour, endMin, 0);

    const isWithinTime = now >= eventStart && now <= eventEnd;
    setCanScanQR(isWithinTime);

    if (!isWithinTime) {
      Alert.alert(
        "Not Available",
        `QR scanning is only available during event time:\n${event.start_time} - ${event.end_time}`
      );
    }
  };

  const handleSimulatedScan = async () => {
    if (!canScanQR) {
      Alert.alert(
        "Not Available",
        `QR scanning is only available during event time:\n${event?.start_time} - ${event?.end_time}`
      );
      return;
    }

    if (!user || !eventId) return;

    try {
      setRecording(true);

      // Get QR session
      const { data: qrSession, error: qrError } = await supabase
        .from("qr_sessions")
        .select("id, event_id, status")
        .eq("event_id", eventId)
        .eq("status", "active")
        .single();

      if (!qrSession) {
        Alert.alert("Error", "QR code not found or expired");
        return;
      }

      // Record attendance
      const { error: attendanceError } = await supabase
        .from("attendance")
        .insert({
          event_id: eventId,
          student_id: user.id,
          scanned_at: new Date().toISOString(),
        });

      if (attendanceError) {
        // Check if already scanned
        if (attendanceError.code === "23505") {
          Alert.alert(
            "Already Scanned",
            "You have already marked attendance for this event"
          );
          return;
        }
        throw attendanceError;
      }

      Alert.alert("✓ Success", "Attendance recorded successfully!");
      router.back();
    } catch (error) {
      console.error("Error recording attendance:", error);
      Alert.alert("Error", "Failed to record attendance");
    } finally {
      setRecording(false);
    }
  };

  if (loading || !user || !canAccessQRScreen(user)) {
    return null;
  }

  if (mode === "student" && eventLoading) {
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

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
      ]}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
        QR Scanner
      </Text>

      {mode === "student" && event && (
        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitle, { color: isDark ? "#fff" : "#000" }]}>
            {event.title}
          </Text>
          <Text
            style={[
              styles.timeInfo,
              {
                color: canScanQR ? "#4caf50" : "#f44336",
              },
            ]}
          >
            {canScanQR ? "✓ Scanning Active" : "✗ Not Available Now"}
          </Text>
          {!canScanQR && (
            <Text style={[styles.timeWarning, { color: isDark ? "#aaa" : "#666" }]}>
              Available: {event.start_time} - {event.end_time}
            </Text>
          )}
        </View>
      )}

      <View
        style={[
          styles.mockScanner,
          {
            borderColor: isDark ? "#444" : "#9ca3af",
            backgroundColor: isDark ? "#2a2a2a" : "#f9f9f9",
          },
        ]}
      >
        <Text
          style={[
            styles.mockText,
            { color: isDark ? "#aaa" : "#6b7280" },
          ]}
        >
          📱 Point to QR code
        </Text>
        <Text
          style={[
            styles.mockText,
            { color: isDark ? "#aaa" : "#6b7280", fontSize: 12, marginTop: 4 },
          ]}
        >
          (Camera would appear here)
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: canScanQR ? "#16a34a" : "#ccc",
            opacity: recording ? 0.6 : 1,
          },
        ]}
        onPress={handleSimulatedScan}
        disabled={recording || !canScanQR}
      >
        <Text style={styles.buttonText}>
          {recording ? "Recording..." : "Simulate Scan"}
        </Text>
      </TouchableOpacity>

      {!canScanQR && (
        <Text
          style={[
            styles.warningText,
            { color: isDark ? "#aaa" : "#666" },
          ]}
        >
          QR scanning is only available during the event time window
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: "center",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  eventInfo: {
    width: "100%",
    padding: 12,
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  timeInfo: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  timeWarning: {
    fontSize: 12,
  },
  mockScanner: {
    width: "100%",
    height: 250,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderRadius: 8,
  },
  mockText: {
    fontSize: 16,
    fontWeight: "500",
  },
  button: {
    padding: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  warningText: {
    marginTop: 16,
    fontSize: 12,
    textAlign: "center",
  },
});
