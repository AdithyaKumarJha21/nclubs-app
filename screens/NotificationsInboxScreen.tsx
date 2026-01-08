import { FlatList, StyleSheet, Text, View } from "react-native";

const mockNotifications = [
  { id: "1", title: "Recruitment Open", club: "Robotics", time: "2h ago" },
  { id: "2", title: "Workshop Tomorrow", club: "Coding", time: "1d ago" }
];

export default function NotificationsInboxScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Notifications</Text>
      <FlatList
        data={mockNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.club} · {item.time}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: { padding: 12, borderRadius: 8, backgroundColor: "#f9fafb", marginBottom: 10 },
  title: { fontWeight: "600" },
  meta: { fontSize: 12, color: "#6b7280" }
});
