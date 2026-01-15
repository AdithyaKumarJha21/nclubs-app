import { useRouter } from "expo-router";
import { useEffect } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import {
  canViewAttendance,
  isFacultyView,
  isStudentView,
} from "../utils/permissions";

const mockAttendance = [
  { id: "1", event: "Robotics Workshop", date: "20 Oct 2026" },
  { id: "2", event: "Hackathon", date: "25 Oct 2026" },
];

export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!canViewAttendance(user)) {
      // 🚫 Students redirected to their dashboard
      router.replace("/student-home");
    }
  }, [user, loading]);

  if (loading || !user || !canViewAttendance(user)) {
    return null;
  }

  const studentView = isStudentView(user);
  const facultyView = isFacultyView(user);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Attendance History</Text>

      <FlatList
        data={mockAttendance}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.event}>{item.event}</Text>
            <Text style={styles.date}>{item.date}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: {
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  event: { fontWeight: "600" },
  date: { fontSize: 12, color: "#6b7280" },
});
