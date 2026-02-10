import AsyncStorage from "@react-native-async-storage/async-storage";
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

export type RegisterResult =
  | { ok: true; alreadyRegistered?: boolean }
  | { ok: false; message: string; code?: string };


const registrationCacheKey = (eventId: string, userId: string) =>
  `event_registration:${userId}:${eventId}`;

const resolveAuthUserId = async (): Promise<string | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
};

export const markEventRegisteredLocal = async (eventId: string): Promise<void> => {
  const userId = await resolveAuthUserId();
  if (!userId) return;

  await AsyncStorage.setItem(registrationCacheKey(eventId, userId), "1");
};

export const isEventRegisteredLocally = async (eventId: string): Promise<boolean> => {
  const userId = await resolveAuthUserId();
  if (!userId) return false;

  const value = await AsyncStorage.getItem(registrationCacheKey(eventId, userId));
  return value === "1";
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
    return "Not allowed";
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
    .maybeSingle();

  console.log("📍 Registration select result", {
    eventId,
    userId: user.id,
    data,
    error,
  });

  if (error) {
    console.error("❌ Registration lookup failed", { eventId, error });
    throw new Error(normalizeSupabaseError(error));
  }

  if (data) {
    await markEventRegisteredLocal(eventId);
  }

  return data ?? null;
};

export const registerForEvent = async (
  eventId: string,
  usn: string,
  email: string
): Promise<RegisterResult> => {
  const trimmedEmail = email.trim();
  const normalizedUsn = usn.trim().toUpperCase();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "Not allowed", code: "401" };
  }

  console.log("📝 Registering for event", {
    userId: user.id,
    eventId,
  });

  const payload = {
    event_id: eventId,
    user_id: user.id,
    email: trimmedEmail,
    usn: normalizedUsn,
  };

  const { error: insertError } = await supabase
    .from("event_registrations")
    .insert(payload)
    .select("id");

  if (insertError) {
    if (isDuplicateRegistrationError(insertError)) {
      await markEventRegisteredLocal(eventId);
      return { ok: true, alreadyRegistered: true };
    }

    if (insertError.code === "42501") {
      return { ok: false, message: "Not allowed", code: insertError.code };
    }

    return {
      ok: false,
      message: mapRegistrationErrorMessage(insertError),
      code: insertError.code,
    };
  }

  await markEventRegisteredLocal(eventId);
  return { ok: true };
};
