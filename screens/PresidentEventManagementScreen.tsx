import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import EventCreationModal, {
  EventFormData,
} from "../components/EventCreationModal";
import { useAuth } from "../context/AuthContext";
import { getMyClubs } from "../services/assignments";
import { createEvent } from "../services/events";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

interface Event {
  id: string;
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  club_id: string;
  created_by: string;
}

interface QRStatus {
  [eventId: string]: {
    isActive: boolean;
    generatedBy: string;
    generatedAt: string;
  };
}

export default function PresidentEventManagementScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrStatus, setQrStatus] = useState<QRStatus>({});
  const [generatingQR, setGeneratingQR] = useState<string>("");
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string>("");
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubIds, setClubIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchClubId();
      fetchPresidentEvents();
      fetchQRStatus();
      // Poll for QR status
      const interval = setInterval(fetchQRStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchClubId = async () => {
    if (!user) return;
    try {
      const resolvedClubIds = await getMyClubs(user);
      console.log("FACULTY CLUB IDS:", resolvedClubIds);
      setClubIds(resolvedClubIds);
      setClubId(resolvedClubIds[0] ?? null);
    } catch (error) {
      console.error("❌ Error fetching club ID:", error);
      setClubId(null);
      setClubIds([]);
    }
  };

  const fetchPresidentEvents = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Fetch only events created by this president
      const { data, error } = await supabase
        .from("events")
        .select("id, title, event_date, start_time, end_time, location, club_id, created_by")
        .eq("created_by", user.id)
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      Alert.alert("Error", "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const fetchQRStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("qr_sessions")
        .select("event_id, status, generated_by");

      if (error) throw error;

      const statusMap: QRStatus = {};
      (data || []).forEach((qr: any) => {
        if (qr.status === "active") {
          statusMap[qr.event_id] = {
            isActive: true,
            generatedBy: qr.generated_by,
            generatedAt: new Date().toISOString(),
          };
        }
      });
      setQrStatus(statusMap);
    } catch (error) {
      console.error("Error fetching QR status:", error);
    }
  };

  const handleGenerateQR = async (eventId: string) => {
    if (!user) return;

    try {
      setGeneratingQR(eventId);

      // Check if QR already exists
      const { data: existing } = await supabase
        .from("qr_sessions")
        .select("id")
        .eq("event_id", eventId)
        .single();

      if (existing) {
        // Activate existing QR
        const { error } = await supabase
          .from("qr_sessions")
          .update({ status: "active" })
          .eq("event_id", eventId);

        if (error) throw error;
      } else {
        // Create new QR session
        const { error } = await supabase
          .from("qr_sessions")
          .insert({
            event_id: eventId,
            token: `QR-${Date.now()}-${Math.random()}`, // Generate unique token
            status: "active",
            generated_by: user.id,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      Alert.alert("Success", "QR code generated and activated!");
      await fetchQRStatus();
    } catch (error: any) {
      console.error("Error generating QR:", error);
      const errorMsg = error?.message || "Failed to generate QR code";
      Alert.alert("Error", errorMsg);
    } finally {
      setGeneratingQR("");
    }
  };

  const handleDisableQR = async (eventId: string) => {
    try {
      setGeneratingQR(eventId);

      const { error } = await supabase
        .from("qr_sessions")
        .update({ status: "inactive" })
        .eq("event_id", eventId);

      if (error) throw error;

      Alert.alert("Success", "QR code disabled!");
      await fetchQRStatus();
    } catch (error: any) {
      console.error("Error disabling QR:", error);
      const errorMsg = error?.message || "Failed to disable QR code";
      Alert.alert("Error", errorMsg);
    } finally {
      setGeneratingQR("");
    }
  };

  const handleCreateEvent = async (formData: EventFormData) => {
    if (!user) return;

    try {
      setCreatingEvent(true);

      console.log("📝 Creating event with data:", formData);

      if (clubIds.length === 0) {
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
      
      // Refresh the events list
      setTimeout(() => {
        fetchPresidentEvents();
      }, 500);
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

      // Delete associated QR sessions first
      await supabase.from("qr_sessions").delete().eq("event_id", eventId);

      // Delete associated event registrations
      await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", eventId);

      // Delete associated attendance records
      await supabase.from("attendance").delete().eq("event_id", eventId);

      // Delete the event
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId)
        .eq("created_by", user?.id); // Ensure they can only delete their own events

      if (error) throw error;

      Alert.alert("Success", "Event deleted successfully!");
      await fetchPresidentEvents();
      await fetchQRStatus();
    } catch (error) {
      console.error("Error deleting event:", error);
      Alert.alert("Error", "Failed to delete event");
    } finally {
      setDeletingEventId("");
    }
  };

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
          My Events - QR Management
        </Text>
        <TouchableOpacity
          style={[styles.createButton, { opacity: clubId ? 1 : 0.6 }]}
          onPress={() => setShowCreateModal(true)}
          disabled={!clubId}
        >
          <Text style={styles.createButtonText}>+ Add Event</Text>
        </TouchableOpacity>
      </View>
      {!clubId && (
        <Text style={[styles.assignmentWarning, { color: isDark ? "#f5c542" : "#8a5a00" }]}>
          No club assigned. Contact admin.
        </Text>
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
            No events created yet. Tap "+ Add Event" to create one!
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const qr = qrStatus[item.id];
            const isQRActive = qr?.isActive || false;

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
                    {new Date(item.event_date).toLocaleDateString()} {item.start_time}
                  </Text>
                  <Text
                    style={[
                      styles.eventMeta,
                      { color: isDark ? "#aaa" : "#666" },
                    ]}
                  >
                    📍 {item.location || "TBA"}
                  </Text>

                  {/* QR Status Badge */}
                  <View
                    style={[
                      styles.qrBadge,
                      {
                        backgroundColor: isQRActive ? "#4caf50" : "#999",
                      },
                    ]}
                  >
                    <Text style={styles.qrBadgeText}>
                      {isQRActive ? "✓ QR Active" : "QR Inactive"}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  {!isQRActive ? (
                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.generateButton,
                        { opacity: generatingQR === item.id ? 0.6 : 1 },
                      ]}
                      onPress={() => handleGenerateQR(item.id)}
                      disabled={generatingQR === item.id}
                    >
                      <Text style={styles.buttonText}>
                        {generatingQR === item.id ? "..." : "Generate"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.disableButton,
                        { opacity: generatingQR === item.id ? 0.6 : 1 },
                      ]}
                      onPress={() => handleDisableQR(item.id)}
                      disabled={generatingQR === item.id}
                    >
                      <Text style={styles.buttonText}>
                        {generatingQR === item.id ? "..." : "Disable"}
                      </Text>
                    </TouchableOpacity>
                  )}

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

      {/* Event Creation Modal */}
      <EventCreationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateEvent}
        loading={creatingEvent}
        submitDisabled={!clubId}
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
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  generateButton: {
    backgroundColor: "#4caf50",
  },
  disableButton: {
    backgroundColor: "#f44336",
  },
  deleteButton: {
    backgroundColor: "#ff6b6b",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
});
