import { useEffect } from "react";
import { View } from "react-native";
import AndroidFlagSecure from "react-native-android-flag-secure";

export default function QRScreen({ secureScreen }) {
  useEffect(() => {
    if (secureScreen) {
      AndroidFlagSecure.enable();
    }

    return () => {
      AndroidFlagSecure.disable();
    };
  }, [secureScreen]);

  return <View />;
}

