import { View, Text } from "react-native";

export default function AttendanceTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <Text>No students attended yet.</Text>;
  }

  return (
    <View>
      {rows.map((row) => (
        <View
          key={row.id}
          style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}
        >
          <Text>{row.name}</Text>
          <Text>{row.usn}</Text>
          <Text>{row.time}</Text>
        </View>
      ))}
    </View>
  );
}
