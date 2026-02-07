import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { markAttendance } from "../services/attendance";
import { EventDetail, getEventById } from "../services/events";
import { useTheme } from "../theme/ThemeContext";
import { parseQrPayload } from "../utils/qr";
import { formatTimeLocal, getEventWindowStatus } from "../utils/timeWindow";

export default function QRScannerScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { eventId, id } = useLocalSearchParams<{ eventId?: string; id?: string }>();
  const resolvedEventId = eventId ?? id ?? "";
  const { isDark } = useTheme();

  const [permission, requestPermission] = useCameraPermissions();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "student") {
      router.replace(user.role === "president" ? "/president-home" : "/faculty-home");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!resolvedEventId) return;

    const loadEvent = async () => {
      try {
        const data = await getEventById(resolvedEventId);
        setEvent(data);
        console.log("📍 QR scan event loaded", {
          eventId: resolvedEventId,
          qrEnabled: data.qr_enabled,
          startTime: data.start_time,
          endTime: data.end_time,
        });
      } catch (error) {
        console.error("Error fetching event:", error);
        Alert.alert("Error", "Failed to load event details");
      } finally {
        setEventLoading(false);
      }
    };

    loadEvent();
  }, [resolvedEventId]);

  const scanStatus = useMemo(() => {
    if (!event) return { enabled: false, message: "" };

    if (!event.qr_enabled) {
      return { enabled: false, message: "QR not enabled yet." };
    }

    const status = getEventWindowStatus(event.start_time, event.end_time);
    if (status === "before") {
      return {
        enabled: false,
        message: `Scan opens at ${formatTimeLocal(event.start_time)}.`,
      };
    }
    if (status === "after") {
      return { enabled: false, message: "Event ended. Scan closed." };
    }
    if (status === "invalid") {
      return { enabled: false, message: "Scan window unavailable." };
    }

    return { enabled: true, message: "" };
  }, [event]);

  const handleScan = async (payload: string) => {
    if (!event || scanned) return;

    console.log("📷 QR scan payload", {
      eventId: resolvedEventId,
      rawLength: payload.length,
    });

    const parsed = parseQrPayload(payload);
    if (!parsed) {
      Alert.alert("Invalid QR", "QR code data is not recognized.");
      setScanned(false);
      return;
    }

    console.log("🧩 Parsed QR payload", {
      eventId: parsed.eventId,
      tokenLength: parsed.token?.length ?? 0,
    });

    if (parsed.eventId !== event.id) {
      Alert.alert("Invalid QR", "This QR code is for a different event.");
      setScanned(false);
      return;
    }

    if (!event.qr_token || parsed.token !== event.qr_token) {
      Alert.alert("Invalid QR", "QR token mismatch.");
      setScanned(false);
      return;
    }

    setScanned(true);
    try {
      const result = await markAttendance(event.id);

      if (result.status === "already") {
        Alert.alert("Attendance already marked", "You have already checked in.");
        setScanned(false);
        return;
      }

      if (result.status === "forbidden") {
        Alert.alert(
          "Scan not allowed",
          "Scan not allowed right now (outside event time or QR disabled)."
        );
        setScanned(false);
        return;
      }

      Alert.alert("✓ Success", "Attendance recorded successfully!");
      router.back();
    } catch (error) {
      console.error("Error recording attendance:", error);
      Alert.alert("Error", "Failed to record attendance");
      setScanned(false);
    }
  };

  if (loading || !user) {
    return null;
  }

  if (eventLoading) {
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
        <Text style={{ color: isDark ? "#aaa" : "#666" }}>Event not found.</Text>
      </View>
    );
  }

  if (!permission) {
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

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
        ]}
      >
        <Text style={[styles.permissionText, { color: isDark ? "#fff" : "#000" }]}>
          Camera access is required to scan QR codes.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
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

      <View style={styles.eventInfo}>
        <Text style={[styles.eventTitle, { color: isDark ? "#fff" : "#000" }]}>
          {event.title}
        </Text>
        <Text style={[styles.timeInfo, { color: scanStatus.enabled ? "#4caf50" : "#f44336" }]}>
          {scanStatus.enabled ? "✓ Scanning Active" : "✗ Not Available"}
        </Text>
        {!scanStatus.enabled && (
          <Text style={[styles.timeWarning, { color: isDark ? "#aaa" : "#666" }]}>
            {scanStatus.message}
          </Text>
        )}
      </View>

      <View style={styles.scannerContainer}>
        {scanStatus.enabled ? (
          <CameraView
            style={styles.camera}
            onBarcodeScanned={({ data }) => handleScan(data)}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
        ) : (
          <View
            style={[
              styles.disabledScanner,
              {
                backgroundColor: isDark ? "#2a2a2a" : "#f9f9f9",
                borderColor: isDark ? "#444" : "#9ca3af",
              },
            ]}
          >
            <Text style={[styles.disabledText, { color: isDark ? "#aaa" : "#666" }]}>
              QR scanning is disabled right now.
            </Text>
          </View>
        )}
      </View>

      {!scanStatus.enabled && (
        <Text style={[styles.warningText, { color: isDark ? "#aaa" : "#666" }]}>
          {scanStatus.message}
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
  permissionText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#0066cc",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
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
  scannerContainer: {
    width: "100%",
    height: 280,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  camera: {
    flex: 1,
  },
  disabledScanner: {
    flex: 1,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  disabledText: {
    fontSize: 14,
    textAlign: "center",
  },
  warningText: {
    marginTop: 4,
    fontSize: 12,
    textAlign: "center",
  },
});
