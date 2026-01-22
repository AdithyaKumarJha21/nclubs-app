import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { canAccessQRScreen } from "../utils/permissions";

export default function QRScannerScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

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

  if (loading || !user || !canAccessQRScreen(user)) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Scanner</Text>

      <View style={styles.mockScanner}>
        <Text style={styles.mockText}>[ Camera Preview Here ]</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          Alert.alert("Attendance Marked", "Mock attendance recorded")
        }
      >
        <Text style={styles.buttonText}>Simulate Scan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  mockScanner: {
    width: "100%",
    height: 250,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  mockText: { color: "#6b7280" },
  button: {
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "600" },
});
