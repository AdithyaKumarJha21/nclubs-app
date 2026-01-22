import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function UploadFileSection() {
  const [file, setFile] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!result.canceled) setFile(result.assets[0]);
  };

  const handleUpload = () => {
    if (!file) {
      Alert.alert("Error", "Please choose a file");
      return;
    }
    Alert.alert("Success", "Mock upload completed");
    setFile(null);
    setTitle("");
    setDescription("");
  };

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Upload File</Text>

      <TouchableOpacity style={styles.button} onPress={pickFile}>
        <Text style={styles.buttonText}>
          {file ? "Change File" : "Choose File"}
        </Text>
      </TouchableOpacity>

      {file && <Text style={styles.fileName}>{file.name}</Text>}

      <TextInput style={styles.input} placeholder="Optional title" value={title} onChangeText={setTitle} />
      <TextInput style={[styles.input, styles.textArea]} placeholder="Optional description" value={description} onChangeText={setDescription} multiline />

      <TouchableOpacity style={[styles.button, styles.upload]} onPress={handleUpload}>
        <Text style={styles.buttonText}>Upload</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 24, padding: 16, backgroundColor: "#f9fafb", borderRadius: 12 },
  heading: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  button: { backgroundColor: "#2563eb", padding: 12, borderRadius: 8, alignItems: "center" },
  upload: { backgroundColor: "#16a34a", marginTop: 16 },
  buttonText: { color: "white", fontWeight: "600" },
  fileName: { marginTop: 8, fontSize: 12 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 10, marginTop: 12 },
  textArea: { height: 80 }
});
