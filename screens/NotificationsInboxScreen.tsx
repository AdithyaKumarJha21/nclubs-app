import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

const mockNotifications = [
  { id: "1", title: "Recruitment Open", club: "Robotics", time: "2h ago" },
  { id: "2", title: "Workshop Tomorrow", club: "Coding", time: "1d ago" }
];

export default function NotificationsInboxScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.heading, { color: theme.text }]}>
        Notifications
      </Text>

      <FlatList
        data={mockNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.club} · {item.time}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    marginBottom: 12,
  },
  title: { fontWeight: "600" },
  meta: { fontSize: 12, color: "#6b7280" }
});
