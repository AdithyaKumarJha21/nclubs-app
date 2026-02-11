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
  const [studentEvents, setStudentEvents] = useState<any[]>([]);

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
        (scanData || []).map((scan: any) => scan.event_id)
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
          scanned_at,
          profiles:student_id (
            id,
            name,
            email,
            usn
          )
        `
        )
        .eq("event_id", eventId)
        .order("scanned_at", { ascending: true });

      if (error) throw error;

      const students: AttendanceStudent[] = (data || []).map((scan: any) => ({
        id: scan.profiles?.id || scan.id,
        name: scan.profiles?.name || "Unknown",
        email: scan.profiles?.email,
        usn: scan.profiles?.usn,
        scan_time: scan.scanned_at,
      }));

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
