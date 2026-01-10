import { Stack } from "expo-router";
import { useEffect } from "react";
import UserProvider from "../context/UserContext";
import useAuthListener from "../hooks/useAuthListener";

function RootNav() {
  // ✅ Must run inside UserProvider if it reads/sets context
  useAuthListener();

  useEffect(() => {
    // Temporarily disabled for Expo Go compatibility
    // initOneSignal();
    // registerDeviceForPush();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <UserProvider>
      <RootNav />
    </UserProvider>
  );
}
