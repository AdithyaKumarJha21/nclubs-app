import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { getMyClubIdsForEvents } from "../services/assignments";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";
import { CalendarMonth, generateCalendarMonth, getDateKey } from "../utils/calendarUtils";
import CalendarDay, { CalendarEventItem, CalendarEventStatus } from "./CalendarDay";

type EventsByDate = Record<string, CalendarEventItem[]>;

const STATUS_COLORS: Record<CalendarEventStatus, string> = {
  upcoming: "#2563eb",
  ongoing: "#16a34a",
  past: "#9ca3af",
};

const getEventStatus = (startTime: string, endTime: string): CalendarEventStatus => {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "past";
  }

  if (now >= start && now <= end) {
    return "ongoing";
  }

  if (now < start) {
    return "upcoming";
  }

  return "past";
};

const statusSortOrder: Record<CalendarEventStatus, number> = {
  ongoing: 0,
  upcoming: 1,
  past: 2,
};

export default function CalendarGrid() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState<CalendarMonth | null>(null);
  const [eventsByDate, setEventsByDate] = useState<EventsByDate>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCalendarMonth(generateCalendarMonth(currentDate.getFullYear(), currentDate.getMonth()));
  }, [currentDate]);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);

      const select =
        "id, title, event_date, start_time, end_time, location, club_id, clubs(name), status";

      const publishedQuery = supabase.from("events").select(select).eq("status", "active");

      const { data: publishedEvents, error: publishedError } = await publishedQuery;
      if (publishedError) {
        throw publishedError;
      }

      let combined = publishedEvents || [];

      if (user?.role === "faculty" || user?.role === "president") {
        const clubIds = await getMyClubIdsForEvents(user.role);
        if (clubIds.length > 0) {
          const { data: assignedEvents, error: assignedError } = await supabase
            .from("events")
            .select(select)
            .in("club_id", clubIds)
            .neq("status", "deleted");

          if (assignedError) {
            throw assignedError;
          }

          const existingIds = new Set(combined.map((event: any) => event.id));
          for (const event of assignedEvents || []) {
            if (!existingIds.has(event.id)) {
              combined.push(event);
            }
          }
        }
      }

      const groupedEvents: EventsByDate = {};

      combined.forEach((event: any) => {
        const eventDate = new Date(event.event_date);

        if (Number.isNaN(eventDate.getTime())) {
          return;
        }

        const dateKey = getDateKey(eventDate);
        const eventStatus = getEventStatus(event.start_time, event.end_time);

        if (!groupedEvents[dateKey]) {
          groupedEvents[dateKey] = [];
        }

        groupedEvents[dateKey].push({
          id: event.id,
          title: event.title,
          color: STATUS_COLORS[eventStatus],
          status: eventStatus,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location,
          clubName: event.clubs?.name ?? null,
          eventDate: event.event_date,
        });
      });

      Object.keys(groupedEvents).forEach((dateKey) => {
        groupedEvents[dateKey].sort((a, b) => {
          const statusDelta = statusSortOrder[a.status] - statusSortOrder[b.status];
          if (statusDelta !== 0) {
            return statusDelta;
          }

          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });
      });

      setEventsByDate(groupedEvents);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents, user?.id]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const dayNames = useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);

  if (!calendarMonth) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.navigationContainer, { backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0" }]}>
        <TouchableOpacity style={styles.navButton} onPress={goToPreviousMonth}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.monthDisplay}>
          <Text style={[styles.monthYear, { color: isDark ? "#fff" : "#000" }]}>
            {calendarMonth.monthName} {calendarMonth.year}
          </Text>
          <TouchableOpacity
            style={[styles.todayButton, { backgroundColor: isDark ? "#444" : "#ddd" }]}
            onPress={goToToday}
          >
            <Text style={[styles.todayButtonText, { color: isDark ? "#fff" : "#000" }]}>Today</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.navButton} onPress={goToNextMonth}>
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.legend, { backgroundColor: isDark ? "#222" : "#f7f7f7" }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.upcoming }]} />
          <Text style={{ color: isDark ? "#ddd" : "#333" }}>Upcoming</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.ongoing }]} />
          <Text style={{ color: isDark ? "#ddd" : "#333" }}>Live Now</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.past }]} />
          <Text style={{ color: isDark ? "#ddd" : "#333" }}>Ended</Text>
        </View>
      </View>

      <View style={[styles.dayNamesContainer, { backgroundColor: isDark ? "#1a1a1a" : "#fff" }]}>
        {dayNames.map((day) => (
          <View key={day} style={styles.dayNameCell}>
            <Text style={[styles.dayName, { color: isDark ? "#aaa" : "#666" }]}>{day}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.daysContainer, { backgroundColor: isDark ? "#1a1a1a" : "#fff" }]}>
        {calendarMonth.days.map((day, index) => {
          const dateKey = getDateKey(day.date);
          const eventsForDay = eventsByDate[dateKey] || [];

          return (
            <CalendarDay
              key={`${day.date.getTime()}-${index}`}
              day={day}
              events={eventsForDay}
              isDark={isDark}
              role={user?.role}
            />
          );
        })}
      </View>

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
  legend: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
