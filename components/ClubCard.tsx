import { Image, StyleSheet, Text, View } from "react-native";

type Props = {
  name: string;
  logo: string;
};

export default function ClubCard({ name, logo }: Props) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: logo }} style={styles.logo} />
      <Text style={styles.name}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "white",
    margin: 6,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    elevation: 3,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
    borderRadius: 30,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
