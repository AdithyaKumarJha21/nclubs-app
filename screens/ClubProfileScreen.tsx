import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

const CLUB_SELECT_TRIES = ["name, logo_url", "name"] as const;
const CLUB_LOGO_BUCKET_CANDIDATES = ["club-logos", "club_logos"] as const;

// ✅ keep these from codex branch (used in club_files + matching existing logo)
const CLUB_LOGO_FILE_TYPE = "logo";
const CLUB_LOGO_TITLE = "Club Logo";

const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const ALLOWED_LOGO_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

type ClubRowPartial = {
  name?: string | null;
  logo_url?: string | null;
};

type ClubFileRow = {
  id: string;
  club_id: string;
  bucket: string;
  path: string;
  file_type?: string | null;
  title?: string | null;
  created_at?: string | null;
  uploader_id?: string | null; // ✅ matches policy column name assumption
};

const isBucketNotFoundError = (
  error: { message?: string; statusCode?: string | number } | null
) => {
  if (!error) return false;

  const normalizedMessage = error.message?.toLowerCase() ?? "";
  return (
    normalizedMessage.includes("bucket not found") ||
    error.statusCode === 404 ||
    error.statusCode === "404"
  );
};

export default function ClubProfileScreen() {
  const { theme } = useTheme();
  const { user, loading } = useAuth();
  const { clubId } = useLocalSearchParams<{ clubId?: string | string[] }>();

  const normalizedClubId =
    typeof clubId === "string"
      ? clubId
      : Array.isArray(clubId)
      ? clubId[0]
      : null;

  const { isEditing, startEdit, cancelEdit } = useEditMode();

  const [isManager, setIsManager] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const [isLoadingClub, setIsLoadingClub] = useState(true);

  const [clubName, setClubName] = useState("");
  const [clubLogoUrl, setClubLogoUrl] = useState("");
  const [pendingLogoAsset, setPendingLogoAsset] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [removeLogoOnSave, setRemoveLogoOnSave] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [existingLogoFile, setExistingLogoFile] =
    useState<ClubFileRow | null>(null);

  const [about, setAbout] = useState("");
  const [whatToExpect, setWhatToExpect] = useState("");
  const [achievements, setAchievements] = useState("");

  const loadClub = useCallback(async () => {
    if (!normalizedClubId) return;

    setIsLoadingClub(true);

    const { data: sectionData, error: sectionError } = await supabase
      .from("club_sections")
      .select("*")
      .eq("club_id", normalizedClubId)
      .order("order_index");

    let clubData: ClubRowPartial | null = null;
    let clubError: { code?: string; message: string } | null = null;

    for (const columns of CLUB_SELECT_TRIES) {
      const response = await supabase
        .from("clubs")
        .select(columns)
        .eq("id", normalizedClubId)
        .maybeSingle();

      clubData = (response.data as ClubRowPartial) ?? null;
      clubError = response.error;

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

    const { data: clubFileRows } = await supabase
      .from("club_files")
      .select("id, club_id, bucket, path, file_type, title, created_at")
      .eq("club_id", normalizedClubId)
      .order("created_at", { ascending: false });

    const matchedLogoFile = ((clubFileRows as ClubFileRow[] | null) ?? []).find(
      (file) =>
        file.file_type === CLUB_LOGO_FILE_TYPE || file.title === CLUB_LOGO_TITLE
    );

    const derivedLogoUrl = matchedLogoFile
      ? supabase.storage
          .from(matchedLogoFile.bucket)
          .getPublicUrl(matchedLogoFile.path).data.publicUrl
      : "";

    setClubName(clubData?.name ?? "");
    setClubLogoUrl(clubData?.logo_url ?? derivedLogoUrl);
    setExistingLogoFile(matchedLogoFile ?? null);

    setAbout(sectionData?.find((s) => s.title === "About Us")?.content ?? "");
    setWhatToExpect(
      sectionData?.find((s) => s.title === "What to Expect")?.content ?? ""
    );
    setAchievements(
      sectionData?.find((s) => s.title === "Achievements")?.content ?? ""
    );

    setIsLoadingClub(false);
  }, [normalizedClubId]);

  useEffect(() => {
    loadClub();
  }, [loadClub]);

  useEffect(() => {
    if (!normalizedClubId) return;

    const channel = supabase
      .channel(`club-profile-${normalizedClubId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clubs",
          filter: `id=eq.${normalizedClubId}`,
        },
        () => {
          loadClub();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "club_sections",
          filter: `club_id=eq.${normalizedClubId}`,
        },
        () => {
          loadClub();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "club_files",
          filter: `club_id=eq.${normalizedClubId}`,
        },
        () => {
          loadClub();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadClub, normalizedClubId]);

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

  const displayedLogoUrl = removeLogoOnSave
    ? ""
    : pendingLogoAsset?.uri ?? clubLogoUrl;

  const validateLogoAsset = (asset: DocumentPicker.DocumentPickerAsset) => {
    const mimeType = (asset.mimeType ?? "").toLowerCase();
    const extension = asset.name?.split(".").pop()?.toLowerCase() ?? "";

    if (
      !ALLOWED_LOGO_MIME_TYPES.has(mimeType) &&
      !ALLOWED_LOGO_EXTENSIONS.has(extension)
    ) {
      Alert.alert(
        "Invalid format",
        "Please choose a JPEG or PNG image (.jpg, .jpeg, .png)."
      );
      return false;
    }

    if ((asset.size ?? 0) > MAX_LOGO_FILE_SIZE_BYTES) {
      Alert.alert("File too large", "Club logo must be 2MB or smaller.");
      return false;
    }

    return true;
  };

  const handleChooseLogo = async () => {
    if (!isEditing || !isManager) return;

    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;

    const pickedAsset = result.assets[0];
    if (!pickedAsset || !validateLogoAsset(pickedAsset)) return;

    setPendingLogoAsset(pickedAsset);
    setRemoveLogoOnSave(false);
  };

  const handleRemoveLogo = () => {
    if (!isEditing || !isManager) return;
    setPendingLogoAsset(null);
    setRemoveLogoOnSave(true);
  };

  const uploadPendingLogoIfAny = async (): Promise<
    | {
        bucket: string;
        path: string;
        publicUrl: string;
      }
    | null
  > => {
    if (!pendingLogoAsset || !normalizedClubId) return null;

    setIsUploadingLogo(true);

    // ✅ IMPORTANT: path is <club_id>/<filename> to satisfy your storage policies
    const fileExt =
      pendingLogoAsset.name?.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${normalizedClubId}-${Date.now()}.${fileExt}`;
    const filePath = `${normalizedClubId}/${fileName}`;

    try {
      const fileResponse = await fetch(pendingLogoAsset.uri);
      const fileBuffer = await fileResponse.arrayBuffer();

      const bucketCandidates = [
        ...new Set(
          [existingLogoFile?.bucket, ...CLUB_LOGO_BUCKET_CANDIDATES].filter(
            Boolean
          ) as string[]
        ),
      ];

      let lastUploadError:
        | { message?: string; statusCode?: string | number }
        | null = null;

      for (const bucketName of bucketCandidates) {
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            upsert: true,
            contentType: pendingLogoAsset.mimeType ?? "image/jpeg",
          });

        if (!uploadError) {
          const { data: publicData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          return {
            bucket: bucketName,
            path: filePath,
            publicUrl: publicData.publicUrl,
          };
        }

        lastUploadError = uploadError;

        // if bucket missing, try next bucket; else stop
        if (!isBucketNotFoundError(uploadError)) break;
      }

      Alert.alert(
        "Logo upload failed",
        lastUploadError?.message ?? "Unable to upload logo."
      );
      return null;
    } catch (error) {
      Alert.alert(
        "Logo upload failed",
        error instanceof Error ? error.message : "Unexpected upload error."
      );
      return null;
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!isManager || !normalizedClubId) {
      Alert.alert("Not authorized", "Not authorized to edit this club.");
      return;
    }

    const uploadedLogo = pendingLogoAsset ? await uploadPendingLogoIfAny() : null;

    if (pendingLogoAsset && !uploadedLogo) {
      return;
    }

    const nextLogoUrl = removeLogoOnSave
      ? ""
      : uploadedLogo?.publicUrl ?? clubLogoUrl;

    const updatePayloadTries = [
      { name: clubName, logo_url: nextLogoUrl || null },
      { name: clubName },
    ] as const;

    let clubError: { code?: string; message: string } | null = null;

    for (const payload of updatePayloadTries) {
      const response = await supabase
        .from("clubs")
        .update(payload)
        .eq("id", normalizedClubId);

      clubError = response.error;

      if (clubError?.code === "42703") continue;
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

    if (removeLogoOnSave && existingLogoFile) {
      await supabase.from("club_files").delete().eq("id", existingLogoFile.id);
      setExistingLogoFile(null);
    }

    if (uploadedLogo) {
      if (existingLogoFile) {
        await supabase.from("club_files").delete().eq("id", existingLogoFile.id);
      }

      const logoFileInsertPayloadTries = [
        {
          club_id: normalizedClubId,
          uploader_id: user?.id ?? null,
          bucket: uploadedLogo.bucket,
          path: uploadedLogo.path,
          file_type: CLUB_LOGO_FILE_TYPE,
          title: CLUB_LOGO_TITLE,
        },
        {
          club_id: normalizedClubId,
          uploaded_by: user?.id ?? null,
          bucket: uploadedLogo.bucket,
          path: uploadedLogo.path,
          file_type: CLUB_LOGO_FILE_TYPE,
          title: CLUB_LOGO_TITLE,
        },
        {
          club_id: normalizedClubId,
          bucket: uploadedLogo.bucket,
          path: uploadedLogo.path,
          file_type: CLUB_LOGO_FILE_TYPE,
          title: CLUB_LOGO_TITLE,
        },
      ] as const;

      let insertedLogoFile: ClubFileRow | null = null;
      let logoFileInsertError: { code?: string; message: string } | null = null;

      for (const payload of logoFileInsertPayloadTries) {
        const response = await supabase
          .from("club_files")
          .insert(payload)
          .select("id, club_id, bucket, path, file_type, title, created_at")
          .maybeSingle();

        insertedLogoFile = (response.data as ClubFileRow | null) ?? null;
        logoFileInsertError = response.error;

        if (!logoFileInsertError) break;

        const normalizedErrorMessage = logoFileInsertError.message.toLowerCase();
        const isMissingColumnError =
          logoFileInsertError.code === "42703" ||
          normalizedErrorMessage.includes("could not find") ||
          normalizedErrorMessage.includes("column");

        if (!isMissingColumnError) break;
      }

      if (logoFileInsertError) {
        Alert.alert("Error", logoFileInsertError.message);
        return;
      }

      setExistingLogoFile(insertedLogoFile);
    }

    const sectionPayloads = [
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
    ] as const;

    for (const section of sectionPayloads) {
      const { data: existingSection, error: sectionLookupError } = await supabase
        .from("club_sections")
        .select("id")
        .eq("club_id", normalizedClubId)
        .eq("title", section.title)
        .maybeSingle();

      if (sectionLookupError) {
        Alert.alert("Error", sectionLookupError.message);
        return;
      }

      if (existingSection?.id) {
        const { error: sectionUpdateError } = await supabase
          .from("club_sections")
          .update({ content: section.content, order_index: section.order_index })
          .eq("id", existingSection.id);

        if (sectionUpdateError) {
          Alert.alert("Error", sectionUpdateError.message);
          return;
        }

        continue;
      }

      const { error: sectionInsertError } = await supabase
        .from("club_sections")
        .insert(section);

      if (sectionInsertError) {
        Alert.alert("Error", sectionInsertError.message);
        return;
      }
    }

    setClubLogoUrl(nextLogoUrl || "");
    setPendingLogoAsset(null);
    setRemoveLogoOnSave(false);
    Alert.alert("Success", "Club updated successfully!");
    cancelEdit();
    loadClub();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.clubName, { color: theme.text }]}>Club Profile</Text>

      <View style={styles.logoDisplayWrap}>
        <ClubLogo logoUrl={displayedLogoUrl} clubName={clubName} size={120} />
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

      {isManager ? (
        <>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>
            Club Logo Uploader
          </Text>

          {isEditing ? (
            <View style={styles.logoActionsRow}>
              <TouchableOpacity style={styles.logoButton} onPress={handleChooseLogo}>
                <Text style={styles.logoButtonText}>
                  {displayedLogoUrl ? "Change Logo" : "Choose Image"}
                </Text>
              </TouchableOpacity>

              {displayedLogoUrl ? (
                <TouchableOpacity
                  style={[styles.logoButton, styles.logoRemoveButton]}
                  onPress={handleRemoveLogo}
                >
                  <Text style={styles.logoButtonText}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <Text style={[styles.logoConstraintText, { color: theme.text }]}>
            JPEG/PNG only, max size 2MB
          </Text>

          {isEditing ? (
            <View style={styles.logoPreviewWrap}>
              <Text style={[styles.logoPreviewLabel, { color: theme.text }]}>
                Live preview
              </Text>
              <ClubLogo
                logoUrl={displayedLogoUrl}
                clubName={clubName}
                size={88}
                showErrorMessage
              />
              {pendingLogoAsset ? (
                <Text style={[styles.logoFileName, { color: theme.text }]}>
                  {pendingLogoAsset.name}
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}

      {isManager &&
        (isEditing ? (
          <View style={{ flexDirection: "row", gap: 16, marginBottom: 20 }}>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isUploadingLogo}>
              <Text style={{ color: "green", fontWeight: "600" }}>
                {isUploadingLogo ? "Uploading..." : "Save"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setPendingLogoAsset(null);
                setRemoveLogoOnSave(false);
                cancelEdit();
              }}
            >
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
  logoActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  logoButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logoRemoveButton: {
    backgroundColor: "#dc2626",
  },
  logoButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  logoConstraintText: {
    fontSize: 12,
    marginBottom: 8,
    opacity: 0.75,
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
  logoFileName: {
    fontSize: 12,
    opacity: 0.8,
  },
  unauthorizedText: {
    marginBottom: 12,
    fontSize: 13,
  },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
});