import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import {
  canDisableQR,
  canGenerateQR,
  canRegisterForEvent,
  canShowQRToStudent,
  Event,
} from "../utils/permissions";

export default function EventDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const params = useLocalSearchParams<{
    title?: string | string[];
    date?: string | string[];
    venue?: string | string[];
    club?: string | string[];
    start_time?: string | string[];
    end_time?: string | string[];
    qr_enabled?: string | string[];
    status?: string | string[];
  }>();

  // ✅ normalize params
  const normalize = (v?: string | string[]) =>
    typeof v === "string" ? v : Array.isArray(v) ? v[0] : "";

  const title = normalize(params.title);
  const date = normalize(params.date);
  const venue = normalize(params.venue);
  const club = normalize(params.club);
  const start_time = normalize(params.start_time);
  const end_time = normalize(params.end_time);
  const qr_enabled = normalize(params.qr_enabled);
  const status = normalize(params.status);

  /* ===============================
     EVENT OBJECT
     =============================== */
  const event: Event = {
    start_time,
    end_time,
    qr_enabled: qr_enabled === "true",
    status: status === "expired" ? "expired" : "active",
  };

  /* ===============================
     PERMISSIONS (PURE LOGIC)
     =============================== */
  const canRegister = canRegisterForEvent(user, event);
  const canShowStudentQR = canShowQRToStudent(user, event);
  const canGenerate = canGenerateQR(user, event);
  const canDisable = canDisableQR(user, event);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <Text style={styles.detail}>Club: {club}</Text>
      <Text style={styles.detail}>Date: {date}</Text>
      <Text style={styles.detail}>Venue: {venue}</Text>

      <Text style={styles.description}>
        This event will include workshops, activities, and hands-on sessions.
      </Text>

      {canRegister && (
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Register for Event</Text>
        </TouchableOpacity>
      )}

      {canShowStudentQR && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/qr-scanner")}
        >
          <Text style={styles.buttonText}>Scan QR for Attendance</Text>
        </TouchableOpacity>
      )}

      {canGenerate && (
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Generate QR</Text>
        </TouchableOpacity>
      )}

      {canDisable && (
        <TouchableOpacity style={[styles.button, styles.danger]}>
          <Text style={styles.buttonText}>Disable QR</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  detail: { fontSize: 14, marginBottom: 6 },
  description: { marginTop: 12, fontSize: 13, color: "#374151" },
  button: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  danger: {
    backgroundColor: "#dc2626",
  },
  buttonText: { color: "white", fontWeight: "600" },
});
