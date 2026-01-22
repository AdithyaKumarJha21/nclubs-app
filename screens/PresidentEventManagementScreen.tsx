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
import { useAuth } from "../context/AuthContext";
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

  useEffect(() => {
    if (user) {
      fetchPresidentEvents();
      fetchQRStatus();
      // Poll for QR status
      const interval = setInterval(fetchQRStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

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
        .select("event_id, status, generated_at, generated_by");

      if (error) throw error;

      const statusMap: QRStatus = {};
      (data || []).forEach((qr: any) => {
        if (qr.status === "active") {
          statusMap[qr.event_id] = {
            isActive: true,
            generatedBy: qr.generated_by,
            generatedAt: qr.generated_at,
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
          });

        if (error) throw error;
      }

      Alert.alert("Success", "QR code generated and activated!");
      await fetchQRStatus();
    } catch (error) {
      console.error("Error generating QR:", error);
      Alert.alert("Error", "Failed to generate QR code");
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
    } catch (error) {
      console.error("Error disabling QR:", error);
      Alert.alert("Error", "Failed to disable QR code");
    } finally {
      setGeneratingQR("");
    }
  };

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
        My Events - QR Management
      </Text>

      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text
            style={[
              styles.emptyText,
              { color: isDark ? "#aaa" : "#666" },
            ]}
          >
            No events created yet
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
                </View>
              </View>
            );
          }}
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
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
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
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
});
