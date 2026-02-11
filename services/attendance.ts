import { normalizeSupabaseError } from "./api/errors";
import { supabase } from "./supabase";

export type AttendanceResult =
  | { status: "success" }
  | { status: "already" }
  | { status: "forbidden" };

export const markAttendance = async (eventId: string): Promise<AttendanceResult> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authorized.");
  }

  console.log("📸 Marking attendance", { eventId, userId: user.id });

  const payload = {
    event_id: eventId,
    student_id: user.id,
    scanned_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("attendance")
    .insert(payload);

  console.log("🧾 Attendance insert result", { payload, error });

  if (error) {
    const normalizedMessage = error.message?.toLowerCase() ?? "";

    if (
      error.code === "23505" ||
      normalizedMessage.includes("duplicate key") ||
      normalizedMessage.includes("unique constraint") ||
      normalizedMessage.includes("already exists")
    ) {
      return { status: "already" };
    }

    if (error.code === "42501") {
      return { status: "forbidden" };
    }

    throw new Error(normalizeSupabaseError(error));
  }

  return { status: "success" };
};

export const hasMarkedAttendance = async (eventId: string): Promise<boolean> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authorized.");
  }

  const { data, error } = await supabase
    .from("attendance")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(normalizeSupabaseError(error));
  }

  return !!data;
};
