import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "../context/AuthContext";
import { EventDetail, getEventById, toggleEventQr } from "../services/events";
import { useTheme } from "../theme/ThemeContext";

const buildQrPayload = (eventId: string, token: string): string =>
  `${eventId}:${token}`;

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function PresidentEventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const isOwner = !!event && !!user && event.created_by === user.id;

  useEffect(() => {
    if (!id) return;

    const loadEvent = async () => {
      try {
        setLoading(true);
        const data = await getEventById(id);
        setEvent(data);
        console.log("📌 President event detail", {
          userId: user?.id,
          eventId: id,
          qrEnabled: data.qr_enabled,
        });
      } catch (error) {
        console.error("Error fetching event:", error);
        Alert.alert("Error", "Failed to load event details");
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id, user?.id]);

  const qrValue = useMemo(() => {
    if (!event?.qr_token) return null;
    return buildQrPayload(event.id, event.qr_token);
  }, [event]);

  const handleToggleQr = async (enabled: boolean) => {
    if (!event) return;

    try {
      setUpdating(true);
      const updated = await toggleEventQr(event.id, enabled);
      setEvent(updated);
      Alert.alert("Success", enabled ? "QR generated!" : "QR disabled.");
    } catch (error: unknown) {
      console.error("Error updating QR:", error);
      const message = error instanceof Error ? error.message : "Failed to update QR.";
      Alert.alert("Error", message);
    } finally {
      setUpdating(false);
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

  if (!event) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
        ]}
      >
        <Text style={{ color: isDark ? "#aaa" : "#666" }}>Event not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
      ]}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
        {event.title}
      </Text>

      <View style={styles.detailsSection}>
        <DetailRow
          label="Date"
          value={new Date(event.event_date).toLocaleDateString()}
          isDark={isDark}
        />
        <DetailRow
          label="Time"
          value={`${formatTime(event.start_time)} - ${formatTime(event.end_time)}`}
          isDark={isDark}
        />
        <DetailRow
          label="Location"
          value={event.location || "TBA"}
          isDark={isDark}
        />
      </View>

      {event.description ? (
        <View style={styles.descriptionSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
            Description
          </Text>
          <Text style={[styles.description, { color: isDark ? "#aaa" : "#666" }]}>
            {event.description}
          </Text>
        </View>
      ) : null}

      {isOwner ? (
        <View style={styles.qrSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
            QR Attendance
          </Text>

          <View style={styles.qrControls}>
            {!event.qr_enabled ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.generateButton]}
                onPress={() => handleToggleQr(true)}
                disabled={updating}
              >
                <Text style={styles.actionButtonText}>
                  {updating ? "Generating..." : "Generate QR"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.enabledActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.disableButton]}
                  onPress={() => handleToggleQr(false)}
                  disabled={updating}
                >
                  <Text style={styles.actionButtonText}>
                    {updating ? "Updating..." : "Disable QR"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.regenerateButton]}
                  onPress={() => handleToggleQr(true)}
                  disabled={updating}
                >
                  <Text style={styles.actionButtonText}>
                    {updating ? "Updating..." : "Regenerate"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {event.qr_enabled && qrValue ? (
            <View style={styles.qrDisplay}>
              <QRCode value={qrValue} size={180} />
              <Text
                style={[
                  styles.qrCaption,
                  { color: isDark ? "#aaa" : "#666" },
                ]}
              >
                Students can scan this QR during the event window.
              </Text>
            </View>
          ) : (
            <Text style={[styles.qrCaption, { color: isDark ? "#aaa" : "#666" }]}>
              QR is currently disabled.
            </Text>
          )}
        </View>
      ) : (
        <Text style={[styles.qrCaption, { color: isDark ? "#aaa" : "#666" }]}>
          Only the event creator can manage QR settings.
        </Text>
      )}
    </ScrollView>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  isDark: boolean;
}

function DetailRow({ label, value, isDark }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: isDark ? "#aaa" : "#666" }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: isDark ? "#fff" : "#000" }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  detailsSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  qrSection: {
    marginBottom: 24,
  },
  qrControls: {
    marginBottom: 16,
  },
  enabledActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  generateButton: {
    backgroundColor: "#16a34a",
  },
  disableButton: {
    backgroundColor: "#ef4444",
    flex: 1,
  },
  regenerateButton: {
    backgroundColor: "#2563eb",
    flex: 1,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  qrDisplay: {
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
  },
  qrCaption: {
    marginTop: 12,
    fontSize: 12,
    textAlign: "center",
  },
});
