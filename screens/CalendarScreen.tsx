import { View, Text } from "react-native";
import CalendarGrid from "../components/CalendarGrid";

export default function CalendarScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>
        Calendar
      </Text>

      <CalendarGrid />
    </View>
  );
}
