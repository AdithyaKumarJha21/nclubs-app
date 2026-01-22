import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

const mockFiles = [
  { id: "1", name: "Rules.pdf", type: "pdf" },
  { id: "2", name: "Poster.jpg", type: "image" },
];

export default function UploadedFilesList() {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Uploaded Files</Text>

      {mockFiles.map((item) => (
        <View key={item.id} style={styles.row}>
          <MaterialIcons
            name={item.type === "pdf" ? "picture-as-pdf" : "image"}
            size={26}
            color={item.type === "pdf" ? "#dc2626" : "#2563eb"}
          />
          <Text style={styles.name}>{item.name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  name: {
    marginLeft: 12,
  },
});
