import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { canGenerateQR } from "../utils/permissions";

export default function EventDetailsScreen() {
  const router = useRouter();
  const { title, date, venue, club } = useLocalSearchParams();

  const { user } = useAuth();

  // 🔐 STEP-7 (CLEANED): anyone except student is treated as assigned (temporary)
  const isAssigned = user?.role !== "student";

  const canQR = canGenerateQR(user, isAssigned);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <Text style={styles.detail}>Club: {club}</Text>
      <Text style={styles.detail}>Date: {date}</Text>
      <Text style={styles.detail}>Venue: {venue}</Text>

      <Text style={styles.description}>
        This event will include workshops, activities, and hands-on sessions.
      </Text>

      {canQR && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/qr-scanner")}
        >
          <Text style={styles.buttonText}>
            Generate / Scan QR for Attendance
          </Text>
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
    marginTop: 20,
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "600" },
});
