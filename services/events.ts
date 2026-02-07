import { supabase } from "./supabase";
import { normalizeSupabaseError } from "./api/errors";
import { resolveFacultyClubId } from "./assignments";

export type CreateEventInput = {
  clubId?: string;
  title: string;
  description?: string;
  location?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
};

export type EventListItem = {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  start_time: string;
  end_time: string;
  description: string | null;
  qr_enabled: boolean;
};

export type EventDetail = EventListItem & {
  club_id: string | null;
  created_by: string;
  qr_token: string | null;
  qr_updated_at: string | null;
  status: string;
};

const isValidDateParts = (year: number, month: number, day: number): boolean => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const check = new Date(year, month - 1, day);
  return (
    check.getFullYear() === year &&
    check.getMonth() === month - 1 &&
    check.getDate() === day
  );
};

const parseTime = (value: string): { hour: number; minute: number } | null => {
  const parts = value.split(":").map((part) => Number(part));
  if (parts.length !== 2) {
    return null;
  }

  const [hour, minute] = parts;
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute };
};

const generateQrToken = (): string => {
  const segments = Array.from({ length: 5 }, () => Math.random().toString(36).slice(2));
  return segments.join("");
};

export const getEventsForStudent = async (): Promise<EventListItem[]> => {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, event_date, location, start_time, end_time, description, qr_enabled")
    .order("event_date", { ascending: true });

  if (error) {
    throw new Error(normalizeSupabaseError(error));
  }

  return (data ?? []) as EventListItem[];
};

export const getEventById = async (id: string): Promise<EventDetail> => {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, description, location, event_date, start_time, end_time, club_id, created_by, qr_enabled, qr_token, qr_updated_at, status"
    )
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(normalizeSupabaseError(error));
  }

  return data as EventDetail;
};

export const toggleEventQr = async (
  eventId: string,
  enabled: boolean
): Promise<EventDetail> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authorized.");
  }

  console.log("🔁 Toggling QR", { eventId, enabled, userId: user.id });

  const updates: {
    qr_enabled: boolean;
    qr_token?: string;
    qr_updated_at: string;
  } = {
    qr_enabled: enabled,
    qr_updated_at: new Date().toISOString(),
  };

  if (enabled) {
    updates.qr_token = generateQrToken();
  }

  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", eventId)
    .select(
      "id, title, description, location, event_date, start_time, end_time, club_id, created_by, qr_enabled, qr_token, qr_updated_at, status"
    )
    .single();

  if (error) {
    throw new Error(normalizeSupabaseError(error));
  }

  return data as EventDetail;
};

export const createEvent = async (input: CreateEventInput): Promise<void> => {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Title is required.");
  }

  const [year, month, day] = input.eventDate.split("-").map((part) => Number(part));
  if (!isValidDateParts(year, month, day)) {
    throw new Error("Invalid event date.");
  }

  const start = parseTime(input.startTime);
  const end = parseTime(input.endTime);

  if (!start || !end) {
    throw new Error("Invalid time format.");
  }

  const eventDate = new Date(year, month - 1, day, 0, 0, 0);
  const startDate = new Date(year, month - 1, day, start.hour, start.minute, 0);
  const endDate = new Date(year, month - 1, day, end.hour, end.minute, 0);

  if (endDate.getTime() <= startDate.getTime()) {
    throw new Error("End time must be after start time.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authorized.");
  }

  console.log("🔐 Auth user lookup", { userId: user.id });

  const resolvedClubId = await resolveFacultyClubId(user, input.clubId ?? null);
  console.log("🎯 Selected clubId for insert", { resolvedClubId });

  const payload = {
    club_id: resolvedClubId,
    title,
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    event_date: eventDate.toISOString(),
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    created_by: user.id,
    status: "active",
  };

  console.log("🧾 Final event insert payload", payload);

  const { data, error } = await supabase
    .from("events")
    .insert([payload])
    .select()
    .single();

  console.log("📌 Event insert response", { data, error });

  if (error) {
    if (error.code === "42501") {
      console.error("🚫 Not authorized for event insert", { payload });
      throw new Error("Not authorized. Please contact admin.");
    }
    throw new Error(normalizeSupabaseError(error));
  }
};

type InsertEventPayload = {
  title: string;
  description?: string;
  location?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
};

export const insertEventWithDebug = async (
  input: InsertEventPayload
): Promise<void> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("🔐 Auth user lookup", { user, userError });

  if (userError || !user) {
    throw new Error("Not authorized.");
  }

  const selectedClubId = await resolveFacultyClubId(user, null);
  console.log("🎯 Selected clubId for insert", { selectedClubId });

  const title = input.title.trim();
  if (!title) {
    throw new Error("Title is required.");
  }

  const [year, month, day] = input.eventDate.split("-").map((part) => Number(part));
  if (!isValidDateParts(year, month, day)) {
    throw new Error("Invalid event date.");
  }

  const start = parseTime(input.startTime);
  const end = parseTime(input.endTime);

  if (!start || !end) {
    throw new Error("Invalid time format.");
  }

  const eventDate = new Date(year, month - 1, day, 0, 0, 0);
  const startDate = new Date(year, month - 1, day, start.hour, start.minute, 0);
  const endDate = new Date(year, month - 1, day, end.hour, end.minute, 0);

  if (endDate.getTime() <= startDate.getTime()) {
    throw new Error("End time must be after start time.");
  }

  const payload = {
    club_id: selectedClubId,
    title,
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    event_date: eventDate.toISOString(),
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    created_by: user.id,
    status: "active",
  };

  console.log("🧾 Final event insert payload", payload);

  const { data, error } = await supabase
    .from("events")
    .insert([payload])
    .select()
    .single();

  console.log("📌 Event insert response", { data, error });

  if (error) {
    if (error.code === "42501") {
      console.error("🚫 Not authorized for event insert", { payload });
      throw new Error("Not authorized. Please contact admin.");
    }
    throw new Error(normalizeSupabaseError(error));
  }
};
