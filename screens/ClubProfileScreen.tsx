import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ClubGallery from "../components/ClubGallery";
import EditableTextSection from "../components/EditableTextSection";
import UploadedFilesList from "../components/UploadedFilesList";
import UploadFileSection from "../components/UploadFileSection";
import { useEditMode } from "../hooks/useEditMode";

export default function ClubProfileScreen() {
  const {
    isEditing,
    startEdit,
    cancelEdit,
    saveEdit,
  } = useEditMode();

  const [about, setAbout] = useState(
    "The Tech Club focuses on innovation, coding, and building real-world projects through teamwork and hands-on learning."
  );

  const [whatToExpect, setWhatToExpect] = useState(
    "• Weekly workshops\n• Hackathons & competitions\n• Guest lectures\n• Team projects"
  );

  const [achievements, setAchievements] = useState(
    "• Winners of XYZ Hackathon\n• Hosted 10+ workshops\n• 500+ active members"
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.clubName}>Tech Club</Text>

      {/* Edit / Save / Cancel buttons */}
      {isEditing ? (
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 20 }}>
          <TouchableOpacity onPress={saveEdit}>
            <Text style={{ color: "green", fontWeight: "600" }}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={cancelEdit}>
            <Text style={{ color: "red", fontWeight: "600" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={startEdit} style={{ marginBottom: 20 }}>
          <Text style={{ color: "blue", fontWeight: "600" }}>Edit</Text>
        </TouchableOpacity>
      )}

      {/* About Us */}
      <View style={styles.section}>
        <EditableTextSection
          title="About Us"
          value={about}
          isEditing={isEditing}
          onChange={setAbout}
        />
      </View>

      {/* What to Expect */}
      <View style={styles.section}>
        <EditableTextSection
          title="What to Expect"
          value={whatToExpect}
          isEditing={isEditing}
          onChange={setWhatToExpect}
        />
      </View>

      {/* Achievements */}
      <View style={styles.section}>
        <EditableTextSection
          title="Achievements"
          value={achievements}
          isEditing={isEditing}
          onChange={setAchievements}
        />
      </View>

      {/* Gallery */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gallery</Text>
        <ClubGallery />
      </View>

      {/* Uploaded Files */}
      <UploadedFilesList />

      {/* Upload Section (Faculty) */}
      <UploadFileSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#ffffff",
  },
  clubName: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
});
