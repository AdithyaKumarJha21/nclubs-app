import { ScrollView, StyleSheet, Text, View } from "react-native";
import ClubGallery from "../components/ClubGallery"; // B’s component (safe import)

export default function ClubProfileScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.clubName}>Tech Club</Text>

      {/* About Us */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Us</Text>
        <Text style={styles.sectionText}>
          The Tech Club focuses on innovation, coding, and building real-world
          projects through teamwork and hands-on learning.
        </Text>
      </View>

      {/* What to Expect */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What to Expect</Text>
        <Text style={styles.sectionText}>
          • Weekly workshops{"\n"}
          • Hackathons & competitions{"\n"}
          • Guest lectures{"\n"}
          • Team projects
        </Text>
      </View>

      {/* Achievements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <Text style={styles.sectionText}>
          • Winners of XYZ Hackathon{"\n"}
          • Hosted 10+ workshops{"\n"}
          • 500+ active members
        </Text>
      </View>

      {/* Gallery (B’s work) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gallery</Text>
        <ClubGallery />
      </View>
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
