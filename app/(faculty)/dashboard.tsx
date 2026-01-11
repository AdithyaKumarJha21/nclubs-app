import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getClubDetails } from "../../services/clubDetails";
import { listClubFiles } from "../../services/clubFiles";
import { supabase } from "../../services/supabase";

/** ---------- Types ---------- */
type Club = {
  id: string;
  name?: string | null;
  description?: string | null;
  logo_url?: string | null;
};

type ClubSection = {
  id: string;
  club_id: string;
  title?: string | null;
  content?: string | null;
  order_index?: number | null;
};

export type ClubDetailsResult = {
  club: Club | null;
  sections: ClubSection[];
  gallery: string[];
};

export type ClubFileRow = {
  id: string;
  club_id: string;
  uploaded_by?: string | null;
  bucket: string;
  path: string;
  file_type?: string | null;
  title?: string | null;
  created_at?: string | null;
};
/** ----------------------------------------------------------------------- */

export default function StudentHome() {
  const router = useRouter();

  const [clubDetails, setClubDetails] = useState<ClubDetailsResult | null>(null);
  const [files, setFiles] = useState<ClubFileRow[]>([]);
  const [deviceRegistered, setDeviceRegistered] = useState<boolean>(false);

  useEffect(() => {
    void checkDeviceRegistration();
  }, []);

  async function getAuthedUserId(): Promise<string | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user?.id ?? null;
  }

  const checkDeviceRegistration = async () => {
    try {
      const userId = await getAuthedUserId();
      if (!userId) {
        setDeviceRegistered(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_devices")
        .select("id")
        .eq("user_id", userId)
        .eq("active", true);

      if (error) {
        console.error("Error checking device:", error);
        setDeviceRegistered(false);
        return;
      }

      setDeviceRegistered(Array.isArray(data) && data.length > 0);
    } catch (error) {
      console.error("Error checking device:", error);
      setDeviceRegistered(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>

      <Text style={styles.subtitle}>
        Welcome! Here’s what’s happening with your clubs.
      </Text>

      <Text style={styles.deviceStatus}>
        Device Registered: {deviceRegistered ? "Yes ✅" : "No ❌"}
      </Text>

      {clubDetails?.club ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{clubDetails.club.name}</Text>
          <Text style={styles.cardBody}>
            {clubDetails.club.description || "No description available."}
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No club data yet</Text>
          <Text style={styles.cardBody}>
            You may not be assigned to a club yet, or your club hasn’t added any
            content.
          </Text>
        </View>
      )}

      {files.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Files</Text>
          <Text style={styles.cardBody}>
            {files.length} file{files.length === 1 ? "" : "s"} available.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No files yet</Text>
          <Text style={styles.cardBody}>
            Your club hasn’t uploaded any files yet.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },

  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },

  subtitle: {
    fontSize: 14,
    marginVertical: 10,
    textAlign: "center",
    color: "#666",
  },

  deviceStatus: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
  },

  card: {
    marginTop: 12,
    padding: 14,
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
  },

  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },

  cardBody: { fontSize: 14, color: "#444", lineHeight: 20 },
});
