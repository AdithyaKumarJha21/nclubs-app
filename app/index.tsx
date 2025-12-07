import { useContext } from "react";
import { Redirect } from "expo-router";
import { UserContext } from "../context/UserContext";

export default function Index() {
  const ctx = useContext(UserContext);

  if (!ctx) return <Redirect href="/(auth)/login" />;

  const { user } = ctx;

  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Redirect
      href={
        user.role === "student"
          ? "/(student)/home"
          : "/(faculty)/dashboard"
      }
    />
  );
}
