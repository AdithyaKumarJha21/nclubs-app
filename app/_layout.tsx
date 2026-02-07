import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { logStartupDiagnostics } from "../utils/NetworkDiagnostics";

function AppStack() {
  const { loading } = useAuth();

  // 🔐 CRITICAL: block rendering until auth resolved
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Welcome" }} />
      <Stack.Screen name="login" options={{ title: "Login" }} />
      <Stack.Screen name="signup" options={{ title: "Signup" }} />

      <Stack.Screen name="student-home" options={{ title: "Student Home" }} />
      <Stack.Screen name="faculty-home" options={{ title: "Faculty Dashboard" }} />
      <Stack.Screen
        name="president-home"
        options={{ title: "President Dashboard" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const didLogDiagnostics = useRef(false);

  useEffect(() => {
    if (didLogDiagnostics.current) {
      return;
    }
    didLogDiagnostics.current = true;
    void logStartupDiagnostics();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppStack />
      </ThemeProvider>
    </AuthProvider>
  );
}
