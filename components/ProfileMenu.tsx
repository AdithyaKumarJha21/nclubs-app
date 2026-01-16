import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function ProfileMenu() {
  const router = useRouter();

  return (
    <View style={styles.menu}>
      <TouchableOpacity onPress={() => router.push("/edit-profile")}>
        <Text>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/change-password")}>
        <Text>Change Password</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/calendar")}>
        <Text>Calendar</Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text>Dark Mode</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/login")}>
        <Text>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    top: 50,
    right: 16,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    elevation: 5,
  },
});
