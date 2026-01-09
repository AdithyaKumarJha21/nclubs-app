import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

const mockEvents = [
  {
    id: "1",
    title: "Robotics Workshop",
    date: "20 Oct 2026",
    venue: "Seminar Hall A",
    club: "Robotics Club",
  },
  {
    id: "2",
    title: "Hackathon",
    date: "25 Oct 2026",
    venue: "Main Auditorium",
    club: "Coding Club",
  },
];

export default function EventsListScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.heading, { color: theme.text }]}>
        Upcoming Events
      </Text>

      <FlatList
        data={mockEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() =>
              router.push({
                pathname: "/event-details",
                params: item,
              })
            }
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.club} • {item.date}
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
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 12, color: "#6b7280", marginTop: 4 },
});
