import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../theme/ThemeContext";

function AppStack() {
  const { loading } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const logInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();

      if (isMounted && initialUrl) {
        console.log("[deep-link] initial URL", initialUrl);
      }
    };

    logInitialUrl();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      console.log("[deep-link] received URL", url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

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
      <Stack.Screen name="faculty-login" options={{ title: "Faculty Login" }} />
      <Stack.Screen name="signup" options={{ title: "Signup" }} />
      <Stack.Screen name="verify-otp" options={{ title: "Verify Email" }} />
      <Stack.Screen
        name="auth-callback"
        options={{ title: "Auth Callback", headerShown: false }}
      />
      <Stack.Screen name="forgot-password" options={{ title: "Forgot Password" }} />
      <Stack.Screen name="reset-password" options={{ title: "Reset Password" }} />

      <Stack.Screen
        name="student-home"
        options={{ title: "Student Home", headerShown: false }}
      />
      <Stack.Screen
        name="faculty-home"
        options={{ title: "Faculty Dashboard", headerShown: false }}
      />
      <Stack.Screen
        name="president-home"
        options={{ title: "President Dashboard", headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppStack />
      </ThemeProvider>
    </AuthProvider>
  );
}
