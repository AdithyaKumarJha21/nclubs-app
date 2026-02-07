import { normalizeSupabaseError } from "./api/errors";
import { supabase } from "./supabase";

export type EventRegistration = {
  id: string;
  event_id: string;
  user_id: string;
  email: string;
  usn: string;
  registered_at: string;
};

export const getPrefilledEmail = async (): Promise<string> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return "";
    }

    if (user.email) {
      return user.email;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("⚠️ Unable to load profile email", { error });
      return "";
    }

    return data?.email ?? "";
  } catch (error) {
    console.warn("⚠️ Unable to prefill email", { error });
    return "";
  }
};

export const getMyRegistration = async (
  eventId: string
): Promise<EventRegistration | null> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.warn("⚠️ Unable to resolve auth user for registration lookup", {
      userError,
    });
    return null;
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .select("id, event_id, user_id, email, usn, registered_at")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("❌ Registration lookup failed", { eventId, error });
    throw new Error(normalizeSupabaseError(error));
  }

  return data ?? null;
};

export const registerForEvent = async (
  eventId: string,
  email: string,
  usn: string
): Promise<{ status: "created" | "exists" }> => {
  const trimmedEmail = email.trim();
  const trimmedUsn = usn.trim();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authorized.");
  }

  console.log("📝 Registering for event", {
    userId: user.id,
    eventId,
  });

  const { data, error } = await supabase
    .from("event_registrations")
    .insert({
      event_id: eventId,
      user_id: user.id,
      email: trimmedEmail,
      usn: trimmedUsn,
    })
    .select("id, event_id, user_id, email, usn, registered_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { status: "exists" };
    }

    throw new Error(normalizeSupabaseError(error));
  }

  return { status: data ? "created" : "exists" };
};
