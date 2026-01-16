import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  clubName: string;
  startTime: string;
  endTime: string;
};

export default function EventCard({
  title,
  clubName,
  startTime,
  endTime,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.club}>{clubName}</Text>
      <Text style={styles.time}>
        {startTime} – {endTime}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  club: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 6,
  },
});
