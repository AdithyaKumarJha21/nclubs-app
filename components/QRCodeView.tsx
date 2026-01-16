import { Button } from "react-native";

export default function ScanQRButton({ visible }) {
  if (!visible) return null;

  return <Button title="Scan QR" onPress={() => {}} />;
}