import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import {
    isFacultyView,
    isStudentView,
} from "../utils/permissions";

// UI components
import AttendanceList from "../components/AttendanceList";
import AttendanceStudentList, {
    AttendanceStudent,
} from "../components/AttendanceStudentList";
import EventList, { EventListItem } from "../components/EventList";

type AttendanceProfile = {
  id: string;
  name: string | null;
  usn: string | null;
  email: string | null;
};

type AttendanceEvent = {
  id: string;
  title: string;
};

type AttendanceRow = {
  id: string;
  created_at: string | null;
  scanned_at?: string | null;
  event_id: string;
  club_id: string;
  student_id: string;
  events: AttendanceEvent | AttendanceEvent[] | null;
  profiles: AttendanceProfile | AttendanceProfile[] | null;
};

type StudentAttendanceEvent = {
  id: string;
  title: string;
  date: string;
  attended: boolean;
};

type EventScan = {
  event_id: string;
};

type MinimalProfile = {
  id: string;
  name: string | null;
  usn: string | null;
  email: string | null;
};

/**
 * ✅ ATTENDANCE HISTORY SCREEN
 * - For Faculty/President: Shows events first, then students who scanned for each event
 * - For Students: Shows their own attendance
 */
export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // State management for faculty/president view
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventListItem | null>(
    null
  );
  const [attendanceData, setAttendanceData] = useState<AttendanceStudent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // For student view
  const [studentEvents, setStudentEvents] = useState<StudentAttendanceEvent[]>([]);

  /* ===============================
     🔐 ROUTE PROTECTION
     =============================== */
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

  }, [user, loading, router]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("id, title, event_date")
        .order("event_date", { ascending: false });

      if (error) throw error;

      const formattedEvents: EventListItem[] = (data || []).map((event) => ({
        id: event.id,
        title: event.title,
        date: event.event_date,
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /* ===============================
     📦 FETCH STUDENT ATTENDANCE HISTORY
     =============================== */
  const fetchStudentAttendanceHistory = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch all events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, title, event_date")
        .order("event_date", { ascending: false });

      if (eventsError) throw eventsError;

      // Fetch attendance records for this student
      const { data: scanData, error: scanError } = await supabase
        .from("attendance")
        .select("event_id")
        .eq("student_id", user.id);

      if (scanError) throw scanError;

      // Get attended event IDs
      const attendedEventIds = new Set(
        ((scanData as EventScan[] | null) || []).map((scan) => scan.event_id)
      );

      // Map events with attendance status
      const eventsWithStatus = (eventsData || []).map((event) => ({
        id: event.id,
        title: event.title,
        date: event.event_date,
        attended: attendedEventIds.has(event.id),
      }));

      setStudentEvents(eventsWithStatus);
    } catch (error) {
      console.error("Error fetching student attendance history:", error);
      setStudentEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /* ===============================
     📦 FETCH EVENTS (FACULTY/PRESIDENT & STUDENTS)
     =============================== */
  useEffect(() => {
    if (user && isFacultyView(user)) {
      fetchEvents();
    } else if (user && isStudentView(user)) {
      fetchStudentAttendanceHistory();
    }
  }, [user, fetchStudentAttendanceHistory]);

  /* ===============================
     📦 FETCH ATTENDANCE FOR EVENT
     =============================== */
  const handleSelectEvent = async (event: EventListItem) => {
    setSelectedEvent(event);
    await fetchAttendanceForEvent(event.id);
  };

  const fetchAttendanceForEvent = async (eventId: string) => {
    try {
      setIsLoading(true);

      // Get attendance records for this event
      const { data, error } = await supabase
        .from("attendance")
        .select(
          `
          id,
          created_at,
          scanned_at,
          event_id,
          club_id,
          student_id,
          events (
            id,
            title
          ),
          profiles:student_id (
            id,
            name,
            email,
            usn
          )
        `
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const attendanceRows: AttendanceRow[] = (data as AttendanceRow[] | null) || [];

      const initialProfileMap = new Map<string, MinimalProfile>();
      for (const row of attendanceRows) {
        const joinedProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        if (joinedProfile?.id) {
          initialProfileMap.set(row.student_id, joinedProfile);
        }
      }

      const missingStudentIds = attendanceRows
        .map((row) => row.student_id)
        .filter((studentId) => !initialProfileMap.has(studentId));

      if (missingStudentIds.length > 0) {
        const uniqueMissingStudentIds = Array.from(new Set(missingStudentIds));
        const { data: fallbackProfiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, usn, email")
          .in("id", uniqueMissingStudentIds);

        if (profileError) {
          console.error("Error fetching fallback profiles:", {
            code: profileError.code,
            message: profileError.message,
          });
        } else {
          for (const profile of (fallbackProfiles as MinimalProfile[] | null) || []) {
            initialProfileMap.set(profile.id, profile);
          }
        }
      }

      const students: AttendanceStudent[] = attendanceRows.map((attendanceRow) => {
        const rowProfile = Array.isArray(attendanceRow.profiles)
          ? attendanceRow.profiles[0]
          : attendanceRow.profiles;
        const mergedProfile = rowProfile || initialProfileMap.get(attendanceRow.student_id) || null;
        const event = Array.isArray(attendanceRow.events)
          ? attendanceRow.events[0]
          : attendanceRow.events;

        return {
          id: attendanceRow.id,
          name: mergedProfile?.name ?? "Unknown student",
          email: mergedProfile?.email ?? undefined,
          usn: mergedProfile?.usn ?? "-",
          eventTitle: event?.title ?? selectedEvent?.title ?? "Untitled event",
          scan_time: attendanceRow.created_at ?? attendanceRow.scanned_at ?? undefined,
        };
      });

      const resolvedProfilesCount = students.filter(
        (student) => student.name !== "Unknown student"
      ).length;

      console.log("Attendance rows fetched:", attendanceRows.length);
      console.log("Attendance rows with resolved profiles.name:", resolvedProfilesCount);

      setAttendanceData(students);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
        const supabaseError = error as { code?: string; message?: string };
        console.error("Error fetching attendance:", {
          code: supabaseError.code,
          message: supabaseError.message,
        });
      } else {
        console.error("Error fetching attendance:", error);
      }
      setAttendanceData([]);
    } finally {
      setIsLoading(false);
    }
  };

  /* ===============================
     🔄 HANDLE BACK BUTTON
     =============================== */
  const handleBackToEvents = () => {
    setSelectedEvent(null);
    setAttendanceData([]);
  };

  if (loading || !user) {
    return null;
  }

  /* ===============================
     🧠 VIEW FLAGS
     =============================== */
  const studentView = isStudentView(user);
  const facultyView = isFacultyView(user);

  /* ===============================
     🎨 UI RENDERING
     =============================== */
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Attendance History</Text>

      {/* Student UI */}
      {studentView && (
        <AttendanceList events={studentEvents} isLoading={isLoading} />
      )}

      {/* Faculty / President UI - Event List */}
      {facultyView && !selectedEvent && (
        <EventList
          events={events}
          onSelectEvent={handleSelectEvent}
          isLoading={isLoading}
        />
      )}

      {/* Faculty / President UI - Attendance for Selected Event */}
      {facultyView && selectedEvent && (
        <AttendanceStudentList
          students={attendanceData}
          eventTitle={selectedEvent.title}
          isLoading={isLoading}
          onBack={handleBackToEvents}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
});
