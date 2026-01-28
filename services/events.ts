import { supabase } from "./supabase";
import { normalizeSupabaseError } from "./api/errors";
import { getMyClubs, isValidUuid } from "./assignments";

export type CreateEventInput = {
  clubId: string;
  title: string;
  description?: string;
  location?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
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

export const createEvent = async (input: CreateEventInput): Promise<void> => {
  if (!isValidUuid(input.clubId)) {
    throw new Error("No club assigned. Contact admin.");
  }

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

  const payload = {
    club_id: input.clubId,
    title,
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    event_date: eventDate.toISOString(),
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    created_by: user.id,
    status: "active",
  };

  const { data, error } = await supabase.from("events").insert(payload).select("id");

  console.log("📌 Event insert response", { data, error });

  if (error) {
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

  const clubIds = await getMyClubs(user);
  console.log("🏷️ Faculty club assignments", { clubIds });

  const selectedClubId = clubIds[0] ?? null;
  console.log("🎯 Selected clubId for insert", { selectedClubId });

  if (!selectedClubId || !isValidUuid(selectedClubId)) {
    throw new Error("No club assigned. Contact admin.");
  }

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

  const { data, error } = await supabase.from("events").insert(payload).select("id");

  console.log("📌 Event insert response", { data, error });

  if (error) {
    throw new Error(normalizeSupabaseError(error));
  }
};
