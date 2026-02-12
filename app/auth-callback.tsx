import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { supabase } from "../services/supabase";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string | string[] }>();
  const [statusText, setStatusText] = useState("Processing link…");

  const callbackType = useMemo(() => {
    const paramValue = Array.isArray(params.type) ? params.type[0] : params.type;
    return (paramValue ?? "").toLowerCase();
  }, [params.type]);

  useEffect(() => {
    const resolveAuthCallback = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (callbackType === "recovery") {
        if (session?.user) {
          setStatusText("Redirecting to password reset…");
          router.replace("/reset-password");
          return;
        }

        setStatusText("Reset link opened. Please request a new OTP from Forgot Password.");
        return;
      }

      setStatusText("This link is not required for OTP login. Please return to Login.");
    };

    resolveAuthCallback();
  }, [callbackType, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={styles.text}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
    gap: 12,
  },
  text: {
    fontSize: 16,
    color: "#0f172a",
    textAlign: "center",
  },
});
