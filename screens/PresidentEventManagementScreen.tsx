import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import EventCreationModal, {
  EventFormData,
} from "../components/EventCreationModal";
import { useAuth } from "../context/AuthContext";
import { createEvent, listEventsForClubIds } from "../services/events";
import { getMyManagedClubIds } from "../services/permissions";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

type SupabaseRequestError = Error & { code?: string };

type EventRow = {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
  created_by: string;
};

export default function PresidentEventManagementScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string>("");
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubIds, setClubIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const noClubAssigned = clubIds.length === 0;
  const isRoleAllowed = user?.role === "faculty" || user?.role === "president" || user?.role === "admin";

  const fetchEventsForRole = useCallback(async () => {
    if (!user || (user.role !== "faculty" && user.role !== "president" && user.role !== "admin")) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      if (user.role === "president") {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser) {
          setErrorMessage("Please log in to continue.");
          setEvents([]);
          setClubId(null);
          setClubIds([]);
          return;
        }

        const userId = authUser.id;
        console.log("PRESIDENT userId:", userId);

        const { data: pa, error: assignmentError } = await supabase
          .from("president_assignments")
          .select("club_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (assignmentError) {
          throw assignmentError;
        }

        console.log("PRESIDENT clubId:", pa?.club_id);

        if (!pa?.club_id) {
          setErrorMessage("No club assigned. Contact admin.");
          setEvents([]);
          setClubId(null);
          setClubIds([]);
          return;
        }

        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("id, club_id, title, description, start_time, end_time, location, status, created_by")
          .eq("club_id", pa.club_id)
          .order("start_time", { ascending: true });

        if (eventsError) {
          throw eventsError;
        }

        const fetchedEvents = (eventsData ?? []) as EventRow[];
        console.log("PRESIDENT events count:", fetchedEvents.length);
        console.log(
          "PRESIDENT sample created_by:",
          fetchedEvents.slice(0, 3).map((event) => event.created_by)
        );

        setClubIds([pa.club_id]);
        setClubId(pa.club_id);
        setEvents(fetchedEvents);
        return;
      }

      const resolvedClubIds = await getMyManagedClubIds();
      const fetchedEvents = await listEventsForClubIds(resolvedClubIds);

      console.log({
        role: user.role,
        userId: user.id,
        clubIds: resolvedClubIds,
        eventsCount: fetchedEvents.length,
      });

      setClubIds(resolvedClubIds);
      setClubId(resolvedClubIds[0] ?? null);
      setEvents(fetchedEvents);
    } catch (error: unknown) {
      console.error("Error fetching events:", error);
      const typedError = error as SupabaseRequestError;

      if (typedError.code === "42501") {
        setErrorMessage("Not authorized to view events for this club.");
      } else {
        setErrorMessage("Failed to load events.");
      }

      setEvents([]);
      setClubId(null);
      setClubIds([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isRoleAllowed) {
      setLoading(false);
      return;
    }

    fetchEventsForRole();
  }, [fetchEventsForRole, isRoleAllowed]);

  const handleCreateEvent = async (formData: EventFormData) => {
    if (!user) return;

    try {
      setCreatingEvent(true);

      console.log("📝 Creating event with data:", formData);

      if (noClubAssigned) {
        Alert.alert("No club assigned. Contact admin.");
        setCreatingEvent(false);
        return;
      }

      const resolvedClubId = clubId ?? clubIds[0] ?? null;
      if (!resolvedClubId) {
        Alert.alert("No club assigned. Contact admin.");
        setCreatingEvent(false);
        return;
      }

      await createEvent({
        clubId: resolvedClubId,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        eventDate: formData.event_date,
        startTime: formData.start_time,
        endTime: formData.end_time,
      });

      Alert.alert("Success", "Event created successfully!");
      setShowCreateModal(false);
      await fetchEventsForRole();
    } catch (error: unknown) {
      console.error("❌ Error creating event:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error Creating Event", errorMsg);
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleDeleteEvent = (eventId: string, eventTitle: string) => {
    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => deleteEvent(eventId),
          style: "destructive",
        },
      ]
    );
  };

  const deleteEvent = async (eventId: string) => {
    try {
      setDeletingEventId(eventId);

      await supabase.from("event_registrations").delete().eq("event_id", eventId);
      await supabase.from("attendance").delete().eq("event_id", eventId);

      const { error } = await supabase.from("events").delete().eq("id", eventId);

      if (error) throw error;

      Alert.alert("Success", "Event deleted successfully!");
      await fetchEventsForRole();
    } catch (error) {
      console.error("Error deleting event:", error);
      Alert.alert("Error", "Failed to delete event");
    } finally {
      setDeletingEventId("");
    }
  };

  if (!isRoleAllowed) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? "#1a1a1a" : "#fff" }]}>
        <Text style={[styles.assignmentWarning, { color: isDark ? "#f87171" : "#b91c1c" }]}>Not authorized.</Text>
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
      <View style={styles.headerContainer}>
        <Text
          style={[
            styles.heading,
            { color: isDark ? "#fff" : "#000" },
          ]}
        >
          My Events - Attendance Management
        </Text>
        <TouchableOpacity
          style={[styles.createButton, { opacity: clubId ? 1 : 0.6 }]}
          onPress={() => setShowCreateModal(true)}
          disabled={!clubId}
        >
          <Text style={styles.createButtonText}>+ Add Event</Text>
        </TouchableOpacity>
      </View>

      {noClubAssigned && !loading && (
        <Text style={[styles.assignmentWarning, { color: isDark ? "#f5c542" : "#8a5a00" }]}>No club assigned. Contact admin.</Text>
      )}

      {errorMessage && !loading && (
        <Text style={[styles.assignmentWarning, { color: isDark ? "#f87171" : "#b91c1c" }]}>{errorMessage}</Text>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text
            style={[
              styles.emptyText,
              { color: isDark ? "#aaa" : "#666" },
            ]}
          >
            No upcoming active events to manage. Tap + Add Event to create one!
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            return (
              <View
                style={[
                  styles.eventCard,
                  { backgroundColor: isDark ? "#2a2a2a" : "#f9f9f9" },
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
                  <Text
                    style={[
                      styles.eventMeta,
                      { color: isDark ? "#aaa" : "#666" },
                    ]}
                  >
                    {new Date(item.start_time).toLocaleDateString()} {new Date(item.start_time).toLocaleTimeString()}
                  </Text>
                  <Text
                    style={[
                      styles.eventMeta,
                      { color: isDark ? "#aaa" : "#666" },
                    ]}
                  >
                    📍 {item.location || "TBA"}
                  </Text>

                  <View
                    style={[
                      styles.qrBadge,
                      {
                        backgroundColor: "#4caf50",
                      },
                    ]}
                  >
                    <Text style={styles.qrBadgeText}>Event Visible for Assigned Club</Text>
                  </View>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.manageButton]}
                    onPress={() =>
                      router.push({ pathname: "/president/events/[id]", params: { id: item.id } })
                    }
                  >
                    <Text style={styles.buttonText}>Manage Attendance</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.deleteButton,
                      { opacity: deletingEventId === item.id ? 0.6 : 1 },
                    ]}
                    onPress={() =>
                      handleDeleteEvent(item.id, item.title)
                    }
                    disabled={deletingEventId === item.id}
                  >
                    <Text style={styles.buttonText}>
                      {deletingEventId === item.id ? "..." : "Delete"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <EventCreationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateEvent}
        loading={creatingEvent}
        submitDisabled={noClubAssigned}
        submitDisabledMessage="No club assigned. Contact admin."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  assignmentWarning: {
    fontSize: 13,
    marginBottom: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
  },
  createButton: {
    backgroundColor: "#0066cc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  eventCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#0066cc",
  },
  eventInfo: {
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  eventMeta: {
    fontSize: 12,
    marginBottom: 3,
  },
  qrBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  qrBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  manageButton: {
    backgroundColor: "#0066cc",
  },
  deleteButton: {
    backgroundColor: "#d32f2f",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
});
