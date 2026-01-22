import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  message: string;
  time: string;
};

export default function NotificationCard({
  title,
  message,
  time,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.time}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  title: {
    fontWeight: "600",
    fontSize: 14,
  },
  message: {
    fontSize: 13,
    marginTop: 4,
    color: "#475569",
  },
  time: {
    fontSize: 11,
    marginTop: 6,
    color: "#64748b",
  },
});
