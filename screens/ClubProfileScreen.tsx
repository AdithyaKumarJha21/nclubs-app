import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import ClubGallery from "../components/ClubGallery";
import EditableTextSection from "../components/EditableTextSection";
import UploadedFilesList from "../components/UploadedFilesList";
import UploadFileSection from "../components/UploadFileSection";

import { useAuth } from "../context/AuthContext";
import { useEditMode } from "../hooks/useEditMode";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

import { canEditClub } from "../utils/permissions";

export default function ClubProfileScreen() {
  const { theme } = useTheme();
  const { user, loading } = useAuth();
  const { clubId } = useLocalSearchParams<{ clubId?: string | string[] }>();

  // ✅ CRITICAL FIX — normalize route param
  const normalizedClubId =
    typeof clubId === "string"
      ? clubId
      : Array.isArray(clubId)
      ? clubId[0]
      : null;

  const { isEditing, startEdit, cancelEdit } = useEditMode();

  const [isAssigned, setIsAssigned] = useState(false);
  const [isLoadingClub, setIsLoadingClub] = useState(true);

  const [about, setAbout] = useState("");
  const [whatToExpect, setWhatToExpect] = useState("");
  const [achievements, setAchievements] = useState("");

  /* ===============================
     1️⃣ FETCH CLUB CONTENT
     =============================== */
  useEffect(() => {
    if (!normalizedClubId) return;

    const loadClub = async () => {
      const { data, error } = await supabase
        .from("club_sections")
        .select("*")
        .eq("club_id", normalizedClubId)
        .order("order_index");

      if (error) {
        Alert.alert("Error", error.message);
        setIsLoadingClub(false);
        return;
      }

      setAbout(
        data?.find((s) => s.title === "About Us")?.content ?? ""
      );
      setWhatToExpect(
        data?.find((s) => s.title === "What to Expect")?.content ?? ""
      );
      setAchievements(
        data?.find((s) => s.title === "Achievements")?.content ?? ""
      );

      setIsLoadingClub(false);
    };

    loadClub();
  }, [normalizedClubId]);

  /* ===============================
     2️⃣ CHECK FACULTY / PRESIDENT ASSIGNMENT
     =============================== */
  useEffect(() => {
    if (!user || !normalizedClubId) return;

    if (user.role === "admin") {
      setIsAssigned(true);
      return;
    }

    if (user.role !== "faculty" && user.role !== "president") {
      setIsAssigned(false);
      return;
    }

    const checkAssignment = async () => {
      const { data, error } = await supabase
        .from("faculty_assignments")
        .select("id")
        .eq("faculty_id", user.id)
        .eq("club_id", normalizedClubId)
        .limit(1);

      setIsAssigned(!error && (data?.length ?? 0) > 0);
    };

    checkAssignment();
  }, [user, normalizedClubId]);

  if (loading || isLoadingClub) return null;

  /* ===============================
     3️⃣ PERMISSIONS
     =============================== */
  const canEdit = canEditClub(user, isAssigned);

  /* ===============================
     4️⃣ SAVE CONTENT
     =============================== */
  const handleSaveEdit = async () => {
    if (!canEdit || !normalizedClubId) return;

    const { error } = await supabase.from("club_sections").upsert(
      [
        { club_id: normalizedClubId, title: "About Us", content: about, order_index: 1 },
        { club_id: normalizedClubId, title: "What to Expect", content: whatToExpect, order_index: 2 },
        { club_id: normalizedClubId, title: "Achievements", content: achievements, order_index: 3 },
      ],
      { onConflict: "club_id,title" }
    );

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    cancelEdit();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.clubName, { color: theme.text }]}>
        Club Profile
      </Text>

      {canEdit &&
        (isEditing ? (
          <View style={{ flexDirection: "row", gap: 16, marginBottom: 20 }}>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text style={{ color: "green", fontWeight: "600" }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelEdit}>
              <Text style={{ color: "red", fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={startEdit} style={{ marginBottom: 20 }}>
            <Text style={{ color: "blue", fontWeight: "600" }}>Edit</Text>
          </TouchableOpacity>
        ))}

      <EditableTextSection title="About Us" value={about} isEditing={isEditing && canEdit} onChange={setAbout} />
      <EditableTextSection title="What to Expect" value={whatToExpect} isEditing={isEditing && canEdit} onChange={setWhatToExpect} />
      <EditableTextSection title="Achievements" value={achievements} isEditing={isEditing && canEdit} onChange={setAchievements} />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Gallery</Text>
        <ClubGallery />
      </View>

      {canEdit && (
        <>
          <UploadedFilesList />
          <UploadFileSection />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  clubName: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
});
