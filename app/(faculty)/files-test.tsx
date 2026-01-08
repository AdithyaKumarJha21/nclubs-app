import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { uploadClubFile, listClubFiles } from "../../services/clubFiles";

export default function FilesTest() {
  const [out, setOut] = useState<string>("");

  const clubId = "YOUR_CLUB_ID";

  async function pickAndUpload() {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });

    if (res.canceled) return;

    const f = res.assets[0];

    try {
      const uploaded = await uploadClubFile({
        clubId,
        file: { uri: f.uri, name: f.name, mimeType: f.mimeType ?? "application/octet-stream" },
        title: f.name,
      });
      setOut("Uploaded: " + uploaded.path);
    } catch (e: any) {
      setOut("Error: " + e.message);
    }
  }

  async function load() {
    try {
      const files = await listClubFiles(clubId);
      setOut(JSON.stringify(files, null, 2));
    } catch (e: any) {
      setOut("Error: " + e.message);
    }
  }

  return (
    <View style={{ padding: 16 }}>
      <TouchableOpacity onPress={pickAndUpload}>
        <Text style={{ padding: 12, backgroundColor: "#eee" }}>Upload File</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={load}>
        <Text style={{ padding: 12, backgroundColor: "#eee", marginTop: 12 }}>List Files</Text>
      </TouchableOpacity>

      <Text style={{ marginTop: 16 }}>{out}</Text>
    </View>
  );
}
