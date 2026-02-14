import { useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Role } from "../context/AuthContext";
import { CalendarDay as CalendarDayType } from "../utils/calendarUtils";
import EventDot from "./EventDot";

export type CalendarEventStatus = "past" | "ongoing" | "upcoming";

export type CalendarEventItem = {
  id: string;
  title: string;
  color: string;
  status: CalendarEventStatus;
  startTime: string;
  endTime: string;
  location: string | null;
  clubName: string | null;
  eventDate: string;
};

interface CalendarDayProps {
  day: CalendarDayType;
  events?: CalendarEventItem[];
  isDark?: boolean;
  role?: Role;
}

const STATUS_LABELS: Record<CalendarEventStatus, string> = {
  past: "Ended",
  ongoing: "Live Now",
  upcoming: "Upcoming",
};

const STATUS_BADGE_COLORS: Record<CalendarEventStatus, string> = {
  past: "#6b7280",
  ongoing: "#16a34a",
  upcoming: "#2563eb",
};

const formatTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "TBA";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function CalendarDay({
  day,
  events = [],
  isDark = false,
}: CalendarDayProps) {
  const [showModal, setShowModal] = useState(false);

  const isCurrentMonth = day.isCurrentMonth;
  const isToday = day.isToday;
  const hasEvents = events.length > 0;

  const dateLabel = useMemo(() => day.date.toLocaleDateString(), [day.date]);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.dayCell,
          {
            backgroundColor: isToday ? "#0066cc" : isDark ? "#2a2a2a" : "#f9f9f9",
          },
          !isCurrentMonth && { opacity: 0.3 },
        ]}
        onPress={() => hasEvents && setShowModal(true)}
        disabled={!hasEvents}
      >
        <Text
          style={[
            styles.dayNumber,
            {
              color: isToday ? "#fff" : isDark ? "#fff" : "#000",
              fontWeight: isToday ? "700" : "600",
            },
          ]}
        >
          {day.dayNumber}
        </Text>

        {hasEvents && (
          <View style={styles.dotsContainer}>
            {events.slice(0, 3).map((event, index) => (
              <EventDot key={`${event.id}-${index}`} color={event.color} pulsing={event.status === "ongoing"} />
            ))}
            {events.length > 3 && <Text style={styles.moreIndicator}>+{events.length - 3}</Text>}
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { backgroundColor: isDark ? "#2a2a2a" : "#fff" }]}
          >
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#000" }]}>Events on {dateLabel}</Text>

            <View style={styles.eventsList}>
              {events.map((event) => (
                <View
                  key={event.id}
                  style={[
                    styles.eventItem,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#f9f9f9",
                      borderLeftColor: event.color,
                    },
                  ]}
                >
                  <View style={styles.eventHeaderRow}>
                    <Text style={[styles.eventTitle, { color: isDark ? "#fff" : "#000" }]}>{event.title}</Text>
                    <View style={[styles.badge, { backgroundColor: STATUS_BADGE_COLORS[event.status] }]}>
                      <Text style={styles.badgeText}>{STATUS_LABELS[event.status]}</Text>
                    </View>
                  </View>

                  <Text style={[styles.metaText, { color: isDark ? "#ddd" : "#444" }]}>
                    🕒 {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </Text>
                  <Text style={[styles.metaText, { color: isDark ? "#ddd" : "#444" }]}>🏷️ {event.clubName || "General"}</Text>
                  <Text style={[styles.metaText, { color: isDark ? "#ddd" : "#444" }]}>📍 {event.location || "TBA"}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={() => setShowModal(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "#ddd",
    padding: 4,
  },
  dayNumber: {
    fontSize: 13,
  },
  dotsContainer: {
    flexDirection: "row",
    marginTop: 3,
    alignItems: "center",
    gap: 2,
  },
  moreIndicator: {
    fontSize: 8,
    color: "#666",
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: "88%",
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  eventsList: {
    maxHeight: "76%",
  },
  eventItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    gap: 4,
  },
  eventHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  metaText: {
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  closeButton: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 16,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
