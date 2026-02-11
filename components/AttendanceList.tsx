import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";

export interface AttendanceEvent {
  id: string;
  title: string;
  date?: string;
  attended?: boolean;
}

interface AttendanceListProps {
  events: AttendanceEvent[];
  isLoading?: boolean;
}

type FilterOption = "all" | "attended" | "unattended" | "latest";

export default function AttendanceList({
  events,
  isLoading = false,
}: AttendanceListProps) {
  const { isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>("latest");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    let visibleEvents = [...events];

    if (selectedFilter === "attended") {
      visibleEvents = visibleEvents.filter((event) => event.attended);
    }

    if (selectedFilter === "unattended") {
      visibleEvents = visibleEvents.filter((event) => !event.attended);
    }

    if (normalizedQuery) {
      visibleEvents = visibleEvents.filter((event) =>
        event.title.toLowerCase().includes(normalizedQuery)
      );
    }

    return visibleEvents.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;

      return dateB - dateA;
    });
  }, [events, query, selectedFilter]);

  const setFilter = (option: FilterOption) => {
    setSelectedFilter(option);
    setShowFilterMenu(false);
  };

  const filterLabel = selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading attendance history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.controls}>
        <View
          style={[
            styles.searchBox,
            {
              borderColor: isDark ? "#444" : "#d4d4d8",
              backgroundColor: isDark ? "#1f2937" : "#f8fafc",
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color={isDark ? "#9ca3af" : "#6b7280"}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search events"
            placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
            style={[styles.searchInput, { color: isDark ? "#fff" : "#111827" }]}
          />
        </View>

        <Pressable
          style={[
            styles.filterButton,
            { backgroundColor: isDark ? "#1f2937" : "#eef2ff" },
          ]}
          onPress={() => setShowFilterMenu((current) => !current)}
        >
          <Ionicons name="filter-outline" size={16} color={isDark ? "#e5e7eb" : "#1e3a8a"} />
          <Text style={[styles.filterButtonText, { color: isDark ? "#e5e7eb" : "#1e3a8a" }]}>
            {filterLabel}
          </Text>
        </Pressable>
      </View>

      {showFilterMenu && (
        <View
          style={[
            styles.filterMenu,
            {
              backgroundColor: isDark ? "#111827" : "#ffffff",
              borderColor: isDark ? "#374151" : "#e5e7eb",
            },
          ]}
        >
          {(["all", "attended", "unattended", "latest"] as FilterOption[]).map((option) => (
            <Pressable
              key={option}
              onPress={() => setFilter(option)}
              style={styles.filterOption}
            >
              <Text style={{ color: isDark ? "#f3f4f6" : "#111827" }}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
              {selectedFilter === option && (
                <Ionicons name="checkmark" size={16} color={isDark ? "#60a5fa" : "#2563eb"} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      {!filteredEvents.length ? (
        <View style={styles.centerContainer}>
          <Text style={{ color: isDark ? "#aaa" : "#666" }}>
            No events found for this filter/search.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.eventRow,
                { backgroundColor: isDark ? "#333" : "#f9f9f9" },
              ]}
            >
              <View style={styles.eventInfo}>
                <Text
                  style={[
                    styles.eventTitle,
                    { color: isDark ? "#fff" : "#000" },
                  ]}
                >
                  {item.title}
                </Text>
                {item.date && (
                  <Text
                    style={[
                      styles.eventDate,
                      { color: isDark ? "#aaa" : "#666" },
                    ]}
                  >
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: item.attended ? "#dcfce7" : "#fee2e2",
                    borderColor: item.attended ? "#22c55e" : "#ef4444",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: item.attended ? "#166534" : "#991b1b" },
                  ]}
                >
                  {item.attended ? "Attended" : "Unattended"}
                </Text>
              </View>
            </View>
          )}
          scrollEnabled={true}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterMenu: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
  },
  filterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  listContainer: {
    paddingBottom: 8,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
    gap: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
