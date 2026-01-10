import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getClubDetails } from "../../services/clubDetails";
import {
  getPublicFileUrl,
  listClubFiles,
  uploadClubFile,
} from "../../services/clubFiles";
import { supabase } from "../../services/supabase";

/** ---------- Types (adjust if your services already export these) ---------- */
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

const DEMO_CLUB_ID = "123e4567-e89b-12d3-a456-426614174000"; // TODO: replace with real club id from DB

export default function FacultyDashboard() {
  const router = useRouter();

  const [clubDetails, setClubDetails] = useState<ClubDetailsResult | null>(null);
  const [files, setFiles] = useState<ClubFileRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deviceRegistered, setDeviceRegistered] = useState<boolean>(false);

  const [loadingClub, setLoadingClub] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

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

  const fetchClubDetails = async () => {
    setErrorMsg("");
    setLoadingClub(true);
    try {
      const details = await getClubDetails(DEMO_CLUB_ID);
      // getClubDetails might return null if club not found
      setClubDetails(details ?? null);

      if (!details?.club) {
        setErrorMsg("Club not found. Please insert a club row in Supabase and use its real ID.");
      }
    } catch (error) {
      console.error("Error fetching club details:", error);
      setErrorMsg("Failed to fetch club details.");
    } finally {
      setLoadingClub(false);
    }
  };

  const fetchFiles = async () => {
    setErrorMsg("");
    setLoadingFiles(true);
    try {
      const clubFiles = await listClubFiles(DEMO_CLUB_ID);
      setFiles(Array.isArray(clubFiles) ? clubFiles : []);
    } catch (error) {
      console.error("Error fetching files:", error);
      setErrorMsg("Failed to fetch files.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleUpload = async () => {
    setErrorMsg("");

    // New expo-document-picker API: { canceled: boolean, assets: [...] }
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri || !asset.name) {
      setErrorMsg("No file selected.");
      return;
    }

    setUploading(true);
    try {
      await uploadClubFile({
        clubId: DEMO_CLUB_ID,
        file: {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType ?? "application/octet-stream",
        },
      });

      await fetchFiles(); // refresh list
    } catch (error) {
      console.error("Upload failed:", error);
      setErrorMsg("Upload failed. Check RLS / bucket permissions.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Faculty Dashboard</Text>
      <Text style={styles.subtitle}>Manage your clubs and uploads here.</Text>

      <Text style={styles.deviceStatus}>
        Device Registered: {deviceRegistered ? "Yes ✅" : "No ❌"}
      </Text>

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      <View style={styles.actions}>
        <Button title="Fetch Club Details" onPress={fetchClubDetails} />
        {loadingClub ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
      </View>

      {clubDetails?.club ? (
        <View style={styles.details}>
          <Text style={styles.detailLine}>Club: {clubDetails.club.name ?? "Unnamed"}</Text>
          <Text style={styles.detailLine}>Sections: {clubDetails.sections?.length ?? 0}</Text>
          <Text style={styles.detailLine}>Gallery: {clubDetails.gallery?.length ?? 0} images</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button title={uploading ? "Uploading..." : "Upload File"} onPress={handleUpload} disabled={uploading} />
      </View>

      <View style={styles.actions}>
        <Button title="List Files" onPress={fetchFiles} />
        {loadingFiles ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
      </View>

      <FlatList
        style={styles.list}
        data={files}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No files yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.fileItem}>
            <Text style={styles.fileText} numberOfLines={1}>
              {item.title || item.path}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const url = getPublicFileUrl(item.bucket, item.path);
                console.log("Public URL:", url);
              }}
            >
              <Text style={styles.link}>View</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Button title="Go to Home" onPress={() => router.replace("/")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 14, marginVertical: 10, textAlign: "center", color: "#666" },
  deviceStatus: { fontSize: 14, color: "#666", marginBottom: 10, textAlign: "center" },
  error: { color: "red", textAlign: "center", marginBottom: 10 },

  actions: { marginVertical: 8 },
  details: { marginTop: 10, padding: 12, backgroundColor: "#f2f2f2", borderRadius: 8 },
  detailLine: { fontSize: 14, marginBottom: 4 },

  list: { marginTop: 10 },
  empty: { textAlign: "center", marginTop: 12, color: "#666" },

  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  fileText: { flex: 1, marginRight: 12 },
  link: { color: "#007bff", fontWeight: "600" },

  footer: { marginTop: 12 },
});
