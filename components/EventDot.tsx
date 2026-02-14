import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export default function EventDot({ color, pulsing = false }: { color: string; pulsing?: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulsing) {
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.5,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [pulse, pulsing]);

  return (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        marginHorizontal: 1,
        transform: [{ scale: pulse }],
      }}
    />
  );
}
