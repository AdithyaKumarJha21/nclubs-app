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

const isDuplicateRegistrationError = (
  error: { code?: string; message?: string } | null
) => {
  if (!error) return false;

  if (error.code === "23505") return true;

  const normalizedMessage = error.message?.toLowerCase() ?? "";
  return (
    normalizedMessage.includes("duplicate key") ||
    normalizedMessage.includes("unique constraint") ||
    normalizedMessage.includes("already exists")
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    .order("registered_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("❌ Registration lookup failed", { eventId, error });
    throw new Error(normalizeSupabaseError(error));
  }

  return data?.[0] ?? null;
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
    if (isDuplicateRegistrationError(error)) {
      // Race-safe: fetch existing; if not found, retry once after a short delay
      let existing = await getMyRegistration(eventId);
      if (existing) {
        return { registration: existing, alreadyRegistered: true };
      }

      console.warn(
        "⚠️ Duplicate detected; registration row not immediately visible. Retrying...",
        { eventId, userId: user.id }
      );

      await sleep(250);

      existing = await getMyRegistration(eventId);
      if (existing) {
        return { registration: existing, alreadyRegistered: true };
      }

      // Do NOT fabricate a row; that harms downstream workflow (missing id, etc.)
      throw new Error("Registration conflict detected. Please refresh and try again.");
    }

    throw new Error(normalizeSupabaseError(error));
  }

  return { registration: data, alreadyRegistered: false };
};

