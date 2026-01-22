import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  name: string;
  logo: string;
  onPress: () => void;
};

export default function ClubCard({ name, logo, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.logoWrapper}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.logo} />
        ) : null}
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

  // Circular container (prevents empty image issues)
  logoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    backgroundColor: "#f1f5f9", // fallback bg
  },

  logo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  name: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 6,
  },
});
