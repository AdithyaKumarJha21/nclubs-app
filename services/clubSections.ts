import { supabase } from "./supabase";

/**
 * Day 8 - D1
 * Fetch club sections for a given club (read-only for students, editable for authorized faculty via RLS)
 */
export async function fetchClubSections(clubId: string) {
  const { data, error } = await supabase
    .from("club_sections")
    .select("*")
    .eq("club_id", clubId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export type UpdateClubSectionInput = {
  id: string;
  title: string;
  content: string;
  order_index: number;
};

/**
 * Day 8 - D2
 * Update a section (Faculty only). No role checks in code.
 * RLS should block unauthorized users.
 */
export async function updateClubSection(input: UpdateClubSectionInput) {
  const { id, title, content, order_index } = input;

  const { data, error } = await supabase
    .from("club_sections")
    .update({ title, content, order_index })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // Day 8 - D3 Friendly error
    const msg = normalizeEditError(error);
    throw new Error(msg);
  }

  return data;
}

/**
 * Friendly mapping: do NOT expose DB errors directly
 */
function normalizeEditError(err: any) {
  const raw = (err?.message || "").toLowerCase();
  const code = err?.code;

  if (code === "42501" || raw.includes("permission") || raw.includes("not authorized")) {
    return "You are not authorized to edit this club.";
  }
  if (raw.includes("row level security") || raw.includes("rls")) {
    return "You are not authorized to edit this club.";
  }
  return "Could not update section. Please try again.";
}
