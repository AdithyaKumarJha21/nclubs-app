import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ClubLogo from "./ClubLogo";

type Props = {
  name: string;
  logo: string;
  onPress: () => void;
};

export default function ClubCard({ name, logo, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.logoWrapper}>
        <ClubLogo logoUrl={logo} clubName={name} size={LOGO_SIZE} />
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const LOGO_SIZE = 64;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 1, // 🔥 perfect square card
    margin: 8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  name: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 6,
  },
});
