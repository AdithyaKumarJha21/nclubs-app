import { supabase } from "./supabase";

/**
 * Insert attendance for a student for a given event.
 * @param eventId - UUID of the event
 * @returns { success: boolean; error?: string }
 */
export async function markAttendance(eventId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const studentId = userData.user.id;

  const { error } = await supabase.from("attendance").insert({
    event_id: eventId,
    student_id: studentId,
  });

  if (error) {
    // Unique constraint violation (duplicate scan)
    if (error.code === "23505" || error.message.includes("duplicate")) {
      return {
        success: false,
        error: "You already marked attendance for this event.",
      };
    }

    return { success: false, error: "Failed to mark attendance." };
  }

  return { success: true };
}

/**
 * Get all attendees for a given event.
 * @param eventId - UUID of the event
 * @returns List of attendees with name, usn, and scanned_at
 */
export async function getEventAttendance(eventId: string) {
  const { data, error } = await supabase
    .from("attendance")
    .select("scanned_at, student_id:student_id(*:profiles(name, usn))")
    .eq("event_id", eventId);

  if (error) {
    throw new Error("Failed to load attendance list.");
  }

  const attendees = data.map((row: any) => ({
    name: row.student_id?.name ?? "Unknown",
    usn: row.student_id?.usn ?? "N/A",
    scanned_at: row.scanned_at,
  }));

  return attendees;
}
