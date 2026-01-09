import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../theme/ThemeContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Stack>
          {/* Entry / splash screen */}
          <Stack.Screen
            name="index"
            options={{ title: "Welcome" }}
          />

          {/* AuthStack */}
          <Stack.Screen
            name="login"
            options={{ title: "Login" }}
          />
          <Stack.Screen
            name="signup"
            options={{ title: "Signup" }}
          />

          {/* StudentStack */}
          <Stack.Screen
            name="student-home"
            options={{ title: "Student Home" }}
          />

          {/* FacultyStack */}
          <Stack.Screen
            name="faculty-home"
            options={{ title: "Faculty Dashboard" }}
          />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
