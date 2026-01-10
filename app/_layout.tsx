import { Slot, Stack } from "expo-router";
import { useEffect } from "react";
import UserProvider from "../context/UserContext";
import useAuthListener from "../hooks/useAuthListener";

export default function RootLayout() {
  useAuthListener(); // Must run OUTSIDE UserProvider

  useEffect(() => {
    // Temporarily disabled for Expo Go compatibility
    // initOneSignal();
    // registerDeviceForPush();
  }, []);

  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Slot />
      </Stack>
    </UserProvider>
  );
}
