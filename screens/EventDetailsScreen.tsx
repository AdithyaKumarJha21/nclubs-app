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

  const {
    title,
    date,
    venue,
    club,
    start_time,
    end_time,
    qr_enabled,
    status,
  } = useLocalSearchParams();

  const { user } = useAuth();

  /* ===============================
     EVENT OBJECT (TEMP SOURCE)
     =============================== */
  const event: Event = {
    start_time: String(start_time),
    end_time: String(end_time),
    qr_enabled: qr_enabled === "true",
    status: status === "expired" ? "expired" : "active",
  };

  /* ===============================
     PERMISSION COMPUTATION (LOGIC ONLY)
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

      {/* STUDENT REGISTER */}
      {canRegister && (
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Register for Event</Text>
        </TouchableOpacity>
      )}

      {/* STUDENT QR (DURING EVENT) */}
      {canShowStudentQR && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/qr-scanner")}
        >
          <Text style={styles.buttonText}>Scan QR for Attendance</Text>
        </TouchableOpacity>
      )}

      {/* PRESIDENT / ADMIN QR CONTROLS */}
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
