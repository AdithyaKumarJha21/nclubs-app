import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { useTheme } from "../theme/ThemeContext";

export default function EditProfileScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* ===============================
     📦 FETCH USER DATA
     =============================== */
  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setFullName(profileData?.name || "");
      setEmail(profileData?.email || "");
    } catch (error) {
      console.error("Error fetching user data:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     💾 SAVE CHANGES
     =============================== */
  const handleSave = async () => {
    if (!user) return;

    if (!fullName.trim()) {
      Alert.alert("Validation Error", "Name cannot be empty");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Validation Error", "Email cannot be empty");
      return;
    }

    try {
      setIsSaving(true);

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: fullName.trim(),
          email: email.trim(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Also update auth email if it changed
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user && authData.user.email !== email.trim()) {
        await supabase.auth.updateUser({ email: email.trim() });
      }

      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? "#1a1a1a" : "#fff" }]}>
        <Text style={{ color: isDark ? "#aaa" : "#666" }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#1a1a1a" : "#fff" }]}>
      <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
        Edit Profile
      </Text>

      {/* Full Name Input */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: isDark ? "#aaa" : "#666" }]}>
          Full Name
        </Text>
        <TextInput
          placeholder="Enter your full name"
          placeholderTextColor={isDark ? "#666" : "#ccc"}
          value={fullName}
          onChangeText={setFullName}
          style={[
            styles.input,
            {
              borderColor: isDark ? "#444" : "#ddd",
              color: isDark ? "#fff" : "#000",
              backgroundColor: isDark ? "#2a2a2a" : "#f9f9f9",
            },
          ]}
          editable={!isSaving}
        />
      </View>

      {/* Email Input */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: isDark ? "#aaa" : "#666" }]}>
          Email
        </Text>
        <TextInput
          placeholder="Enter your email"
          placeholderTextColor={isDark ? "#666" : "#ccc"}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={[
            styles.input,
            {
              borderColor: isDark ? "#444" : "#ddd",
              color: isDark ? "#fff" : "#000",
              backgroundColor: isDark ? "#2a2a2a" : "#f9f9f9",
            },
          ]}
          editable={!isSaving}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.button, { opacity: isSaving ? 0.6 : 1 }]}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  button: {
    backgroundColor: "#0066cc",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
