import { supabase } from "./supabase";

export async function getProfile() {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, usn, email, role_id")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
