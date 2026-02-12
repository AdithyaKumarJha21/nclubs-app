import { useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ClubGallery from "../components/ClubGallery";
import ClubLogo from "../components/ClubLogo";
import EditableTextSection from "../components/EditableTextSection";
import UploadedFilesList from "../components/UploadedFilesList";
import UploadFileSection from "../components/UploadFileSection";

import { useAuth } from "../context/AuthContext";
import { useEditMode } from "../hooks/useEditMode";
import { canManageClub } from "../services/permissions";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

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
  const isStudent = user?.role === "student";

  const [isManager, setIsManager] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const [isLoadingClub, setIsLoadingClub] = useState(true);

  const [clubName, setClubName] = useState("");
  const [clubLogoUrl, setClubLogoUrl] = useState("");
  const [selectedLogo, setSelectedLogo] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [about, setAbout] = useState("");
  const [whatToExpect, setWhatToExpect] = useState("");
  const [achievements, setAchievements] = useState("");

  /* ===============================
     1️⃣ FETCH CLUB CONTENT
     =============================== */
  useEffect(() => {
    if (!normalizedClubId) return;

    const loadClub = async () => {
      const [{ data: clubData, error: clubError }, { data: sectionData, error: sectionError }] = await Promise.all([
        supabase
          .from("clubs")
          .select("name, logo_url")
          .eq("id", normalizedClubId)
          .maybeSingle(),
        supabase
          .from("club_sections")
          .select("*")
          .eq("club_id", normalizedClubId)
          .order("order_index"),
      ]);

      if (clubError) {
        Alert.alert("Error", clubError.message);
        setIsLoadingClub(false);
        return;
      }

      if (sectionError) {
        Alert.alert("Error", sectionError.message);
        setIsLoadingClub(false);
        return;
      }

      setClubName(clubData?.name ?? "");
      setClubLogoUrl(clubData?.logo_url ?? "");

      setAbout(
        sectionData?.find((s) => s.title === "About Us")?.content ?? ""
      );
      setWhatToExpect(
        sectionData?.find((s) => s.title === "What to Expect")?.content ?? ""
      );
      setAchievements(
        sectionData?.find((s) => s.title === "Achievements")?.content ?? ""
      );

      setIsLoadingClub(false);
    };

    loadClub();
  }, [normalizedClubId]);

  useEffect(() => {
    if (!user || !normalizedClubId) {
      setIsCheckingPermission(false);
      setIsManager(false);
      return;
    }

    const loadPermission = async () => {
      setIsCheckingPermission(true);
      const canManage = await canManageClub(normalizedClubId);
      setIsManager(canManage);
      setIsCheckingPermission(false);
    };

    loadPermission();
  }, [user, normalizedClubId]);

  if (loading || isLoadingClub || isCheckingPermission) return null;

  const handleSaveEdit = async () => {
    if (!isManager || !normalizedClubId) {
      Alert.alert("Not authorized", "Not authorized to edit this club.");
      return;
    }

    const { error: clubError } = await supabase
      .from("clubs")
      .update({
        name: clubName,
        logo_url: clubLogoUrl || null,
      })
      .eq("id", normalizedClubId);

    if (clubError) {
      if (clubError.code === "42501") {
        Alert.alert("Not authorized", "Not authorized to edit this club.");
      } else {
        Alert.alert("Error", clubError.message);
      }
      return;
    }

    const { error: sectionError } = await supabase.from("club_sections").upsert(
      [
        { club_id: normalizedClubId, title: "About Us", content: about, order_index: 1 },
        { club_id: normalizedClubId, title: "What to Expect", content: whatToExpect, order_index: 2 },
        { club_id: normalizedClubId, title: "Achievements", content: achievements, order_index: 3 },
      ],
      { onConflict: "club_id,title" }
    );

    if (sectionError) {
      if (sectionError.code === "42501") {
        Alert.alert(
          "Saved with limitation",
          "Club details were saved, but section content could not be updated with your current permissions."
        );
        cancelEdit();
        return;
      }

      Alert.alert("Error", sectionError.message);
      return;
    }

    cancelEdit();
  };

  const handlePickLogo = async () => {
    if (!isManager || !isEditing) return;

    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/png", "image/jpeg"],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const mimeType = (asset.mimeType ?? "").toLowerCase();
    const isValidType = mimeType === "image/png" || mimeType === "image/jpeg";

    if (!isValidType) {
      Alert.alert("Invalid file type", "Please choose a PNG or JPEG image.");
      return;
    }

    if (asset.size && asset.size > 2 * 1024 * 1024) {
      Alert.alert("File too large", "Logo file size must be 2MB or less.");
      return;
    }

    setSelectedLogo(asset);
  };

  const handleUploadLogo = async () => {
    if (!normalizedClubId || !selectedLogo || !isManager || !isEditing) return;

    try {
      setIsUploadingLogo(true);

      const response = await fetch(selectedLogo.uri);
      const logoBlob = await response.blob();

      const extension = selectedLogo.mimeType === "image/png" ? "png" : "jpg";
      const uploadPath = `${normalizedClubId}/logo-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(uploadPath, logoBlob, {
          contentType: selectedLogo.mimeType ?? undefined,
          upsert: true,
        });

      if (uploadError) {
        Alert.alert("Upload failed", uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("club-logos").getPublicUrl(uploadPath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("clubs")
        .update({ logo_url: publicUrl })
        .eq("id", normalizedClubId);

      if (updateError) {
        Alert.alert("Upload failed", updateError.message);
        return;
      }

      setClubLogoUrl(publicUrl);
      setSelectedLogo(null);
      Alert.alert("Success", "Club logo uploaded successfully.");
    } catch {
      Alert.alert("Upload failed", "Unable to upload logo right now. Please try again.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!normalizedClubId || !isManager || !isEditing) return;

    const { error } = await supabase
      .from("clubs")
      .update({ logo_url: null })
      .eq("id", normalizedClubId);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setClubLogoUrl("");
    setSelectedLogo(null);
    Alert.alert("Success", "Club logo removed.");
  };

  const previewLogoUrl = selectedLogo?.uri ?? clubLogoUrl;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.clubName, { color: theme.text }]}> 
        Club Profile
      </Text>

      <View style={styles.logoDisplayWrap}>
        <ClubLogo logoUrl={previewLogoUrl} clubName={clubName} size={120} />
        <Text style={[styles.logoHint, { color: theme.text }]}>Club Logo</Text>
      </View>

      {isManager ? (
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: "#9ca3af" }]}
          value={clubName}
          editable={isEditing}
          onChangeText={setClubName}
          placeholder="Club name"
          placeholderTextColor="#6b7280"
        />
      ) : (
        <Text style={[styles.readOnlyValue, { color: theme.text }]}>{clubName}</Text>
      )}

      {!isStudent && (
        <>
          {isEditing && isManager ? (
            <View style={styles.logoPreviewWrap}>
              <Text style={[styles.logoPreviewLabel, { color: theme.text }]}>Live preview</Text>
              <ClubLogo logoUrl={previewLogoUrl} clubName={clubName} size={88} showErrorMessage />

              <TouchableOpacity
                style={styles.logoActionBtn}
                onPress={handlePickLogo}
                disabled={isUploadingLogo}
              >
                <Text style={styles.logoActionBtnText}>
                  {selectedLogo ? "Change selected logo" : "Upload logo"}
                </Text>
              </TouchableOpacity>

              {selectedLogo ? (
                <Text style={[styles.logoFileName, { color: theme.text }]}>{selectedLogo.name}</Text>
              ) : null}

              <View style={styles.logoActionsRow}>
                <TouchableOpacity
                  style={[styles.logoActionBtn, styles.logoUploadBtn]}
                  onPress={handleUploadLogo}
                  disabled={isUploadingLogo || !selectedLogo}
                >
                  <Text style={styles.logoActionBtnText}>
                    {isUploadingLogo ? "Uploading..." : "Save uploaded logo"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.logoActionBtn, styles.logoRemoveBtn]}
                  onPress={handleRemoveLogo}
                  disabled={isUploadingLogo}
                >
                  <Text style={styles.logoActionBtnText}>Remove logo</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.logoRules, { color: theme.text }]}>PNG/JPEG only • Max 2MB</Text>
            </View>
          ) : null}
        </>
      )}

      {isManager &&
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

      {!isManager && (
        <Text style={[styles.unauthorizedText, { color: theme.text }]}>Not authorized to edit this club.</Text>
      )}

      <EditableTextSection title="About Us" value={about} isEditing={isEditing && isManager} onChange={setAbout} />
      <EditableTextSection title="What to Expect" value={whatToExpect} isEditing={isEditing && isManager} onChange={setWhatToExpect} />
      <EditableTextSection title="Achievements" value={achievements} isEditing={isEditing && isManager} onChange={setAchievements} />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Gallery</Text>
        <ClubGallery />
      </View>

      {isManager && (
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
  fieldLabel: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  logoDisplayWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoHint: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.75,
  },
  readOnlyValue: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  logoPreviewWrap: {
    marginTop: -6,
    marginBottom: 18,
    alignItems: "center",
    gap: 8,
  },
  logoActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  logoActionBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logoUploadBtn: {
    backgroundColor: "#16a34a",
  },
  logoRemoveBtn: {
    backgroundColor: "#dc2626",
  },
  logoActionBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  logoFileName: {
    fontSize: 12,
  },
  logoRules: {
    fontSize: 12,
    opacity: 0.75,
  },
  logoPreviewLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  unauthorizedText: {
    marginBottom: 12,
    fontSize: 13,
  },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
});
