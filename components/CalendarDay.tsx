import { TouchableOpacity, Text, View } from "react-native";
import EventDot from "./EventDot";

export default function CalendarDay({ day }: { day: number }) {
  return (
    <TouchableOpacity
      style={{
        width: "14%",
        aspectRatio: 1,
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 4,
      }}
    >
      <Text>{day}</Text>

      <View style={{ flexDirection: "row", marginTop: 2 }}>
        <EventDot color="red" />
        <EventDot color="blue" />
      </View>
    </TouchableOpacity>
  );
}
