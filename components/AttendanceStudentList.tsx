import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export type AttendanceStudent = {
  id: string;
  name: string;
  email?: string;
  usn?: string;
  scan_time?: string;
};

interface AttendanceStudentListProps {
  students: AttendanceStudent[];
  eventTitle?: string;
  isLoading?: boolean;
  onBack?: () => void;
}

export default function AttendanceStudentList({
  students,
  eventTitle = "",
  isLoading = false,
  onBack,
}: AttendanceStudentListProps) {
  const { isDark } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading attendance...</Text>
      </View>
    );
  }

  if (!students || students.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text>No students scanned for this event.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
      
      {eventTitle && (
        <View style={styles.headerContainer}>
          <Text
            style={[
              styles.eventTitle,
              { color: isDark ? "#fff" : "#000" },
            ]}
          >
            {eventTitle}
          </Text>
          <Text
            style={[
              styles.studentCount,
              { color: isDark ? "#aaa" : "#666" },
            ]}
          >
            {students.length} student{students.length !== 1 ? "s" : ""} attended
          </Text>
        </View>
      )}

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.studentRow,
              {
                backgroundColor: isDark
                  ? index % 2 === 0
                    ? "#222"
                    : "#1a1a1a"
                  : index % 2 === 0
                    ? "#f9f9f9"
                    : "#fff",
              },
            ]}
          >
            <View style={styles.studentInfo}>
              <Text
                style={[
                  styles.studentName,
                  { color: isDark ? "#fff" : "#000" },
                ]}
              >
                {item.name}
              </Text>
              {item.usn && (
                <Text
                  style={[
                    styles.studentUSN,
                    { color: isDark ? "#aaa" : "#666" },
                  ]}
                >
                  USN: {item.usn}
                </Text>
              )}
              {item.email && (
                <Text
                  style={[
                    styles.studentEmail,
                    { color: isDark ? "#999" : "#999" },
                  ]}
                >
                  {item.email}
                </Text>
              )}
            </View>
            {item.scan_time && (
              <Text
                style={[
                  styles.scanTime,
                  { color: isDark ? "#888" : "#999" },
                ]}
              >
                {new Date(item.scan_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            )}
          </View>
        )}
        scrollEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  studentCount: {
    fontSize: 12,
  },
  studentRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  studentUSN: {
    fontSize: 12,
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 11,
  },
  scanTime: {
    fontSize: 12,
    marginLeft: 16,
  },
});
