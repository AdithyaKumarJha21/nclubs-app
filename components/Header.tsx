import { View, StyleSheet } from "react-native";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";

export default function Header() {
  return (
    <View style={styles.container}>
      <View style={styles.rightIcons}>
        <NotificationBell unreadCount={3} />
        <ProfileMenu />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  rightIcons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
  },
});
