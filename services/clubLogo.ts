import { supabase } from "./supabase";

const CLUB_LOGO_BUCKET = "club-logos";

export const getClubLogoPublicUrl = (pathOrUrl?: string | null) => {
  const normalizedValue = (pathOrUrl ?? "").trim();

  if (!normalizedValue) return "";

  if (
    normalizedValue.startsWith("http://") ||
    normalizedValue.startsWith("https://")
  ) {
    return normalizedValue;
  }

  return supabase.storage
    .from(CLUB_LOGO_BUCKET)
    .getPublicUrl(normalizedValue).data.publicUrl;
};
