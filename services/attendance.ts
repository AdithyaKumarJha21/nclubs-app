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

  const { error } = await supabase.from("attendance").insert({
    event_id: eventId,
    student_id: user.id,
    scanned_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      return { status: "already" };
    }

    if (error.code === "42501") {
      return { status: "forbidden" };
    }

    throw new Error(normalizeSupabaseError(error));
  }

  return { status: "success" };
};
