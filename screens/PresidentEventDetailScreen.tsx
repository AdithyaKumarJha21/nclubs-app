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
import {
  EventDetail,
  disableEventQr,
  generateEventQr,
  getEventById,
} from "../services/events";
import { canManageClub } from "../services/permissions";
import { useTheme } from "../theme/ThemeContext";
import { formatTimeLocal } from "../utils/timeWindow";
import { buildQrPayload } from "../utils/qr";

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

  const qrValue = useMemo(() => {
    if (!event?.qr_token) return null;
    return buildQrPayload(event.id, event.qr_token);
  }, [event]);

  const handleQrError = (error: unknown) => {
    const code =
      typeof error === "object" && error && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    const message =
      code === "42501"
        ? "Not authorized to manage QR for this event."
        : "Something went wrong. Try again.";
    console.error("Error updating QR:", { code, message });
    Alert.alert("Error", message);
  };

  const handleGenerateQr = async () => {
    if (!event || !isManager || event.qr_token) return;

    try {
      setGenerating(true);
      const updated = await generateEventQr(event.id);
      setEvent((current) => (current ? { ...current, ...updated } : current));
      Alert.alert("Success", "QR generated");
      console.log("✅ QR generated", {
        eventId: event.id,
        tokenLength: updated.qr_token?.length ?? 0,
      });
    } catch (error: unknown) {
      handleQrError(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDisableQr = async () => {
    if (!event || !isManager || !event.qr_enabled) return;

    try {
      setDisabling(true);
      const updated = await disableEventQr(event.id);
      setEvent((current) => (current ? { ...current, ...updated } : current));
      Alert.alert("Success", "QR disabled");
      console.log("✅ QR disabled", {
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
            QR Attendance
          </Text>

          <View style={styles.qrControls}>
            {!event.qr_token ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.generateButton]}
                onPress={handleGenerateQr}
                disabled={generating || disabling}
              >
                <Text style={styles.actionButtonText}>
                  {generating ? "Generating..." : "Generate QR"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.enabledActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.disableButton]}
                  onPress={handleDisableQr}
                  disabled={!event.qr_enabled || generating || disabling}
                >
                  <Text style={styles.actionButtonText}>
                    {disabling ? "Disabling..." : "Disable QR"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {event.qr_token ? (
            <View style={styles.qrDisplay}>
              {qrValue ? <QRCode value={qrValue} size={180} /> : null}
              <Text
                style={[
                  styles.qrCaption,
                  { color: isDark ? "#aaa" : "#666" },
                ]}
              >
                QR already generated.
              </Text>
              <Text
                style={[
                  styles.qrCaption,
                  { color: isDark ? "#aaa" : "#666" },
                ]}
              >
                Event QR (shows eventId + token)
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
          Not authorized to manage this club event.
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
