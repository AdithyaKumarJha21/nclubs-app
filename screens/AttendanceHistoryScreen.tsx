import { View, Text, StyleSheet } from "react-native";
import AttendanceList from "../components/AttendanceList";
import AttendanceTable from "../components/AttendanceTable";
import ExportButton from "../components/ExportButton";

/**
 * ⚠️ UI ONLY COMPONENT
 * Logic + props are controlled by Person A
 */
export default function AttendanceHistoryScreen({
  isStudentView,
  isFacultyView,
  studentEvents,
  attendanceRows,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Attendance History</Text>

      {/* Student View */}
      {isStudentView && (
        <AttendanceList events={studentEvents} />
      )}

      {/* Faculty / President View */}
      {isFacultyView && (
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
