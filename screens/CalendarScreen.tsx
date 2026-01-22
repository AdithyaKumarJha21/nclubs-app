import { StyleSheet, Text, View } from "react-native";
import CalendarGrid from "../components/CalendarGrid";
import { useTheme } from "../theme/ThemeContext";

export default function CalendarScreen() {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: isDark ? "#fff" : "#000" },
        ]}
      >
        Calendar
      </Text>

      <CalendarGrid />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
});
