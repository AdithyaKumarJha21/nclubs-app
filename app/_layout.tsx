import { Slot, Stack } from "expo-router";
import UserProvider from "../context/UserContext";
import useAuthListener from "../hooks/useAuthListener";

export default function RootLayout() {
  useAuthListener(); // Must run OUTSIDE UserProvider

  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Slot />
      </Stack>
    </UserProvider>
  );
}
