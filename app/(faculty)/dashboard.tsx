import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { supabase } from "../../services/supabase";

export default function FacultyDashboard() {
  const router = useRouter();
  const [clubDetails, setClubDetails] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deviceRegistered, setDeviceRegistered] = useState(false);

  useEffect(() => {
    checkDeviceRegistration();
  }, []);

  const checkDeviceRegistration = async () => {
    try {
      const { data } = await supabase.from("user_devices").select("*").eq("user_id", (await supabase.auth.getUser()).data.user?.id).eq("active", true);
      setDeviceRegistered(data && data.length > 0);
    } catch (error) {
      console.error("Error checking device:", error);
    }
  };

  // ... existing code ...

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Faculty Dashboard</Text>
      <Text style={styles.subtitle}>Manage your classes and students here.</Text>
      <Text style={styles.deviceStatus}>Device Registered: {deviceRegistered ? "Yes" : "No"}</Text>
      // ... existing code ...
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold" },
  subtitle: { fontSize: 16, marginVertical: 10 },
  deviceStatus: { fontSize: 14, color: "#666", marginBottom: 10 },
  details: { marginTop: 20, padding: 10, backgroundColor: "#f0f0f0", borderRadius: 5 },
  fileItem: { flexDirection: "row", justifyContent: "space-between", padding: 10, borderBottomWidth: 1, borderColor: "#ccc" },
  link: { color: "#007bff" },
});
