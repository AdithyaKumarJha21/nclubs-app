import { Slot, Stack } from "expo-router";
import { useEffect } from "react";
import UserProvider from "../context/UserContext";
import useAuthListener from "../hooks/useAuthListener";
import { initOneSignal, registerDeviceForPush } from "../services/notifications";

export default function RootLayout() {
  useAuthListener(); // Must run OUTSIDE UserProvider

  useEffect(() => {
    initOneSignal();
    registerDeviceForPush();
  }, []);

  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Slot />
      </Stack>
    </UserProvider>
  );
}
