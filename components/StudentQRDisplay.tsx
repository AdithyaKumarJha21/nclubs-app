import { TouchableOpacity, Text } from "react-native";

export default function StudentQRDisplay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <TouchableOpacity>
      <Text>Open Attendance QR</Text>
    </TouchableOpacity>
  );
}
