import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  searchTerm: string;
  onClear: () => void;
};

export default function ClubSearchEmptyState({ searchTerm, onClear }: Props) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.message, { color: theme.text }]}>
        No clubs found for '{searchTerm}'
      </Text>
      <TouchableOpacity onPress={onClear}>
        <Text style={[styles.clearLink, { color: theme.primary }]}>
          Clear search
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    alignItems: "center",
  },
  message: {
    fontSize: 14,
    marginBottom: 8,
  },
  clearLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
