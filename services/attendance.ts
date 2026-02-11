import { normalizeSupabaseError } from "./api/errors";
import { supabase } from "./supabase";

export type AttendanceSubmitResult =
  | { ok: true; already?: boolean }
  | { ok: false; message: string; code?: string };

export type AttendanceResult =
  | { status: "success" }
  | { status: "already" }
  | { status: "forbidden" };

export async function submitAttendance(eventId: string): Promise<AttendanceSubmitResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const message = "Not authorized.";
    console.error("❌ submitAttendance user resolution failed", { eventId, clubId: null });
    return { ok: false, message };
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, club_id")
    .eq("id", eventId)
    .single();

  if (eventError) {
    console.error("❌ submitAttendance event lookup failed", { eventId, clubId: null });
    return {
      ok: false,
      code: eventError.code,
      message: normalizeSupabaseError(eventError),
    };
  }

  if (!event.club_id) {
    return {
      ok: false,
      message: "Event is missing club assignment. Contact admin.",
    };
  }

  const clubId = event.club_id;

  console.log("📸 submitAttendance request", { eventId, clubId });

  const payload = {
    event_id: eventId,
    student_id: user.id,
    club_id: clubId,
  };

  const { error } = await supabase.from("attendance").insert(payload).select("event_id").maybeSingle();

  console.log("🧾 submitAttendance insert result", {
    eventId,
    clubId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, already: true };
    }

    if (error.code === "23503") {
      return {
        ok: false,
        code: "23503",
        message: "Event club mapping missing. Contact admin.",
      };
    }

    if (error.code === "42501") {
      return {
        ok: false,
        code: "42501",
        message: "Scan not allowed now. QR disabled or outside event time.",
      };
    }

    return {
      ok: false,
      code: error.code,
      message: normalizeSupabaseError(error),
    };
  }

  return { ok: true };
}

export const markAttendance = async (eventId: string): Promise<AttendanceResult> => {
  const result = await submitAttendance(eventId);

  if (result.ok && result.already) {
    return { status: "already" };
  }

  if (result.ok) {
    return { status: "success" };
  }

  if (!result.ok && "code" in result && result.code === "42501") {
    return { status: "forbidden" };
  }

  if (!result.ok) {
    const failedResult = result as Extract<AttendanceSubmitResult, { ok: false }>;
    throw new Error(failedResult.message);
  }

  throw new Error("Attendance submission failed.");
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
