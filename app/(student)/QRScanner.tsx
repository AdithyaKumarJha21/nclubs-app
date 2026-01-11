import { useEffect, useState } from "react";
import { Text, View, Alert, StyleSheet } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import { markAttendance } from "../../services/attendance";

export default function QRScanner() {
  const [hasPermission, setHasPermission] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
      setHasPermission(status === "granted");
    });
  }, []);

  const handleScan = async ({ data }: { data: string }) => {
    try {
      setScanned(true);
      const decoded = JSON.parse(data);

      if (new Date(decoded.expires_at) < new Date()) {
        Alert.alert("Expired QR Code", "This code is no longer valid.");
        return;
      }

      await markAttendance(decoded.event_id);
      Alert.alert("Success", "Attendance marked!");
    } catch (e: any) {
      if (e.message?.includes("duplicate")) {
        Alert.alert("Already Scanned", "You already marked attendance.");
      } else {
        Alert.alert("Error", "Could not mark attendance.");
      }
    } finally {
      setTimeout(() => setScanned(false), 2000);
    }
  };

  if (!hasPermission) {
    return <Text>No camera permission.</Text>;
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleScan}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={styles.overlayText}>Scan Event QR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlayText: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    fontSize: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
  },
});
