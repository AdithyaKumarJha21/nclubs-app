import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { listClubFiles } from "../../services/clubFiles";
import { updateClubSection } from "../../services/clubSections";

export default function RLSTest() {
  const [results, setResults] = useState<string[]>([]);

  const log = (msg: string) => {
    console.log("[RLS Test]", msg);
    setResults(prev => [...prev, msg]);
  };

  const testStudentUpdate = async () => {
    log("Testing student updateClubSection (should fail)...");
    try {
      await updateClubSection({
        id: "some-section-id", // Replace with a real section ID for testing
        title: "Test Title",
        content: "Test Content",
        order_index: 1,
      });
      log("❌ UNEXPECTED: Update succeeded (RLS not working?)");
    } catch (err: any) {
      const msg = err.message;
      if (msg === "You are not authorized to edit this club.") {
        log("✅ PASS: Correctly blocked with friendly message");
      } else {
        log(`❌ FAIL: Unexpected error: ${msg}`);
      }
    }
  };

  const testNonAssignedFacultyUpdate = async () => {
    log("Testing non-assigned faculty updateClubSection (should fail)...");
    try {
      await updateClubSection({
        id: "some-section-id", // Replace with a real section ID for testing
        title: "Test Title",
        content: "Test Content",
        order_index: 1,
      });
      log("❌ UNEXPECTED: Update succeeded (RLS not working?)");
    } catch (err: any) {
      const msg = err.message;
      if (msg === "You are not authorized to edit this club.") {
        log("✅ PASS: Correctly blocked with friendly message");
      } else {
        log(`❌ FAIL: Unexpected error: ${msg}`);
      }
    }
  };

  const testAssignedFacultyUpdate = async () => {
    log("Testing assigned faculty updateClubSection (should succeed)...");
    try {
      const result = await updateClubSection({
        id: "some-section-id", // Replace with a real section ID for testing
        title: "Test Title",
        content: "Test Content",
        order_index: 1,
      });
      log("✅ PASS: Update succeeded as expected");
    } catch (err: any) {
      log(`❌ FAIL: Update failed: ${err.message}`);
    }
  };

  const testStudentListFiles = async () => {
    log("Testing student listClubFiles (should list public files, block private if RLS correct)...");
    try {
      const files = await listClubFiles("some-club-id"); // Replace with a real club ID
      const publicFiles = files.filter(f => f.bucket === "club_public");
      const privateFiles = files.filter(f => f.bucket === "club_private");
      log(`✅ Listed ${files.length} total files: ${publicFiles.length} public, ${privateFiles.length} private`);
      if (privateFiles.length === 0) {
        log("✅ PASS: No private files listed (RLS working)");
      } else {
        log("❌ FAIL: Private files were listed (RLS not working?)");
      }
    } catch (err: any) {
      log(`❌ FAIL: List failed: ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RLS Test Suite</Text>
      <Text style={styles.note}>
        Ensure you are logged in as the appropriate user before running each test.
        Replace placeholder IDs with real ones for accurate testing.
      </Text>

      <TouchableOpacity style={styles.button} onPress={testStudentUpdate}>
        <Text style={styles.buttonText}>Test Student Update (Login as Student)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testNonAssignedFacultyUpdate}>
        <Text style={styles.buttonText}>Test Non-Assigned Faculty Update (Login as Faculty not assigned to club)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testAssignedFacultyUpdate}>
        <Text style={styles.buttonText}>Test Assigned Faculty Update (Login as Faculty assigned to club)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testStudentListFiles}>
        <Text style={styles.buttonText}>Test Student List Files (Login as Student)</Text>
      </TouchableOpacity>

      <Text style={styles.resultsTitle}>Results:</Text>
      {results.map((r, i) => (
        <Text key={i} style={styles.result}>{r}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  note: { fontSize: 14, color: "#666", marginBottom: 20 },
  button: { backgroundColor: "#007bff", padding: 12, borderRadius: 8, marginBottom: 10 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "bold" },
  resultsTitle: { fontSize: 18, fontWeight: "bold", marginTop: 20, marginBottom: 10 },
  result: { fontSize: 14, marginBottom: 5 },
});