import { TouchableOpacity, Text, View } from "react-native";

export default function QRActionButtons({
  canGenerate,
  canDisable,
}: {
  canGenerate: boolean;
  canDisable: boolean;
}) {
  return (
    <View>
      {canGenerate && (
        <TouchableOpacity>
          <Text>Generate QR</Text>
        </TouchableOpacity>
      )}

      {canDisable && (
        <TouchableOpacity>
          <Text>Disable QR</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
