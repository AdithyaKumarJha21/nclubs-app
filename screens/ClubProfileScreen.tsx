import { useLocalSearchParams } from "expo-router";
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

const CLUB_SELECT_TRIES = [
  "name, description, logo_url",
  "name, description",
  "name, logo_url",
  "name",
] as const;

type ClubRowPartial = {
  name?: string | null;
  description?: string | null;
  logo_url?: string | null;
};

export default function ClubProfileScreen() {
  const { theme } = useTheme();
  const { user, loading } = useAuth();
  const { clubId } = useLocalSearchParams<{ clubId?: string | string[] }>();

  // ✅ normalize route param
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
  const [clubDescription, setClubDescription] = useState("");
  const [clubLogoUrl, setClubLogoUrl] = useState("");

  const [about, setAbout] = useState("");
  const [whatToExpect, setWhatToExpect] = useState("");
  const [achievements, setAchievements] = useState("");

  /* ===============================
     1️⃣ FETCH CLUB CONTENT
     =============================== */
  useEffect(() => {
    if (!normalizedClubId) return;

    const loadClub = async () => {
      setIsLoadingClub(true);

      const { data: sectionData, error: sectionError } = await supabase
        .from("club_sections")
        .select("*")
        .eq("club_id", normalizedClubId)
        .order("order_index");

      let clubData: ClubRowPartial | null = null;
      let clubError: { code?: string; message: string } | null = null;

      // Try progressively smaller selects to support schemas missing logo_url
      for (const columns of CLUB_SELECT_TRIES) {
        const response = await supabase
          .from("clubs")
          .select(columns)
          .eq("id", normalizedClubId)
          .maybeSingle();

        clubData = (response.data as ClubRowPartial) ?? null;
        clubError = response.error;

        // If not "column does not exist" -> stop trying
        if (!clubError || clubError.code !== "42703") break;
      }

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
      setClubDescription(clubData?.description ?? "");
      setClubLogoUrl(clubData?.logo_url ?? "");

      setAbout(sectionData?.find((s) => s.title === "About Us")?.content ?? "");
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

  /* ===============================
     2️⃣ PERMISSIONS
     =============================== */
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

  /* ===============================
     3️⃣ SAVE EDIT
     =============================== */
  const handleSaveEdit = async () => {
    if (!isManager || !normalizedClubId) {
      Alert.alert("Not authorized", "Not authorized to edit this club.");
      return;
    }

    // Try progressively smaller updates to support schemas missing logo_url
    const updatePayloadTries = [
      {
        name: clubName,
        description: clubDescription,
        logo_url: clubLogoUrl || null,
      },
      {
        name: clubName,
        description: clubDescription,
      },
      {
        name: clubName,
        logo_url: clubLogoUrl || null,
      },
      {
        name: clubName,
      },
    ] as const;

    let clubError: { code?: string; message: string } | null = null;

    for (const payload of updatePayloadTries) {
      const response = await supabase
        .from("clubs")
        .update(payload)
        .eq("id", normalizedClubId);

      clubError = response.error;

      // If missing column -> try smaller payload
      if (clubError?.code === "42703") continue;

      // success or other error -> stop
      break;
    }

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
        {
          club_id: normalizedClubId,
          title: "About Us",
          content: about,
          order_index: 1,
        },
        {
          club_id: normalizedClubId,
          title: "What to Expect",
          content: whatToExpect,
          order_index: 2,
        },
        {
          club_id: normalizedClubId,
          title: "Achievements",
          content: achievements,
          order_index: 3,
        },
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Text style={[styles.clubName, { color: theme.text }]}>Club Profile</Text>

      <View style={styles.logoDisplayWrap}>
        <ClubLogo logoUrl={clubLogoUrl} clubName={clubName} size={120} />
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
        <Text style={[styles.readOnlyValue, { color: theme.text }]}>
          {clubName}
        </Text>
      )}

      <Text style={[styles.fieldLabel, { color: theme.text }]}>Description</Text>
      <TextInput
        style={[
          styles.input,
          styles.multiInput,
          { color: theme.text, borderColor: "#9ca3af" },
        ]}
        value={clubDescription}
        editable={isEditing && isManager}
        onChangeText={setClubDescription}
        multiline
        placeholder="Club description"
        placeholderTextColor="#6b7280"
      />

      {!isStudent && (
        <>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Logo URL</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: "#9ca3af" }]}
            value={clubLogoUrl}
            editable={isEditing && isManager}
            onChangeText={setClubLogoUrl}
            autoCapitalize="none"
            placeholder="https://..."
            placeholderTextColor="#6b7280"
          />

          {isEditing && isManager ? (
            <View style={styles.logoPreviewWrap}>
              <Text style={[styles.logoPreviewLabel, { color: theme.text }]}>
                Live preview
              </Text>
              <ClubLogo
                logoUrl={clubLogoUrl}
                clubName={clubName}
                size={88}
                showErrorMessage
              />
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
        <Text style={[styles.unauthorizedText, { color: theme.text }]}>
          Not authorized to edit this club.
        </Text>
      )}

      <EditableTextSection
        title="About Us"
        value={about}
        isEditing={isEditing && isManager}
        onChange={setAbout}
      />
      <EditableTextSection
        title="What to Expect"
        value={whatToExpect}
        isEditing={isEditing && isManager}
        onChange={setWhatToExpect}
      />
      <EditableTextSection
        title="Achievements"
        value={achievements}
        isEditing={isEditing && isManager}
        onChange={setAchievements}
      />

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
  multiInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  logoPreviewWrap: {
    marginTop: -6,
    marginBottom: 18,
    alignItems: "center",
    gap: 8,
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

