import { supabase } from "./supabase";

export async function fetchClubs(search = "") {
  let query = supabase
    .from("clubs")
    .select("*")
    .order("name", { ascending: true });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  return await query;
}
