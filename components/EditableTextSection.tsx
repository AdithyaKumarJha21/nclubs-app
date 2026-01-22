import {
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";

type Props = {
  title: string;
  value: string;
  isEditing: boolean;
  onChange: (text: string) => void;
};

export default function EditableTextSection({
  title,
  value,
  isEditing,
  onChange,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {isEditing ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          multiline
          style={styles.input}
        />
      ) : (
        <Text style={styles.text}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  text: {
    fontSize: 14,
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#f9fafb",
  },
});
