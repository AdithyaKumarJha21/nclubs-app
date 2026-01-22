import { Button } from "react-native";

export default function ActionButton({ visible, label }) {
  if (!visible) return null;
  return <Button title={label} />;
}
