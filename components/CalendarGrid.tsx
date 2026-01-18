import { View } from "react-native";
import CalendarDay from "./CalendarDay";

const days = Array.from({ length: 30 }, (_, i) => i + 1);

export default function CalendarGrid() {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {days.map((day) => (
        <CalendarDay key={day} day={day} />
      ))}
    </View>
  );
}