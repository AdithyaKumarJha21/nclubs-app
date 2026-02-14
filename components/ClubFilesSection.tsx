import * as DocumentPicker from "expo-document-picker";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

type ClubFilesSectionProps = {
  clubId?: string | null;
  isManager?: boolean;
};

type ClubFileRow = {
  id: string;
  club_id: string;
  bucket: string;
  path: string;
  file_type?: string | null;
  title?: string | null;
  description?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

type PendingFile = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

const CLUB_FILES_BUCKET = "club_public";
const CLUB_FILES_TYPE = "document";
const MAX_CLUB_FILES = 4;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg"]);

const FILE_COLUMNS_TRIES = [
  "id, club_id, bucket, path, file_type, title, description, file_name, mime_type, file_size, created_at",
  "id, club_id, bucket, path, file_type, title, file_name, mime_type, file_size, created_at",
  "id, club_id, bucket, path, file_type, title, created_at",
  "id, club_id, bucket, path, title, created_at",
] as const;

const FILE_INSERT_TRIES = [
  ["uploader_id", "description", "file_name", "mime_type", "file_size", "file_type", "title"],
  ["uploaded_by", "description", "file_name", "mime_type", "file_size", "file_type", "title"],
  ["uploader_id", "file_name", "mime_type", "file_size", "file_type", "title"],
  ["uploaded_by", "file_name", "mime_type", "file_size", "file_type", "title"],
  ["file_type", "title"],
] as const;

const formatBytes = (bytes?: number | null) => {
  if (!bytes || Number.isNaN(bytes)) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Unknown date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString();
};

const getFileExtension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

const getFileKind = (file: ClubFileRow) => {
  const mime = (file.mime_type ?? "").toLowerCase();
  const extension = getFileExtension(file.file_name ?? file.path);

  if (mime === "application/pdf" || extension === "pdf") {
    return "pdf";
  }

  if (
    mime === "image/png" ||
    mime === "image/jpeg" ||
    extension === "png" ||
    extension === "jpg" ||
    extension === "jpeg"
  ) {
    return "image";
  }

  return "unknown";
};

const getPublicUrl = (bucket: string, path: string) =>
  supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

const buildInsertPayload = (
  keys: readonly string[],
  basePayload: Record<string, unknown>,
  userId?: string
) => {
  const payload: Record<string, unknown> = {
    club_id: basePayload.club_id,
    bucket: basePayload.bucket,
    path: basePayload.path,
  };

  for (const key of keys) {
    if (key === "uploader_id") {
      payload.uploader_id = userId ?? null;
      continue;
    }

    if (key === "uploaded_by") {
      payload.uploaded_by = userId ?? null;
      continue;
    }

    payload[key] = basePayload[key];
  }

  return payload;
};

const pickPendingFile = (asset: DocumentPicker.DocumentPickerAsset): PendingFile | null => {
  if (!asset.uri || !asset.name) return null;

  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: (asset.mimeType ?? "").toLowerCase(),
    size: asset.size ?? 0,
  };
};

export default function ClubFilesSection({ clubId, isManager = false }: ClubFilesSectionProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [files, setFiles] = useState<ClubFileRow[]>([]);
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!clubId) {
      setFiles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let data: ClubFileRow[] | null = null;
    let error: { code?: string; message: string } | null = null;

    for (const columns of FILE_COLUMNS_TRIES) {
      const response = await supabase
        .from("club_files")
        .select(columns)
        .eq("club_id", clubId)
        .order("created_at", { ascending: false });

      data = (response.data as unknown as ClubFileRow[] | null) ?? null;
      error = response.error;

      if (!error || error.code !== "42703") break;
    }

    if (error) {
      Alert.alert("Files error", error.message);
      setFiles([]);
      setIsLoading(false);
      return;
    }

    const visibleFiles = (data ?? []).filter(
      (file) => file.file_type !== "logo" && file.title !== "Club Logo"
    );

    setFiles(visibleFiles);
    setIsLoading(false);
  }, [clubId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (!clubId) return;

    const channel = supabase
      .channel(`club-files-${clubId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "club_files",
          filter: `club_id=eq.${clubId}`,
        },
        () => {
          loadFiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, loadFiles]);

  const fileCount = files.length;

  const fileUrls = useMemo(
    () =>
      files.reduce<Record<string, string>>((acc, file) => {
        acc[file.id] = getPublicUrl(file.bucket, file.path);
        return acc;
      }, {}),
    [files]
  );

  const validatePendingFile = (selected: PendingFile) => {
    const extension = getFileExtension(selected.name);

    if (
      !ALLOWED_MIME_TYPES.has(selected.mimeType) &&
      !ALLOWED_EXTENSIONS.has(extension)
    ) {
      Alert.alert("Invalid format", "Only PDF, PNG, and JPEG files are allowed.");
      return false;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      Alert.alert("File too large", "Each file must be 10MB or smaller.");
      return false;
    }

    return true;
  };

  const chooseFile = async () => {
    if (!clubId || !isManager) return;

    if (fileCount >= MAX_CLUB_FILES) {
      Alert.alert("File limit reached", `Only ${MAX_CLUB_FILES} files are allowed per club.`);
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/png", "image/jpeg"],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const selected = pickPendingFile(result.assets[0]);
    if (!selected || !validatePendingFile(selected)) return;

    setPendingFile(selected);
  };

  const uploadFile = async () => {
    if (!clubId || !isManager || !pendingFile) return;

    if (fileCount >= MAX_CLUB_FILES) {
      Alert.alert("File limit reached", `Only ${MAX_CLUB_FILES} files are allowed per club.`);
      return;
    }

    setIsUploading(true);

    try {
      const extension = getFileExtension(pendingFile.name) || "pdf";
      const filePath = `${clubId}/file_${Date.now()}_${Math.floor(Math.random() * 10000)}.${extension}`;

      const response = await fetch(pendingFile.uri);
      const buffer = await response.arrayBuffer();

      const contentType = pendingFile.mimeType ||
        (extension === "pdf"
          ? "application/pdf"
          : extension === "png"
          ? "image/png"
          : "image/jpeg");

      const { error: uploadError } = await supabase.storage
        .from(CLUB_FILES_BUCKET)
        .upload(filePath, buffer, {
          upsert: false,
          contentType,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const basePayload = {
        club_id: clubId,
        bucket: CLUB_FILES_BUCKET,
        path: filePath,
        file_type: CLUB_FILES_TYPE,
        title: pendingFile.name,
        description: null,
        file_name: pendingFile.name,
        mime_type: contentType,
        file_size: pendingFile.size,
      };

      let insertError: { code?: string; message: string } | null = null;

      for (const keys of FILE_INSERT_TRIES) {
        const payload = buildInsertPayload(keys, basePayload, user?.id);

        const result = await supabase.from("club_files").insert(payload);
        insertError = result.error;

        if (!insertError) {
          break;
        }

        const normalizedErrorMessage = insertError.message.toLowerCase();
        const isMissingColumnError =
          insertError.code === "42703" ||
          normalizedErrorMessage.includes("column") ||
          normalizedErrorMessage.includes("could not find");

        if (!isMissingColumnError) break;
      }

      if (insertError) {
        await supabase.storage.from(CLUB_FILES_BUCKET).remove([filePath]);
        throw new Error(insertError.message);
      }

      setPendingFile(null);
      await loadFiles();
      Alert.alert("Success", "File uploaded successfully.");
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error instanceof Error ? error.message : "Unable to upload file."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (file: ClubFileRow) => {
    if (!isManager) return;

    const { error: storageDeleteError } = await supabase.storage
      .from(file.bucket)
      .remove([file.path]);

    if (storageDeleteError) {
      Alert.alert("Delete failed", storageDeleteError.message);
      return;
    }

    const { error } = await supabase.from("club_files").delete().eq("id", file.id);

    if (error) {
      Alert.alert("Delete failed", error.message);
      return;
    }

    await loadFiles();
  };

  const openFile = async (file: ClubFileRow) => {
    const url = fileUrls[file.id];

    if (!url) {
      Alert.alert("Unavailable", "Unable to resolve file URL.");
      return;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Unavailable", "This file cannot be opened on this device.");
      return;
    }

    await Linking.openURL(url);
  };

  return (
    <View style={styles.card}>
      <Text style={[styles.heading, { color: theme.text }]}>Files</Text>

      {isManager ? (
        <>
          <Text style={[styles.helperText, { color: theme.text }]}>PDF/PNG/JPEG only • Max 10MB • Up to 4 files</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={chooseFile}>
              <Text style={styles.buttonText}>{pendingFile ? "Change file" : "Choose file"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.uploadButton]}
              onPress={uploadFile}
              disabled={!pendingFile || isUploading}
            >
              <Text style={styles.buttonText}>{isUploading ? "Uploading..." : "Upload"}</Text>
            </TouchableOpacity>
          </View>

          {pendingFile ? (
            <Text style={[styles.pendingText, { color: theme.text }]}>
              Pending: {pendingFile.name} ({formatBytes(pendingFile.size)})
            </Text>
          ) : null}
        </>
      ) : null}

      {isLoading ? null : files.length === 0 ? (
        <Text style={[styles.emptyState, { color: theme.text }]}>No files uploaded yet.</Text>
      ) : (
        <View style={styles.list}>
          {files.map((file) => {
            const fileKind = getFileKind(file);
            const iconName = fileKind === "pdf" ? "picture-as-pdf" : "image";
            const iconColor = fileKind === "pdf" ? "#dc2626" : "#2563eb";
            const fileLabel = file.file_name ?? file.title ?? file.path.split("/").pop() ?? "File";
            const fileUrl = fileUrls[file.id];

            return (
              <View key={file.id} style={styles.fileRow}>
                <View style={styles.fileInfo}>
                  <MaterialIcons name={iconName} size={24} color={iconColor} />
                  <View style={styles.fileMetaWrap}>
                    <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                      {fileLabel}
                    </Text>
                    <Text style={[styles.fileMeta, { color: theme.text }]}> 
                      {formatBytes(file.file_size)} • {formatDate(file.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.fileActions}>
                  {fileKind === "image" && fileUrl ? (
                    <Image source={{ uri: fileUrl }} style={styles.thumbnail} />
                  ) : null}

                  <TouchableOpacity style={styles.secondaryButton} onPress={() => openFile(file)}>
                    <Text style={styles.secondaryButtonText}>View</Text>
                  </TouchableOpacity>

                  {isManager ? (
                    <TouchableOpacity
                      style={[styles.secondaryButton, styles.deleteButton]}
                      onPress={() => deleteFile(file)}
                    >
                      <Text style={styles.secondaryButtonText}>Delete</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  uploadButton: {
    backgroundColor: "#16a34a",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  pendingText: {
    fontSize: 12,
    marginBottom: 12,
  },
  emptyState: {
    fontSize: 14,
    opacity: 0.8,
  },
  list: {
    gap: 12,
  },
  fileRow: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fileMetaWrap: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontWeight: "600",
  },
  fileMeta: {
    fontSize: 12,
    opacity: 0.75,
  },
  fileActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  secondaryButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteButton: {
    backgroundColor: "#dc2626",
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
});
