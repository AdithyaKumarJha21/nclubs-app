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
  date: string;
  venue: string;
  club: string;
  start_time: string;
  end_time: string;
};

export default function EventsListScreen() {
  const router = useRouter();
  const { theme } = useTheme();
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
        .select("id, title, date, venue, club, start_time, end_time");

      if (error) {
        console.error("Error fetching events:", error);
        setEvents([]);
        setLoading(false);
        return;
      }

      // ✅ FILTER OUT EXPIRED EVENTS (END TIME IN THE PAST)
      const now = new Date();
      const upcomingEvents = (data || []).filter((event: any) => {
        const endTime = new Date(event.end_time);
        return endTime > now; // Only show if end_time is in the future
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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.heading, { color: theme.text }]}>
        Upcoming Events
      </Text>

      {events.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.text }]}>
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
                { backgroundColor: theme.card || "#f9fafb" },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/event-details",
                  params: item,
                })
              }
            >
              <Text style={[styles.title, { color: theme.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.meta, { color: theme.text }]}>
                {item.club} • {item.date}
              </Text>
              <Text style={[styles.meta, { color: theme.text }]}>
                Venue: {item.venue}
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
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    fontSize: 12,
    marginTop: 4,
  },
});
