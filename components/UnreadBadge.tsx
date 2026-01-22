import { View, Text, StyleSheet } from "react-native";

export default function UnreadBadge({ count }: { count: number }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "red",
    borderRadius: 8,
    paddingHorizontal: 5,
  },
  text: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
});
