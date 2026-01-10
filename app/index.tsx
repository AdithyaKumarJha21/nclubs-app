import { useContext } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { UserContext } from "../context/UserContext";

export default function Index() {
  const ctx = useContext(UserContext);

  // If provider not mounted yet, fall back safely
  if (!ctx) return <Redirect href="/(auth)/login" />;

  const { user, loading } = ctx as any;

  // ✅ Wait for session restore / profile fetch
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // No user → auth route
  if (!user) return <Redirect href="/(auth)/login" />;

  // Support both role formats safely
  const role = user.role ?? user.role_name ?? "";

  return (
    <Redirect
      href={
        role === "student"
          ? "/(student)/home"
          : "/(faculty)/dashboard"
      }
    />
  );
}
