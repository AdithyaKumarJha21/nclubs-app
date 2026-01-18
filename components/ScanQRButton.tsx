import { TouchableOpacity, Text } from "react-native";

export default function ScanQRButton({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <TouchableOpacity>
      <Text>Scan QR for Attendance</Text>
    </TouchableOpacity>
  );
}
