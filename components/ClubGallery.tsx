import * as DocumentPicker from "expo-document-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

type ClubGalleryProps = {
  clubId?: string | null;
  isManager?: boolean;
};

type GalleryImageRow = {
  id: string;
  club_id: string;
  bucket: string;
  path: string;
  order_index: number;
  created_at?: string | null;
};

type PendingImage = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

const CLUB_GALLERY_BUCKET = "club-public";
const CLUB_GALLERY_FILE_TYPE = "gallery";
const MAX_GALLERY_IMAGES = 5;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

const toPublicUrl = (bucket: string, path: string) =>
  supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

const buildPendingImage = (
  asset: DocumentPicker.DocumentPickerAsset
): PendingImage | null => {
  if (!asset.uri || !asset.name) return null;

  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: (asset.mimeType ?? "").toLowerCase(),
    size: asset.size ?? 0,
  };
};

const isImageTypeAllowed = (image: PendingImage) => {
  const extension = image.name.split(".").pop()?.toLowerCase() ?? "";

  return (
    ALLOWED_IMAGE_MIME_TYPES.has(image.mimeType) ||
    ALLOWED_IMAGE_EXTENSIONS.has(extension)
  );
};

export default function ClubGallery({ clubId, isManager = false }: ClubGalleryProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [images, setImages] = useState<GalleryImageRow[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const loadImages = useCallback(async () => {
    if (!clubId) {
      setImages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("club_gallery_images")
      .select("id, club_id, bucket, path, order_index, created_at")
      .eq("club_id", clubId)
      .order("order_index", { ascending: true });

    if (error) {
      Alert.alert("Gallery error", error.message);
      setImages([]);
      setIsLoading(false);
      return;
    }

    setImages((data as GalleryImageRow[]) ?? []);
    setIsLoading(false);
  }, [clubId]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  useEffect(() => {
    if (!clubId) return;

    const channel = supabase
      .channel(`club-gallery-${clubId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "club_gallery_images",
          filter: `club_id=eq.${clubId}`,
        },
        () => {
          loadImages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, loadImages]);

  const remainingSlots = useMemo(
    () => MAX_GALLERY_IMAGES - images.length - pendingImages.length,
    [images.length, pendingImages.length]
  );

  const previewUrls = useMemo(
    () => images.map((image) => toPublicUrl(image.bucket, image.path)),
    [images]
  );

  const fullScreenUrl =
    fullscreenIndex !== null ? previewUrls[fullscreenIndex] ?? null : null;

  const chooseImages = async () => {
    if (!clubId || !isManager) return;

    if (remainingSlots <= 0) {
      Alert.alert(
        "Gallery limit reached",
        `Each club can have at most ${MAX_GALLERY_IMAGES} images.`
      );
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png"],
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const selected = result.assets
      .map(buildPendingImage)
      .filter((asset): asset is PendingImage => Boolean(asset));

    if (selected.length === 0) return;

    const currentRoom = MAX_GALLERY_IMAGES - images.length - pendingImages.length;
    const boundedSelection = selected.slice(0, Math.max(0, currentRoom));

    const invalidType = boundedSelection.find((asset) => !isImageTypeAllowed(asset));
    if (invalidType) {
      Alert.alert(
        "Invalid format",
        "Only JPEG and PNG images are allowed for the gallery."
      );
      return;
    }

    const oversized = boundedSelection.find((asset) => asset.size > MAX_IMAGE_SIZE_BYTES);
    if (oversized) {
      Alert.alert(
        "File too large",
        "Each gallery image must be 5MB or smaller."
      );
      return;
    }

    if (boundedSelection.length < selected.length) {
      Alert.alert(
        "Selection trimmed",
        `Only ${MAX_GALLERY_IMAGES} images are allowed per club. Extra files were ignored.`
      );
    }

    setPendingImages((prev) => [...prev, ...boundedSelection]);
  };

  const removePending = (index: number) => {
    setPendingImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const uploadPending = async () => {
    if (!clubId || !user?.id || pendingImages.length === 0 || !isManager) return;

    if (images.length + pendingImages.length > MAX_GALLERY_IMAGES) {
      Alert.alert(
        "Gallery limit reached",
        `Each club can have at most ${MAX_GALLERY_IMAGES} images.`
      );
      return;
    }

    setIsUploading(true);

    try {
      let nextOrder =
        images.length > 0
          ? Math.max(...images.map((image) => image.order_index)) + 1
          : 0;

      for (const image of pendingImages) {
        const extension = image.name.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
        const filePath = `${clubId}/gallery_${Date.now()}_${Math.floor(
          Math.random() * 10000
        )}.${extension}`;

        const fileResponse = await fetch(image.uri);
        const buffer = await fileResponse.arrayBuffer();

        const { error: storageError } = await supabase.storage
          .from(CLUB_GALLERY_BUCKET)
          .upload(filePath, buffer, {
            contentType: extension === "png" ? "image/png" : "image/jpeg",
            upsert: false,
          });

        if (storageError) {
          throw new Error(storageError.message);
        }

        const insertPayload = {
          club_id: clubId,
          bucket: CLUB_GALLERY_BUCKET,
          path: filePath,
          order_index: nextOrder,
          file_type: CLUB_GALLERY_FILE_TYPE,
          uploader_id: user.id,
        };

        const { error: insertError } = await supabase
          .from("club_gallery_images")
          .insert(insertPayload);

        if (insertError) {
          throw new Error(insertError.message);
        }

        nextOrder += 1;
      }

      setPendingImages([]);
      await loadImages();
      Alert.alert("Success", "Gallery images uploaded.");
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error instanceof Error ? error.message : "Unable to upload images."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!isManager) return;

    const image = images.find((item) => item.id === imageId);
    if (!image) return;

    const { error: storageDeleteError } = await supabase.storage
      .from(image.bucket)
      .remove([image.path]);

    if (storageDeleteError) {
      Alert.alert("Delete failed", storageDeleteError.message);
      return;
    }

    const { error } = await supabase
      .from("club_gallery_images")
      .delete()
      .eq("id", imageId);

    if (error) {
      Alert.alert("Delete failed", error.message);
      return;
    }

    await loadImages();
  };

  const swapOrder = async (sourceIndex: number, targetIndex: number) => {
    if (!isManager) return;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const source = images[sourceIndex];
    const target = images[targetIndex];

    if (!source || !target) return;

    const updates = [
      supabase
        .from("club_gallery_images")
        .update({ order_index: target.order_index })
        .eq("id", source.id),
      supabase
        .from("club_gallery_images")
        .update({ order_index: source.order_index })
        .eq("id", target.id),
    ];

    const [sourceUpdate, targetUpdate] = await Promise.all(updates);

    if (sourceUpdate.error || targetUpdate.error) {
      Alert.alert(
        "Reorder failed",
        sourceUpdate.error?.message ?? targetUpdate.error?.message ?? "Unknown error"
      );
      return;
    }

    await loadImages();
  };

  return (
    <View>
      {isManager ? (
        <View style={styles.managerCard}>
          <Text style={[styles.helperText, { color: theme.text }]}>JPEG/PNG only • Max 5MB each • Up to 5 images</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={chooseImages}>
              <Text style={styles.buttonText}>Add Images</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, styles.uploadButton]}
              disabled={pendingImages.length === 0 || isUploading}
              onPress={uploadPending}
            >
              <Text style={styles.buttonText}>
                {isUploading ? "Uploading..." : `Upload (${pendingImages.length})`}
              </Text>
            </TouchableOpacity>
          </View>

          {pendingImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {pendingImages.map((image, index) => (
                <View key={`${image.uri}-${index}`} style={styles.pendingCard}>
                  <Image source={{ uri: image.uri }} style={styles.image} />
                  <Text style={[styles.pendingName, { color: theme.text }]} numberOfLines={1}>
                    {image.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.removePendingButton}
                    onPress={() => removePending(index)}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      {isLoading ? null : images.length === 0 ? (
        <Text style={[styles.emptyState, { color: theme.text }]}>No gallery images yet</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {images.map((image, index) => (
            <View key={image.id} style={styles.imageWrapper}>
              <TouchableOpacity onPress={() => setFullscreenIndex(index)}>
                <Image source={{ uri: previewUrls[index] }} style={styles.image} />
              </TouchableOpacity>

              {isManager ? (
                <View style={styles.imageControls}>
                  <TouchableOpacity
                    style={[styles.controlButton, sourceIndexDisabled(index === 0)]}
                    onPress={() => swapOrder(index, index - 1)}
                    disabled={index === 0}
                  >
                    <Text style={styles.controlText}>←</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => deleteImage(image.id)}
                  >
                    <Text style={styles.controlText}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.controlButton, sourceIndexDisabled(index === images.length - 1)]}
                    onPress={() => swapOrder(index, index + 1)}
                    disabled={index === images.length - 1}
                  >
                    <Text style={styles.controlText}>→</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={Boolean(fullScreenUrl)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setFullscreenIndex(null)}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>

          {fullScreenUrl ? <Image source={{ uri: fullScreenUrl }} style={styles.fullscreenImage} /> : null}

          {fullscreenIndex !== null && previewUrls.length > 1 ? (
            <View style={styles.modalNavRow}>
              <TouchableOpacity
                style={styles.modalNavButton}
                disabled={fullscreenIndex <= 0}
                onPress={() => setFullscreenIndex((current) => (current === null ? current : Math.max(0, current - 1)))}
              >
                <Text style={styles.modalNavText}>Prev</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalNavButton}
                disabled={fullscreenIndex >= previewUrls.length - 1}
                onPress={() =>
                  setFullscreenIndex((current) =>
                    current === null ? current : Math.min(previewUrls.length - 1, current + 1)
                  )
                }
              >
                <Text style={styles.modalNavText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const sourceIndexDisabled = (disabled: boolean) => (disabled ? { opacity: 0.45 } : null);

const styles = StyleSheet.create({
  managerCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  helperText: {
    marginBottom: 8,
    fontSize: 12,
    opacity: 0.8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  uploadButton: {
    backgroundColor: "#16a34a",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  pendingCard: {
    marginRight: 10,
    width: 140,
  },
  pendingName: {
    marginTop: 4,
    fontSize: 11,
  },
  removePendingButton: {
    marginTop: 6,
    backgroundColor: "#dc2626",
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: "center",
  },
  removeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    opacity: 0.75,
    paddingVertical: 8,
    fontSize: 14,
  },
  imageWrapper: {
    marginRight: 12,
    width: 240,
  },
  image: {
    width: 240,
    height: 150,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  imageControls: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  controlButton: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: "center",
  },
  controlText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalClose: {
    position: "absolute",
    top: 60,
    right: 24,
    zIndex: 10,
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  fullscreenImage: {
    width: "100%",
    height: "70%",
    resizeMode: "contain",
  },
  modalNavRow: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  modalNavButton: {
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalNavText: {
    color: "#fff",
    fontWeight: "600",
  },
});
