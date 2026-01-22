import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export type EventListItem = {
  id: string;
  title: string;
  date?: string;
  club_id?: string;
};

interface EventListProps {
  events: EventListItem[];
  onSelectEvent: (event: EventListItem) => void;
  isLoading?: boolean;
}

export default function EventList({
  events,
  onSelectEvent,
  isLoading = false,
}: EventListProps) {
  const { isDark } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading events...</Text>
      </View>
    );
  }

  if (!events || events.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text>No events found.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.eventItem,
            { backgroundColor: isDark ? "#333" : "#f5f5f5" },
          ]}
          onPress={() => onSelectEvent(item)}
        >
          <View>
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
        </TouchableOpacity>
      )}
      scrollEnabled={true}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  eventItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
  },
});
