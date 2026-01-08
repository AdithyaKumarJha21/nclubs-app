import { FlatList, StyleSheet, Text, View } from "react-native";

const mockAttendance = [
  { id: "1", event: "Robotics Workshop", date: "20 Oct 2026" },
  { id: "2", event: "Hackathon", date: "25 Oct 2026" },
];

export default function AttendanceHistoryScreen() {
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
