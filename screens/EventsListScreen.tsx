import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { EventListItem, getEventsForStudent } from "../services/events";
import { useTheme } from "../theme/ThemeContext";

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

type SortOption = "date-asc" | "date-desc" | "name-asc" | "club-asc";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Date (Soonest First)", value: "date-asc" },
  { label: "Date (Latest First)", value: "date-desc" },
  { label: "Name (A-Z)", value: "name-asc" },
  { label: "Club Name (A-Z)", value: "club-asc" },
];

export default function EventsListScreen() {
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("date-asc");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getEventsForStudent();
      setEvents(data);
    } catch (err) {
      console.error("Unexpected error:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const displayedEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      if (!debouncedQuery) return true;

      const searchableFields = [
        event.title,
        event.description || "",
        event.location || "",
        event.club_name || ""
      ]
        .join(" ")
        .toLowerCase();

      return searchableFields.includes(debouncedQuery);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortOption === "date-asc") {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      }

      if (sortOption === "date-desc") {
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      }

      if (sortOption === "name-asc") {
        return a.title.localeCompare(b.title);
      }

      return (a.club_name || "").localeCompare(b.club_name || "");
    });

    return sorted;
  }, [debouncedQuery, events, sortOption]);

  const noSearchResults = debouncedQuery.length > 0 && displayedEvents.length === 0;

  const handleSortChange = () => {
    const currentIndex = SORT_OPTIONS.findIndex((option) => option.value === sortOption);
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
    setSortOption(SORT_OPTIONS[nextIndex].value);
  };

  const currentSortLabel = SORT_OPTIONS.find((option) => option.value === sortOption)?.label;

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
        Events
      </Text>

      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.card,
            borderColor: isDark ? "#1f2937" : "#e2e8f0",
          },
        ]}
      >
        <Ionicons name="search-outline" size={18} color="#94a3b8" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search events by name, club, or description..."
          placeholderTextColor={isDark ? "#94a3b8" : "#6b7280"}
          style={[styles.searchInput, { color: theme.text }]}
          returnKeyType="search"
        />
        {searchQuery.trim().length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery("")} accessibilityLabel="Clear search">
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: isDark ? "#2a2a2a" : "#f1f5f9" }]}
          onPress={handleSortChange}
        >
          <Text style={[styles.controlText, { color: isDark ? "#fff" : "#0f172a" }]}>Sort: {currentSortLabel}</Text>
        </TouchableOpacity>

      </View>

      {noSearchResults ? (
        <Text
          style={[
            styles.emptyText,
            { color: isDark ? "#aaa" : "#666" },
          ]}
        >
          No events match your search. Try different keywords.
        </Text>
      ) : displayedEvents.length === 0 ? (
        <Text
          style={[
            styles.emptyText,
            { color: isDark ? "#aaa" : "#666" },
          ]}
        >
          No upcoming events scheduled. Check back soon!
        </Text>
      ) : (
        <FlatList
          data={displayedEvents}
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
                  pathname: "/student/events/[id]",
                  params: { id: item.id },
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
              {item.club_name ? (
                <Text style={[styles.meta, { color: isDark ? "#aaa" : "#666" }]}>🏷️ {item.club_name}</Text>
              ) : null}
              <Text
                style={[
                  styles.meta,
                  { color: isDark ? "#aaa" : "#666" },
                ]}
              >
                📅 {new Date(item.event_date).toLocaleDateString()} at {formatTime(item.start_time)}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  clearText: {
    fontSize: 20,
    lineHeight: 20,
    color: "#94a3b8",
    paddingHorizontal: 4,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  controlButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  controlButtonActive: {
    backgroundColor: "#2563eb",
  },
  controlText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
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
