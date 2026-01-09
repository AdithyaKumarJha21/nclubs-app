import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text } from "react-native";

type Props = {
  id: string;
  name: string;
  logo: string;
};

export default function ClubCard({ id, name, logo }: Props) {
  const router = useRouter();

  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/club-profile",
          params: { clubId: id },
        })
      }
    >
      <Image source={{ uri: logo }} style={styles.logo} />
      <Text style={styles.name}>{name}</Text>
    </Pressable>
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
