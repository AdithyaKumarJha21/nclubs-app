import { View, Text } from "react-native";

export default function AttendanceList({ events }) {
  if (!events || events.length === 0) {
    return <Text>No attendance records yet.</Text>;
  }

  return (
    <View>
      {events.map((event) => (
        <View
          key={event.id}
          style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}
        >
          <Text>{event.title}</Text>
          {event.attended && <Text>✅</Text>}
        </View>
      ))}
    </View>
  );
}
