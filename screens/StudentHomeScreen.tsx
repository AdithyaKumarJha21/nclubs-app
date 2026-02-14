import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../services/supabase";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";

export default function StudentHomeScreen() {
  const router = useRouter();
  const { theme, isDark, setIsDark } = useTheme();
  const { user, loading } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const entryAnim = useRef(new Animated.Value(0)).current;
  const heroFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) return;

    if (!user || user.role !== "student") {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloat, {
          toValue: -6,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heroFloat, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [entryAnim, heroFloat]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const actions = useMemo(
    () => [
      { title: "View Clubs", route: "/clubs", colors: ["#A7D8FF", "#8EC5FF"] as const },
      { title: "Events", route: "/student/events", colors: ["#F3EEFF", "#D8CCFF"] as const },
      {
        title: "Attendance History",
        route: "/attendance-history",
        colors: ["#EAF6FF", "#BFE7FF"] as const,
      },
    ],
    []
  );

  if (loading || !user || user.role !== "student") {
    return null;
  }

  return (
    <LinearGradient colors={["#F4F9FF", "#EAF4FF", "#F8FBFF"]} style={styles.container}>
      <View style={styles.glowOrb} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/notifications")}>
          <Ionicons name="notifications-outline" size={22} color="#1F2A44" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => setShowMenu(!showMenu)}>
          <Ionicons name="settings-outline" size={22} color="#1F2A44" />
        </TouchableOpacity>
      </View>

      {showMenu && (
        <View style={[styles.dropdown, { borderColor: theme.border || "#cbd5e1" }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              router.push("/edit-profile");
              setShowMenu(false);
            }}
          >
            <Ionicons name="person-outline" size={18} color="#1F2A44" />
            <Text style={styles.menuText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              router.push("/change-password");
              setShowMenu(false);
            }}
          >
            <Ionicons name="lock-closed-outline" size={18} color="#1F2A44" />
            <Text style={styles.menuText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              router.push("/calendar");
              setShowMenu(false);
            }}
          >
            <Ionicons name="calendar-outline" size={18} color="#1F2A44" />
            <Text style={styles.menuText}>Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setIsDark(!isDark);
            }}
          >
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color="#1F2A44" />
            <Text style={styles.menuText}>{isDark ? "Light Mode" : "Dark Mode"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutItem]}
            onPress={() => {
              setShowMenu(false);
              handleLogout();
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#dc2626" />
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: entryAnim,
              transform: [
                { translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                { scale: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
                { translateY: heroFloat },
              ],
            },
          ]}
        >
          <LinearGradient colors={["#A7D8FF", "#8EC5FF", "#C9B6FF"]} style={styles.heroGradient}>
            <Text style={styles.heroTitle}>Student Dashboard</Text>
            <Text style={styles.heroSubtitle}>Choose an option to continue.</Text>
          </LinearGradient>
        </Animated.View>

        <View style={styles.actions}>
          {actions.map((action, index) => (
            <Animated.View
              key={action.title}
              style={{
                opacity: entryAnim,
                transform: [
                  {
                    translateY: entryAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40 + index * 10, 0],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                onPress={() => router.push(action.route as never)}
                style={({ pressed }) => [styles.buttonShell, pressed && styles.buttonPressed]}
              >
                <LinearGradient colors={[...action.colors]} style={styles.button}>
                  <Text style={styles.buttonText}>{action.title}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#1F2A44" />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowOrb: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -60,
    left: -80,
    backgroundColor: "#DCEEFF",
    opacity: 0.35,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    paddingTop: 56,
    paddingHorizontal: 16,
    zIndex: 3,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  dropdown: {
    position: "absolute",
    top: 104,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#8EC5FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2A44",
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: "#dbeafe",
  },
  logoutText: {
    color: "#dc2626",
  },
  content: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 20,
  },
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#8EC5FF",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 26,
    elevation: 8,
  },
  heroGradient: {
    paddingVertical: 28,
    paddingHorizontal: 22,
    gap: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F2A44",
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#44546F",
    fontWeight: "500",
  },
  actions: {
    gap: 14,
  },
  buttonShell: {
    borderRadius: 20,
    shadowColor: "#8EC5FF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 5,
  },
  buttonPressed: {
    transform: [{ scale: 0.94 }],
  },
  button: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2A44",
  },
});
