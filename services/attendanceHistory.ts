import { supabase } from "./supabase";

export type AttendanceHistoryRow = {
  attendance_id: string;
  event_id: string;
  event_title: string | null;
  student_id: string;
  student_name: string | null;
  student_usn: string | null;
  scanned_at: string | null;
};

export async function getAttendanceHistoryForClub(
  clubId: string
): Promise<AttendanceHistoryRow[]> {
  const { data, error } = await supabase.rpc("get_attendance_history_for_club", {
    p_club_id: clubId,
  });

  if (error) {
    console.error("Error fetching attendance history via RPC:", {
      clubId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data as AttendanceHistoryRow[] | null) || [];
}
