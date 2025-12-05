import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* First screen (for now) */}
      <Stack.Screen
        name="index"
        options={{ title: "Welcome" }}
      />

      {/* Our custom screens */}
      <Stack.Screen
        name="login"
        options={{ title: "Login" }}
      />
      <Stack.Screen
        name="student-home"
        options={{ title: "Student Home" }}
      />
      <Stack.Screen
        name="faculty-home"
        options={{ title: "Faculty Dashboard" }}
      />
    </Stack>
  );
}
