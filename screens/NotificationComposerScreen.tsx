import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function NotificationComposerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Send Notification</Text>

      <TextInput style={styles.input} placeholder="Title" />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Message" multiline />

      <TouchableOpacity
        style={styles.button}
        onPress={() => Alert.alert("Sent", "Cooldown logic will be added later")}
      >
        <Text style={styles.buttonText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 10, marginBottom: 12 },
  textArea: { height: 100 },
  button: { backgroundColor: "#2563eb", padding: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" }
});
