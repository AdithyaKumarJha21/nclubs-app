import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";
import {
    CalendarMonth,
    generateCalendarMonth,
    getDateKey,
} from "../utils/calendarUtils";
import CalendarDay from "./CalendarDay";

interface EventsByDate {
  [dateKey: string]: { id: string; title: string; color: string }[];
}

export default function CalendarGrid() {
  const { isDark } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState<CalendarMonth | null>(null);
  const [eventsByDate, setEventsByDate] = useState<EventsByDate>({});
  const [isLoading, setIsLoading] = useState(false);

  /* ===============================
     📅 UPDATE CALENDAR MONTH
     =============================== */
  useEffect(() => {
    const month = generateCalendarMonth(
      currentDate.getFullYear(),
      currentDate.getMonth()
    );
    setCalendarMonth(month);
    fetchEventsForMonth(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  /* ===============================
     📦 FETCH EVENTS FOR MONTH
     =============================== */
  const fetchEventsForMonth = async (year: number, month: number) => {
    try {
      setIsLoading(true);

      // Fetch all events (we'll filter by date in client)
      const { data, error } = await supabase
        .from("events")
        .select("id, title, event_date, club_id")
        .order("event_date", { ascending: true });

      if (error) throw error;

      console.log("📅 Total events fetched:", data?.length || 0);
      console.log("📅 Looking for events in year:", year, "month:", month);

      // Group events by date for this month
      const groupedEvents: EventsByDate = {};
      const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24", "#6c5ce7"];

      (data || []).forEach((event: any) => {
        // Parse the timestamptz format properly
        let eventDate;
        try {
          // Handle various date formats: ISO string, timestamptz, etc.
          eventDate = new Date(event.event_date);
        } catch (e) {
          console.error("Failed to parse date:", event.event_date);
          return;
        }

        // Get the date components
        const eventYear = eventDate.getFullYear();
        const eventMonth = eventDate.getMonth();
        const eventDay = eventDate.getDate();

        console.log(`📅 Event: "${event.title}" | Date: ${event.event_date} | Parsed: ${eventYear}-${eventMonth}-${eventDay}`);
        
        // Filter only events in the current month/year
        if (eventYear === year && eventMonth === month) {
          const dateKey = getDateKey(eventDate);

          if (!groupedEvents[dateKey]) {
            groupedEvents[dateKey] = [];
          }

          groupedEvents[dateKey].push({
            id: event.id,
            title: event.title,
            color: colors[groupedEvents[dateKey].length % colors.length],
          });

          console.log(`✅ Added to calendar: ${event.title} on ${dateKey}`);
        }
      });

      console.log("📅 Events grouped for display:", groupedEvents);
      setEventsByDate(groupedEvents);
    } catch (error) {
      console.error("❌ Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /* ===============================
     🔄 MONTH NAVIGATION
     =============================== */
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (!calendarMonth) {
    return null;
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View
        style={[
          styles.navigationContainer,
          { backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0" },
        ]}
      >
        <TouchableOpacity
          style={styles.navButton}
          onPress={goToPreviousMonth}
        >
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.monthDisplay}>
          <Text
            style={[
              styles.monthYear,
              { color: isDark ? "#fff" : "#000" },
            ]}
          >
            {calendarMonth.monthName} {calendarMonth.year}
          </Text>
          <TouchableOpacity
            style={[
              styles.todayButton,
              { backgroundColor: isDark ? "#444" : "#ddd" },
            ]}
            onPress={goToToday}
          >
            <Text
              style={[
                styles.todayButtonText,
                { color: isDark ? "#fff" : "#000" },
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.navButton}
          onPress={goToNextMonth}
        >
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Day Names Header */}
      <View
        style={[
          styles.dayNamesContainer,
          { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
        ]}
      >
        {dayNames.map((day) => (
          <View key={day} style={styles.dayNameCell}>
            <Text
              style={[
                styles.dayName,
                { color: isDark ? "#aaa" : "#666" },
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Days Grid */}
      <View
        style={[
          styles.daysContainer,
          { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
        ]}
      >
        {calendarMonth.days.map((day, index) => {
          const dateKey = getDateKey(day.date);
          const eventsForDay = eventsByDate[dateKey] || [];

          return (
            <CalendarDay
              key={`${day.date.getTime()}-${index}`}
              day={day}
              events={eventsForDay}
              isDark={isDark}
            />
          );
        })}
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={{ color: isDark ? "#aaa" : "#666" }}>Loading events...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0066cc",
  },
  monthDisplay: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: "700",
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dayNamesContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 4,
  },
  dayNameCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayName: {
    fontSize: 12,
    fontWeight: "600",
  },
  daysContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
});