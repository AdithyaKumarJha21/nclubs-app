import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import {
  canViewAttendance,
  isFacultyView,
  isStudentView,
} from "../utils/permissions";

// UI components from Person B
import AttendanceList from "../components/AttendanceList";
import AttendanceTable from "../components/AttendanceTable";
import ExportButton from "../components/ExportButton";

/**
 * ✅ FINAL MERGED SCREEN
 * - Logic (roles, redirect): Person A
 * - UI rendering: Person B
 */
export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  /* ===============================
     🔐 ROUTE PROTECTION (A)
     =============================== */
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!canViewAttendance(user)) {
      // 🚫 Students redirected away
      router.replace("/student-home");
    }
  }, [user, loading]);

  if (loading || !user || !canViewAttendance(user)) {
    return null;
  }

  /* ===============================
     🧠 VIEW FLAGS (A)
     =============================== */
  const studentView = isStudentView(user);
  const facultyView = isFacultyView(user);

  /* ===============================
     📦 TEMP MOCK DATA
     (replace later with real data)
     =============================== */
  const studentEvents = [
    { id: "1", title: "Robotics Workshop", attended: true },
    { id: "2", title: "Hackathon", attended: false },
  ];

  const attendanceRows = [
    { id: "1", name: "Rahul", usn: "CS101", time: "10:05 AM" },
    { id: "2", name: "Anita", usn: "CS102", time: "10:08 AM" },
  ];

  /* ===============================
     🎨 UI (B)
     =============================== */
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Attendance History</Text>

      {/* Student UI */}
      {studentView && (
        <AttendanceList events={studentEvents} />
      )}

      {/* Faculty / President UI */}
      {facultyView && (
        <>
          <AttendanceTable rows={attendanceRows} />
          <ExportButton disabled={false} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
});
