import { StyleSheet, Switch, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function SettingsScreen() {
  const { isDark, setIsDark, theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.text, { color: theme.text }]}>
        Dark Mode
      </Text>

      <Switch value={isDark} onValueChange={setIsDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  text: {
    fontSize: 18,
    fontWeight: "600",
  },
});
