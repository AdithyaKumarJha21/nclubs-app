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
  club_name?: string | null;
};

export type EventDetail = EventListItem & {
  club_id: string | null;
  created_by: string;
  qr_token: string | null;
  qr_updated_at: string | null;
  status: string;
};

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  created_by: string;
  qr_enabled: boolean;
  qr_token: string | null;
  qr_updated_at: string | null;
};

type SupabaseRequestError = Error & { code?: string };

export type ManagedEventRow = {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
  created_by: string;
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

const generateSecureQrToken = (): string => {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  // Fallback for environments without Web Crypto: timestamp + multiple Math.random segments.
  const fallbackSegments = Array.from({ length: 4 }, () =>
    Math.random().toString(36).slice(2)
  );
  return `${Date.now().toString(36)}${fallbackSegments.join("")}`;
};

const buildSupabaseError = (error: { code?: string; message?: string }): SupabaseRequestError => {
  const normalized = normalizeSupabaseError(error);
  const err = new Error(normalized) as SupabaseRequestError;
  err.code = error.code;
  return err;
};

const eventRowSelect =
  "id, title, description, location, event_date, start_time, end_time, created_by, qr_enabled, qr_token, qr_updated_at";

export const getEventsForStudent = async (options?: { includePast?: boolean }): Promise<EventListItem[]> => {
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("events")
    .select(
      "id, title, event_date, location, start_time, end_time, description, qr_enabled, clubs(name)"
    )
    .eq("status", "active");

  // Past events should be hidden across student-facing event lists.
  // Use strict `gt` so events ending exactly at `NOW()` are hidden too.
  if (!options?.includePast) {
    query = query.gt("end_time", nowIso);
  }

  const { data, error } = await query.order("event_date", { ascending: true });

  if (error) {
    throw new Error(normalizeSupabaseError(error));
  }

  return (data ?? []).map((event: any) => ({
    id: event.id,
    title: event.title,
    event_date: event.event_date,
    location: event.location,
    start_time: event.start_time,
    end_time: event.end_time,
    description: event.description,
    qr_enabled: event.qr_enabled,
    club_name: event.clubs?.name ?? null,
  })) as EventListItem[];
};


export const listEventsForClubIds = async (
  clubIds: string[],
  options?: { includePast?: boolean }
): Promise<ManagedEventRow[]> => {
  if (clubIds.length === 0) {
    return [];
  }

  const nowIso = new Date().toISOString();

  const selectColumns =
    "id, club_id, title, description, start_time, end_time, location, status, created_by";

  const query = clubIds.includes("*")
    ? supabase.from("events").select(selectColumns)
    : supabase.from("events").select(selectColumns).in("club_id", clubIds);

  let scopedQuery = query.eq("status", "active");

  if (!options?.includePast) {
    scopedQuery = scopedQuery.gt("end_time", nowIso);
  }

  const { data, error } = await scopedQuery.order("start_time", { ascending: true });

  if (error) {
    throw buildSupabaseError(error);
  }

  return (data ?? []) as ManagedEventRow[];
};

export const deleteManagedEvent = async (eventId: string, clubIds: string[]): Promise<void> => {
  if (!eventId) {
    throw new Error("Invalid event id.");
  }

  if (clubIds.length === 0) {
    throw new Error("Not authorized to delete this event.");
  }

  const { data, error } = await supabase
    .from("events")
    .update({ status: "deleted" })
    .eq("id", eventId)
    .in("club_id", clubIds)
    .neq("status", "deleted")
    .select("id")
    .maybeSingle();

  if (error) {
    throw buildSupabaseError(error);
  }

  if (!data?.id) {
    throw new Error("Event not found or you do not have permission to delete it.");
  }
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

export const generateEventQr = async (eventId: string): Promise<EventRow> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authorized.");
  }

  const qrToken = generateSecureQrToken();
  console.log("🔐 Generate QR", { eventId, userId: user.id, tokenLength: qrToken.length });

  const { data, error } = await supabase
    .from("events")
    .update({
      qr_enabled: true,
      qr_token: qrToken,
      qr_updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select(eventRowSelect)
    .single();

  if (error) {
    throw buildSupabaseError(error);
  }

  return data as EventRow;
};

export const enableEventAttendance = async (eventId: string): Promise<EventRow> => {
  return generateEventQr(eventId);
};

export const disableEventQr = async (eventId: string): Promise<EventRow> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authorized.");
  }

  console.log("🔐 Disable QR", { eventId, userId: user.id });

  const { data, error } = await supabase
    .from("events")
    .update({
      qr_enabled: false,
      qr_updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select(eventRowSelect)
    .single();

  if (error) {
    throw buildSupabaseError(error);
  }

  return data as EventRow;
};

export const disableEventAttendance = async (eventId: string): Promise<EventRow> => {
  return disableEventQr(eventId);
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
