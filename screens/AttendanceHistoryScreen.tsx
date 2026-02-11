import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import {
  AttendanceHistoryRow,
  getAttendanceHistoryForClub,
} from "../services/attendanceHistory";
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

type StudentAttendanceEvent = {
  id: string;
  title: string;
  date: string;
  attended: boolean;
};

type EventScan = {
  event_id: string;
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
        .select("id, title, event_date, club_id")
        .order("event_date", { ascending: false });

      if (error) throw error;

      const formattedEvents: EventListItem[] = (data || []).map((event) => ({
        id: event.id,
        title: event.title,
        date: event.event_date,
        club_id: event.club_id,
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
    await fetchAttendanceForEvent(event.id, event.club_id);
  };

  const fetchAttendanceForEvent = async (eventId: string, clubId?: string) => {
    if (!clubId) {
      console.error("Missing club_id for selected event:", eventId);
      setAttendanceData([]);
      return;
    }

    try {
      setIsLoading(true);

      const attendanceRows = await getAttendanceHistoryForClub(clubId);
      const students: AttendanceStudent[] = attendanceRows
        .filter((attendanceRow: AttendanceHistoryRow) => attendanceRow.event_id === eventId)
        .map((attendanceRow: AttendanceHistoryRow) => {
        return {
          id: attendanceRow.attendance_id,
          name: attendanceRow.student_name ?? "Unknown student",
          usn: attendanceRow.student_usn ?? "-",
          eventTitle: attendanceRow.event_title ?? selectedEvent?.title ?? "Untitled event",
          scan_time: attendanceRow.scanned_at ?? undefined,
        };
      });

      const resolvedProfilesCount = students.filter(
        (student) => student.name !== "Unknown student"
      ).length;

      console.log("Attendance rows fetched:", students.length);
      console.log("Attendance rows with resolved profiles.name:", resolvedProfilesCount);

      setAttendanceData(students);
    } catch (error) {
      console.error("Error fetching attendance:", error);
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
