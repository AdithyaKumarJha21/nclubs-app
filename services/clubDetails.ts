import { supabase } from "./supabase";

export async function fetchClubs() {
  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getClubDetails(clubId: string) {
  // Fetch club row
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .maybeSingle();

  if (clubError) {
    throw new Error(`Failed to fetch club: ${clubError.message}`);
  }
  if (!club) {
    console.log("Club not found");
    return null;
  }

  // Fetch sections in a deterministic order (explicit ascending)
  const { data: sections, error: sectionsError } = await supabase
    .from("club_sections")
    .select("*")
    .eq("club_id", clubId)
    .order("order_index", { ascending: true });

  if (sectionsError) {
    throw new Error(`Failed to fetch club sections: ${sectionsError.message}`);
  }

  // List gallery images for this club (storage.list may return null/empty)
  const { data: images, error: imagesError } = await supabase.storage
    .from("club-gallery")
    .list(clubId);

  if (imagesError) {
    throw new Error(`Failed to list gallery images: ${imagesError.message}`);
  }

  const gallery =
    images?.map((img: any) => {
      const { data: urlData } = supabase.storage
        .from("club-gallery")
        .getPublicUrl(`${clubId}/${img.name}`);
      return urlData?.publicUrl ?? null;
    }).filter(Boolean) ?? [];

  return { club, sections: sections ?? [], gallery };
}
