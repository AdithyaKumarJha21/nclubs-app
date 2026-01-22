import { View, Text, TextInput, TouchableOpacity } from "react-native";

export default function EventRegistrationModal({
  visible,
}: {
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <View style={{ padding: 16 }}>
      <Text>Email</Text>
      <TextInput placeholder="you@nmit.ac.in" />

      <Text>USN</Text>
      <TextInput placeholder="1NMxx..." />

      <TouchableOpacity>
        <Text>Register</Text>
      </TouchableOpacity>
    </View>
  );
}
