import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function ProfileMenu() {
  return (
    <View style={styles.menu}>
      <Link href="/edit-profile" asChild>
        <TouchableOpacity>
          <Text>Edit Profile</Text>
        </TouchableOpacity>
      </Link>

      <Link href="/change-password" asChild>
        <TouchableOpacity>
          <Text>Change Password</Text>
        </TouchableOpacity>
      </Link>

      <Link href="/calendar" asChild>
        <TouchableOpacity>
          <Text>Calendar</Text>
        </TouchableOpacity>
      </Link>

      <TouchableOpacity>
        <Text>Dark Mode</Text>
      </TouchableOpacity>

      <Link href="/login" replace asChild>
        <TouchableOpacity>
          <Text>Logout</Text>
        </TouchableOpacity>
      </Link>
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
