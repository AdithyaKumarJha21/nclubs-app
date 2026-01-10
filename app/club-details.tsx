import { useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Alert, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { UserContext } from "../context/UserContext";
import { getClubDetails } from "../services/clubDetails";
import { updateClubSection } from "../services/clubSections";

export default function ClubDetails() {
  const { clubId } = useLocalSearchParams();
  const [details, setDetails] = useState(null);
  const [editing, setEditing] = useState(null);
  const ctx = useContext(UserContext);
  const isFaculty = ctx?.user?.role_id === "STAFF_ROLE_UUID" || ctx?.user?.role_id === "ADMIN_ROLE_UUID";

  useEffect(() => {
    if (clubId) {
      getClubDetails(clubId).then(setDetails).catch(console.error);
    }
  }, [clubId]);

  const handleEdit = (section) => {
    setEditing(section);
  };

  const handleSave = async () => {
    try {
      await updateClubSection({
        id: editing.id,
        title: editing.title,
        content: editing.content,
        order_index: editing.order_index,
      });
      setEditing(null);
      // Refresh details
      getClubDetails(clubId).then(setDetails);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  if (!details) return <Text>Loading...</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{details.club.name}</Text>
      <Text style={styles.description}>{details.club.description}</Text>

      <Text style={styles.sectionTitle}>Sections</Text>
      {details.sections.map((section) => (
        <View key={section.id} style={styles.section}>
          {editing?.id === section.id ? (
            <>
              <TextInput
                style={styles.input}
                value={editing.title}
                onChangeText={(text) => setEditing({ ...editing, title: text })}
                placeholder="Title"
              />
              <TextInput
                style={styles.input}
                value={editing.content}
                onChangeText={(text) => setEditing({ ...editing, content: text })}
                placeholder="Content"
                multiline
              />
              <TouchableOpacity style={styles.button} onPress={handleSave}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitleText}>{section.title}</Text>
              <Text>{section.content}</Text>
              {isFaculty && (
                <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(section)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      ))}

      <Text style={styles.sectionTitle}>Gallery</Text>
      <FlatList
        data={details.gallery}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <Image source={{ uri: item }} style={styles.image} />}
        horizontal
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "bold" },
  description: { fontSize: 16, marginVertical: 10 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginTop: 20 },
  section: { marginVertical: 10, padding: 10, backgroundColor: "#f9f9f9" },
  sectionTitleText: { fontSize: 18, fontWeight: "bold" },
  input: { borderWidth: 1, padding: 8, marginVertical: 5, borderColor: "#ccc" },
  button: { backgroundColor: "#28a745", padding: 10, borderRadius: 5, marginTop: 10 },
  buttonText: { color: "white", textAlign: "center" },
  editButton: { marginTop: 10 },
  editText: { color: "#007bff" },
  image: { width: 100, height: 100, margin: 5 },
});