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
): Promise<{ registration: EventRegistration | null; alreadyRegistered: boolean }> => {
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

  const existingRegistration = await getMyRegistration(eventId);
  if (existingRegistration) {
    return { registration: existingRegistration, alreadyRegistered: true };
  }

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
      const existing = await getMyRegistration(eventId);
      if (existing) {
        return { registration: existing, alreadyRegistered: true };
      }

      throw new Error(
        "Registration conflict detected. Please refresh and try again."
      );
    }

    throw new Error(normalizeSupabaseError(error));
  }

  return { registration: data, alreadyRegistered: false };
};
