import { Image, ScrollView, StyleSheet, View } from "react-native";

const images = [
  "https://picsum.photos/300/200?1",
  "https://picsum.photos/300/200?2",
  "https://picsum.photos/300/200?3",
];

export default function ClubGallery() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {images.map((uri, index) => (
        <View key={index} style={styles.imageWrapper}>
          <Image source={{ uri }} style={styles.image} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  imageWrapper: {
    marginRight: 12,
  },
  image: {
    width: 240,
    height: 150,
    borderRadius: 12,
  },
});
