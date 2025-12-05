import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* Entry / splash screen (we will later redirect to login) */}
      <Stack.Screen
        name="index"
        options={{ title: "Welcome" }}
      />

      {/*
        AuthStack:
        - /login
        - /signup
      */}
      <Stack.Screen
        name="login"
        options={{ title: "Login" }}
      />
      <Stack.Screen
        name="signup"
        options={{ title: "Signup" }}
      />

      {/*
        StudentStack:
        - /student-home
      */}
      <Stack.Screen
        name="student-home"
        options={{ title: "Student Home" }}
      />

      {/*
        FacultyStack:
        - /faculty-home
      */}
      <Stack.Screen
        name="faculty-home"
        options={{ title: "Faculty Dashboard" }}
      />
    </Stack>
  );
}
