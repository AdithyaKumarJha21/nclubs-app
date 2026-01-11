import { useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { UserContext } from "../context/UserContext";
import { getClubDetails } from "../services/clubDetails";
import { updateClubSection } from "../services/clubSections";

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

type ClubDetailsResult = {
  club: Club | null;
  sections: ClubSection[];
  gallery: string[];
};

type EditableSection = {
  id: string;
  title: string;
  content: string;
  order_index: number;
};
/** -------------------------- */

function asStringParam(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] : v;
}

export default function ClubDetails() {
  const params = useLocalSearchParams();
  const clubId = asStringParam((params as any).clubId ?? (params as any).id);

  const ctx = useContext(UserContext);

  const isFaculty = useMemo(() => {
    const role = (ctx as any)?.user?.role;
    const roleId = (ctx as any)?.user?.role_id;

    if (role === "faculty" || role === "admin" || role === "staff") return true;

    const STAFF_ROLE_UUID = "STAFF_ROLE_UUID";
    const ADMIN_ROLE_UUID = "ADMIN_ROLE_UUID";
    return roleId === STAFF_ROLE_UUID || roleId === ADMIN_ROLE_UUID;
  }, [ctx]);

  const [details, setDetails] = useState<ClubDetailsResult | null>(null);
  const [editing, setEditing] = useState<EditableSection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const loadDetails = async () => {
    if (!clubId) {
      setErrorMsg("Missing club ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await getClubDetails(clubId);
      if (!res || !res.club) {
        setDetails(null);
        setErrorMsg("Club not found.");
      } else {
        setDetails(res);
      }
    } catch (e: any) {
      console.error("getClubDetails error:", e);
      setErrorMsg(e?.message ?? "Failed to load club details.");
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetails();
  }, [clubId]);

  const startEdit = (section: ClubSection) => {
    setEditing({
      id: section.id,
      title: section.title ?? "",
      content: section.content ?? "",
      order_index: section.order_index ?? 0,
    });
  };

  const handleSave = async () => {
    if (!editing) return;

    try {
      await updateClubSection({
        id: editing.id,
        title: editing.title,
        content: editing.content,
        order_index: editing.order_index,
      });

      setEditing(null);
      await loadDetails();
      Alert.alert("Saved", "Section updated successfully.");
    } catch (e: any) {
      console.error("updateClubSection error:", e);
      Alert.alert(
        "Not authorized",
        "You are not authorized to edit this club (or update failed)."
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  if (!details?.club) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{errorMsg || "No data available."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>{details.club.name ?? "Unnamed Club"}</Text>
        {details.club.description ? (
          <Text style={styles.description}>{details.club.description}</Text>
        ) : null}

        {/* Sections */}
        <Text style={styles.sectionTitle}>Sections</Text>

        {details.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            {editing?.id === section.id ? (
              <>
                <TextInput
                  style={styles.input}
                  value={editing.title}
                  onChangeText={(text) =>
                    setEditing((prev) => (prev ? { ...prev, title: text } : prev))
                  }
                  placeholder="Title"
                />
                <TextInput
                  style={[styles.input, { minHeight: 80 }]}
                  value={editing.content}
                  onChangeText={(text) =>
                    setEditing((prev) => (prev ? { ...prev, content: text } : prev))
                  }
                  placeholder="Content"
                  multiline
                />

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setEditing(null)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sectionTitleText}>
                  {section.title ?? "Untitled"}
                </Text>
                <Text style={styles.sectionContent}>{section.content ?? ""}</Text>

                {isFaculty ? (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => startEdit(section)}
                  >
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        ))}

        {/* Gallery */}
        <Text style={styles.sectionTitle}>Gallery</Text>
        <FlatList
          data={details.gallery}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.image} />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ color: "#666", marginTop: 8 }}>No images yet.</Text>
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: { justifyContent: "center", alignItems: "center" },

  title: { fontSize: 24, fontWeight: "bold" },
  description: { fontSize: 16, marginVertical: 10, color: "#444" },

  sectionTitle: { fontSize: 20, fontWeight: "bold", marginTop: 20 },
  section: {
    marginVertical: 10,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
  },
  sectionTitleText: { fontSize: 18, fontWeight: "bold" },
  sectionContent: { marginTop: 6, color: "#333" },

  input: {
    borderWidth: 1,
    padding: 10,
    marginVertical: 6,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  saveButton: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: { color: "white", textAlign: "center", fontWeight: "700" },

  cancelButton: { marginTop: 10, alignSelf: "center" },
  cancelText: { color: "#666" },

  editButton: { marginTop: 10, alignSelf: "flex-start" },
  editText: { color: "#007bff", fontWeight: "600" },

  image: {
    width: 110,
    height: 110,
    margin: 6,
    borderRadius: 10,
    backgroundColor: "#eee",
  },

  errorText: { color: "red", marginBottom: 12, textAlign: "center" },
});
