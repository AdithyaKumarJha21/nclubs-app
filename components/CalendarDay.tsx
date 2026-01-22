import { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CalendarDay as CalendarDayType } from "../utils/calendarUtils";
import EventDot from "./EventDot";

interface CalendarDayProps {
  day: CalendarDayType;
  events?: { id: string; title: string; color: string }[];
  isDark?: boolean;
}

export default function CalendarDay({
  day,
  events = [],
  isDark = false,
}: CalendarDayProps) {
  const [showModal, setShowModal] = useState(false);

  const isCurrentMonth = day.isCurrentMonth;
  const isToday = day.isToday;
  const hasEvents = events.length > 0;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.dayCell,
          {
            backgroundColor: isToday
              ? "#0066cc"
              : isDark
                ? "#2a2a2a"
                : "#f9f9f9",
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
              color: isToday
                ? "#fff"
                : isDark
                  ? "#fff"
                  : "#000",
              fontWeight: isToday ? "700" : "600",
            },
          ]}
        >
          {day.dayNumber}
        </Text>

        {/* Event Dots */}
        {hasEvents && (
          <View style={styles.dotsContainer}>
            {events.slice(0, 3).map((event, index) => (
              <EventDot
                key={`${event.id}-${index}`}
                color={event.color}
              />
            ))}
            {events.length > 3 && (
              <Text style={styles.moreIndicator}>+{events.length - 3}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Events Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDark ? "#2a2a2a" : "#fff",
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: isDark ? "#fff" : "#000" },
              ]}
            >
              Events on {day.date.toLocaleDateString()}
            </Text>

            <View style={styles.eventsList}>
              {events.map((event, index) => (
                <View
                  key={`${event.id}-${index}`}
                  style={[
                    styles.eventItem,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#f9f9f9",
                      borderLeftColor: event.color,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: event.color },
                    ]}
                  />
                  <Text
                    style={[
                      styles.eventTitle,
                      { color: isDark ? "#fff" : "#000" },
                    ]}
                  >
                    {event.title}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
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
    width: "85%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  eventsList: {
    maxHeight: "70%",
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  closeButton: {
    backgroundColor: "#0066cc",
    paddingVertical: 10,
    paddingHorizontal: 20,
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
