import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import UnreadBadge from "./UnreadBadge";
import { useRouter } from "expo-router";

export default function NotificationBell({
  unreadCount,
}: {
  unreadCount: number;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.push("/notifications")}>
      <Ionicons name="notifications-outline" size={24} />
      {unreadCount > 0 && <UnreadBadge count={unreadCount} />}
    </TouchableOpacity>
  );
}
