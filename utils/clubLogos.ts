import { supabase } from "../services/supabase";

const CLUB_LOGO_BUCKET_CANDIDATES = [
  "club-logos",
  "club_logos",
  "CLUB-LOGOS",
  "CLUB_LOGOS",
] as const;

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const sanitize = (value?: string | null) => (value ?? "").trim();

export const resolvePublicClubLogoUrl = (
  logoValue?: string | null,
  explicitBucket?: string | null
): string => {
  const cleaned = sanitize(logoValue);
  if (!cleaned) return "";

  if (isAbsoluteUrl(cleaned)) {
    return cleaned;
  }

  const normalizedPath = cleaned.replace(/^\/+/, "");

  if (normalizedPath.includes("/")) {
    const [maybeBucket, ...rest] = normalizedPath.split("/");
    if (rest.length > 0) {
      const objectPath = rest.join("/");
      const { data } = supabase.storage.from(maybeBucket).getPublicUrl(objectPath);
      return data.publicUrl;
    }
  }

  const bucketCandidates = [
    ...new Set([explicitBucket, ...CLUB_LOGO_BUCKET_CANDIDATES].filter(Boolean) as string[]),
  ];

  for (const bucket of bucketCandidates) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(normalizedPath);
    if (data.publicUrl) return data.publicUrl;
  }

  return "";
};

export { CLUB_LOGO_BUCKET_CANDIDATES };
