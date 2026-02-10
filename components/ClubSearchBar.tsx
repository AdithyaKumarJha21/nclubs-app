import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
};

export default function ClubSearchBar({ value, onChangeText, onClear }: Props) {
  const { theme, isDark } = useTheme();
  const showClear = value.trim().length > 0;

  return (
    <View
      style={[
        styles.searchContainer,
        {
          backgroundColor: theme.card,
          borderColor: isDark ? "#1f2937" : "#e2e8f0",
        },
      ]}
    >
      <Ionicons name="search-outline" size={18} color="#94a3b8" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search clubs..."
        placeholderTextColor={isDark ? "#94a3b8" : "#6b7280"}
        style={[styles.searchInput, { color: theme.text }]}
        returnKeyType="search"
      />
      {showClear ? (
        <TouchableOpacity onPress={onClear} accessibilityLabel="Clear search">
          <Text style={styles.clearText}>×</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  clearText: {
    fontSize: 20,
    lineHeight: 20,
    color: "#94a3b8",
    paddingHorizontal: 4,
  },
});
