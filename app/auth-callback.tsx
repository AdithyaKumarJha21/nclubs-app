import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { supabase } from "../services/supabase";

type RoleRow = {
  name: "student" | "faculty" | "president" | "admin";
};

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [statusText, setStatusText] = useState("Confirming…");

  useEffect(() => {
    const resolveAuthCallback = async () => {
      const callbackUrl = await Linking.getInitialURL();

      if (callbackUrl) {
        console.log("[auth-callback] received URL", callbackUrl);

        const parsed = Linking.parse(callbackUrl);
        const code = parsed.queryParams?.code;

        if (typeof code === "string") {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error(
              "[auth-callback] exchangeCodeForSession error",
              exchangeError.message
            );
          } else {
            console.log("[auth-callback] exchangeCodeForSession success");
          }
        }
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("[auth-callback] getSession error", error.message);
        setStatusText("Email confirmed. Please log in.");
        return;
      }

      if (!session?.user) {
        console.log("[auth-callback] no session after confirmation");
        setStatusText("Email confirmed. Please log in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("roles(name)")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile?.roles) {
        console.warn("[auth-callback] role lookup failed, sending to login", {
          message: profileError?.message,
        });
        router.replace("/login");
        return;
      }

      const roleRow = Array.isArray(profile.roles)
        ? (profile.roles[0] as RoleRow)
        : (profile.roles as RoleRow);

      if (roleRow?.name === "president") {
        router.replace("/president-home");
        return;
      }

      if (roleRow?.name === "faculty" || roleRow?.name === "admin") {
        router.replace("/faculty-login");
        return;
      }

      router.replace("/student-home");
    };

    resolveAuthCallback();
  }, [router]);

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
