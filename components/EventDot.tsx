import { View } from "react-native";

export default function EventDot({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        marginHorizontal: 1,
      }}
    />
  );
}
