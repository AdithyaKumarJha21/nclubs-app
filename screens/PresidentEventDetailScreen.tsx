import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  EventDetail,
  disableEventAttendance,
  enableEventAttendance,
  getEventById,
} from "../services/events";
import { canManageClub } from "../services/permissions";
import { useTheme } from "../theme/ThemeContext";
import { formatTimeLocal } from "../utils/timeWindow";

export default function PresidentEventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isDark } = useTheme();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadEvent = async () => {
      try {
        setLoading(true);
        const data = await getEventById(id);
        setEvent(data);

        const canManage = data.club_id ? await canManageClub(data.club_id) : false;
        setIsManager(canManage);

        console.log("📌 President event detail", {
          eventId: id,
          isManager: canManage,
          qr_enabled: data.qr_enabled,
          hasToken: !!data.qr_token,
          tokenLength: data.qr_token?.length ?? 0,
        });
      } catch (error) {
        console.error("Error fetching event:", error);
        Alert.alert("Error", "Failed to load event details");
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id]);

  const handleQrError = (error: unknown) => {
    const code =
      typeof error === "object" && error && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    const message =
      code === "42501"
        ? "Not authorized to manage attendance for this event."
        : "Something went wrong. Try again.";
    console.error("Error updating attendance state:", { code, message });
    Alert.alert("Error", message);
  };

  const handleEnableAttendance = async () => {
    if (!event || !isManager || event.qr_enabled) return;

    try {
      setGenerating(true);
      const updated = await enableEventAttendance(event.id);
      setEvent((current) => (current ? { ...current, ...updated } : current));
      Alert.alert("Success", "Attendance enabled");
      console.log("✅ Attendance enabled", {
        eventId: event.id,
        qr_enabled: updated.qr_enabled,
      });
    } catch (error: unknown) {
      handleQrError(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDisableAttendance = async () => {
    if (!event || !isManager || !event.qr_enabled) return;

    try {
      setDisabling(true);
      const updated = await disableEventAttendance(event.id);
      setEvent((current) => (current ? { ...current, ...updated } : current));
      Alert.alert("Success", "Attendance disabled");
      console.log("✅ Attendance disabled", {
        eventId: event.id,
        qr_enabled: updated.qr_enabled,
      });
    } catch (error: unknown) {
      handleQrError(error);
    } finally {
      setDisabling(false);
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
          value={`${formatTimeLocal(event.start_time)} - ${formatTimeLocal(event.end_time)}`}
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

      {isManager ? (
        <View style={styles.qrSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
            Attendance Controls
          </Text>

          <View style={styles.enabledActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.generateButton, { flex: 1, opacity: event.qr_enabled ? 0.6 : 1 }]}
              onPress={handleEnableAttendance}
              disabled={event.qr_enabled || generating || disabling}
            >
              <Text style={styles.actionButtonText}>
                {generating ? "Enabling..." : "Generate Attendance"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.disableButton, { flex: 1, opacity: event.qr_enabled ? 1 : 0.6 }]}
              onPress={handleDisableAttendance}
              disabled={!event.qr_enabled || generating || disabling}
            >
              <Text style={styles.actionButtonText}>
                {disabling ? "Disabling..." : "Disable Attendance"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.qrDisplay}>
            <Text style={[styles.qrCaption, { color: isDark ? "#aaa" : "#666" }]}>
              {event.qr_enabled
                ? "Attendance button is currently enabled for registered students."
                : "Attendance button is currently disabled for students."}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.qrCaption, { color: isDark ? "#aaa" : "#666" }]}>
          Not authorized to manage attendance for this club event.
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
