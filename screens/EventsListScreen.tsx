import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

type EventItem = {
  id: string;
  title: string;
  event_date: string;
  location: string;
  start_time: string;
  end_time: string;
  description?: string;
};

export default function EventsListScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAndFilterEvents();
  }, []);

  const fetchAndFilterEvents = async () => {
    try {
      setLoading(true);

      // ✅ FETCH ALL EVENTS FROM DATABASE
      const { data, error } = await supabase
        .from("events")
        .select("id, title, event_date, location, start_time, end_time, description")
        .order("event_date", { ascending: true });

      if (error) {
        console.error("Error fetching events:", error);
        setEvents([]);
        setLoading(false);
        return;
      }

      // ✅ FILTER OUT EXPIRED EVENTS (EVENT DATE IN THE FUTURE)
      const now = new Date();
      const upcomingEvents = (data || []).filter((event: any) => {
        const eventDate = new Date(event.event_date);
        return eventDate >= now; // Only show future events
      });

      setEvents(upcomingEvents);
      setLoading(false);
    } catch (err) {
      console.error("Unexpected error:", err);
      setEvents([]);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
        ]}
      >
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
      ]}
    >
      <Text
        style={[
          styles.heading,
          { color: isDark ? "#fff" : "#000" },
        ]}
      >
        Upcoming Events
      </Text>

      {events.length === 0 ? (
        <Text
          style={[
            styles.emptyText,
            { color: isDark ? "#aaa" : "#666" },
          ]}
        >
          No upcoming events at the moment.
        </Text>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: isDark ? "#2a2a2a" : "#f9fafb",
                },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/event-details",
                  params: { eventId: item.id },
                })
              }
            >
              <Text
                style={[
                  styles.title,
                  { color: isDark ? "#fff" : "#000" },
                ]}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  styles.meta,
                  { color: isDark ? "#aaa" : "#666" },
                ]}
              >
                📅 {new Date(item.event_date).toLocaleDateString()} at{" "}
                {item.start_time}
              </Text>
              <Text
                style={[
                  styles.meta,
                  { color: isDark ? "#aaa" : "#666" },
                ]}
              >
                📍 {item.location || "TBA"}
              </Text>
            </Pressable>
          )}
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
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
  },
  card: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    marginTop: 3,
  },
});
