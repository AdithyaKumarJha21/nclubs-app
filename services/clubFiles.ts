import { supabase } from "./supabase";

/**
 * Buckets described in Day 9 task
 */
export const BUCKET_PUBLIC = "club_public";
export const BUCKET_PRIVATE = "club_private";

export type ClubFileRow = {
  id: string;
  club_id: string;
  uploaded_by: string;
  bucket: string;
  path: string;
  file_type: string;
  title: string | null;
  created_at: string;
};

export type UploadClubFileInput = {
  clubId: string;
  file: {
    uri: string;        // local uri
    name: string;       // filename
    mimeType: string;   // e.g. image/jpeg, application/pdf
  };
  title?: string;
};

/**
 * Decide bucket based on file type
 * Images => public, PDFs/docs => private
 */
export function pickBucket(mimeType: string) {
  const lower = (mimeType || "").toLowerCase();
  if (lower.startsWith("image/")) return BUCKET_PUBLIC;
  return BUCKET_PRIVATE;
}

/**
 * Convert local file URI into ArrayBuffer for Supabase upload in React Native
 */
async function uriToArrayBuffer(uri: string) {
  const res = await fetch(uri);
  return await res.arrayBuffer();
}

/**
 * Day 9 - D3
 * Upload file to Storage, then insert metadata into club_files
 */
export async function uploadClubFile(input: UploadClubFileInput): Promise<ClubFileRow> {
  const { clubId, file, title } = input;

  // Get auth user for uploaded_by
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("You must be logged in to upload files.");

  const bucket = pickBucket(file.mimeType);

  // Path format: {club_id}/{timestamp}_{filename}
  const safeName = file.name.replace(/\s+/g, "_");
  const filePath = `${clubId}/${Date.now()}_${safeName}`;

  // 1) Upload to storage
  const body = await uriToArrayBuffer(file.uri);

  const { error: uploadErr } = await supabase.storage.from(bucket).upload(filePath, body, {
    contentType: file.mimeType,
    upsert: false,
  });

  if (uploadErr) {
    throw new Error("Upload failed. Please try again.");
  }

  // 2) Insert metadata
  const { data: inserted, error: insertErr } = await supabase
    .from("club_files")
    .insert({
      club_id: clubId,
      uploaded_by: user.id,
      bucket,
      path: filePath,
      file_type: file.mimeType,
      title: title ?? null,
    })
    .select()
    .single();

  if (insertErr) {
    // optional: rollback uploaded file to avoid orphan storage objects
    await supabase.storage.from(bucket).remove([filePath]);
    throw new Error(normalizeFilesError(insertErr));
  }

  return inserted as ClubFileRow;
}

/**
 * Day 9 - CD1
 * List files for a club (gallery/docs list)
 */
export async function listClubFiles(clubId: string): Promise<ClubFileRow[]> {
  const { data, error } = await supabase
    .from("club_files")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listClubFiles error:", error);
    throw new Error(normalizeFilesError(error));
  }
  return (data ?? []) as ClubFileRow[];
}

/**
 * Build a URL for public files.
 * NOTE: Private bucket files should not be displayed using public URL.
 * For private docs, you should use signed URLs (later) OR show "locked" if access denied.
 */
export function getPublicFileUrl(bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function normalizeFilesError(err: any) {
  const raw = (err?.message || "").toLowerCase();
  const code = err?.code;

  if (code === "42501" || raw.includes("permission") || raw.includes("not authorized")) {
    return "You are not authorized to view or upload these files.";
  }
  if (raw.includes("row level security") || raw.includes("rls")) {
    return "You are not authorized to view or upload these files.";
  }
  return "Request failed. Please try again.";
}
