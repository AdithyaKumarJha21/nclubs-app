import React, { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator, StyleSheet } from "react-native";
import QRCode from "qrcode";
import { useLocalSearchParams } from "expo-router";

export default function GenerateQR() {
  const { id: eventId } = useLocalSearchParams();
  const clubId = "YOUR_CLUB_ID"; // replace if dynamic
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generate = async () => {
      const payload = {
        event_id: eventId,
        club_id: clubId,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiry
      };
      try {
        const uri = await QRCode.toDataURL(JSON.stringify(payload));
        setQrUri(uri);
      } catch (e) {
        console.error("QR generation failed", e);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [eventId]);

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan to Mark Attendance</Text>
      {qrUri ? (
        <Image source={{ uri: qrUri }} style={{ width: 240, height: 240 }} />
      ) : (
        <Text>Failed to generate QR.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, marginBottom: 20 },
});
