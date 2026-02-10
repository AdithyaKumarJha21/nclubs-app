import { normalizeSupabaseError } from "./api/errors";
import { supabase } from "./supabase";

type RegistrationErrorCode = "23505" | "42501";

type RegistrationDbError = {
  code?: string;
  message?: string;
};

export type EventRegistration = {
  id: string;
  event_id: string;
  user_id: string;
  email: string;
  usn: string;
  registered_at: string;
};

const isDuplicateRegistrationError = (error: RegistrationDbError | null) => {
  if (!error) return false;

  if (error.code === "23505") return true;

  const normalizedMessage = error.message?.toLowerCase() ?? "";
  return (
    normalizedMessage.includes("duplicate key") ||
    normalizedMessage.includes("unique constraint") ||
    normalizedMessage.includes("already exists")
  );
};

const mapRegistrationErrorMessage = (error: RegistrationDbError): string => {
  const code = error.code as RegistrationErrorCode | undefined;

  if (code === "23505") {
    return "You are already registered";
  }

  if (code === "42501") {
    return "Not allowed (RLS)";
  }

  return normalizeSupabaseError(error);
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
  usn: string,
  email: string
): Promise<{ registration: EventRegistration | null; alreadyRegistered: boolean }> => {
  const trimmedEmail = email.trim();
  const normalizedUsn = usn.trim().toUpperCase();

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

  const payload = {
    event_id: eventId,
    user_id: user.id,
    email: trimmedEmail,
    usn: normalizedUsn,
  };

  const { error: upsertError } = await supabase
    .from("event_registrations")
    .upsert(payload, {
      onConflict: "event_id,user_id",
      ignoreDuplicates: true,
    })
    .select("id");

  if (upsertError) {
    if (isDuplicateRegistrationError(upsertError)) {
      const existing = await getMyRegistration(eventId);
      if (existing) {
        return { registration: existing, alreadyRegistered: true };
      }

      throw new Error("You are already registered");
    }

    throw new Error(mapRegistrationErrorMessage(upsertError));
  }

  const registration = await getMyRegistration(eventId);

  if (!registration) {
    throw new Error("Registration failed");
  }

  return { registration, alreadyRegistered: false };
};
