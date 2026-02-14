import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../services/supabase";
import { extractRoleName, isValidEmail } from "../utils/auth";

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    signedOut?: string;
    reason?: string;
    email?: string;
  }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const floatPrimary = useRef(new Animated.Value(0)).current;
  const floatSecondary = useRef(new Animated.Value(0)).current;

  const topMessage = useMemo(() => {
    if (params.reason === "password_reset") {
      return "Password updated. Log in with your password.";
    }

    if (params.signedOut === "1" || params.reason === "signed_out") {
      return "You have been signed out.";
    }

    return null;
  }, [params.reason, params.signedOut]);

  useEffect(() => {
    if (typeof params.email === "string" && params.email.trim()) {
      setEmail(params.email.trim().toLowerCase());
    }
  }, [params.email]);

  useEffect(() => {
    const createFloatingLoop = (
      value: Animated.Value,
      duration: number
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
      );

    const primaryLoop = createFloatingLoop(floatPrimary, 4600);
    const secondaryLoop = createFloatingLoop(floatSecondary, 5200);

    primaryLoop.start();
    secondaryLoop.start();

    return () => {
      primaryLoop.stop();
      secondaryLoop.stop();
    };
  }, [floatPrimary, floatSecondary]);

  const primaryFloatTranslate = floatPrimary.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 12],
  });

  const secondaryFloatTranslate = floatSecondary.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -12],
  });

  const handleLoginPress = async () => {
    setErrorMessage(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user?.id) {
      setErrorMessage("Invalid email or password");
      setIsSubmitting(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("roles(name)")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      setErrorMessage("Unable to determine user role.");
      await supabase.auth.signOut({ scope: "local" });
      setIsSubmitting(false);
      return;
    }

    const role = extractRoleName(profile);

    if (role === "faculty" || role === "admin") {
      await supabase.auth.signOut({ scope: "local" });
      const message = "Faculty cannot login here. Please use the 'Login as Faculty' option.";
      setErrorMessage(message);
      Alert.alert("Access restricted", message);
      setIsSubmitting(false);
      return;
    }

    console.log("[auth] login success", { userId: data.user.id });
    const destination = role === "president" ? "/president-home" : "/student-home";
    router.replace(destination);
    setIsSubmitting(false);
  };

  const handleRegisterPress = () => {
    router.push("/signup");
  };

  const handleForgotPasswordPress = () => {
    router.push("/forgot-password");
  };

  const handleFacultyLoginPress = () => {
    router.push("/faculty-login");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.background}>
        <Animated.View
          style={[
            styles.shape,
            styles.topBlob,
            { transform: [{ translateY: primaryFloatTranslate }] },
          ]}
        />
        <Animated.View
          style={[
            styles.shape,
            styles.midBlob,
            { transform: [{ translateY: secondaryFloatTranslate }] },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            styles.ringTop,
            { transform: [{ translateY: secondaryFloatTranslate }] },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            styles.ringBottom,
            { transform: [{ translateY: primaryFloatTranslate }] },
          ]}
        />
        <View style={styles.noiseDot} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.brand}>N-CLUB</Text>
          <Text style={styles.title}>Manage your campus clubs</Text>
          <Text style={styles.subtitle}>Streamline club events, attendance, and communication in one place.</Text>
          {topMessage ? <Text style={styles.info}>{topMessage}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@nmit.ac.in"
              placeholderTextColor="#9f9487"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordField}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter password"
                placeholderTextColor="#9f9487"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                onPress={() => setIsPasswordVisible((prev) => !prev)}
                accessibilityLabel={
                  isPasswordVisible ? "Hide password" : "Show password"
                }
                style={styles.passwordToggle}
                disabled={isSubmitting}
              >
                <Ionicons
                  name={isPasswordVisible ? "eye-off" : "eye"}
                  size={20}
                  color="#8a7f73"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={handleForgotPasswordPress}>
            <Text style={styles.link}>Forgot Password?</Text>
          </TouchableOpacity>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLoginPress}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleRegisterPress}>
              <Text style={styles.link}>New user? Register</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleFacultyLoginPress}>
              <Text style={styles.link}>Login as Faculty</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ece5dd",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollBody: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: "#f8f2eb",
    borderRadius: 30,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e9ddd1",
    shadowColor: "#6d5f52",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  brand: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#3f3a35",
  },
  title: {
    fontSize: 37,
    fontWeight: "700",
    color: "#2f2b27",
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 16,
    color: "#59514a",
    lineHeight: 22,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3a342f",
  },
  input: {
    borderWidth: 1,
    borderColor: "#baaea1",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#2f2b27",
    backgroundColor: "#fffaf4",
  },
  passwordField: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    paddingRight: 40,
  },
  passwordToggle: {
    position: "absolute",
    right: 10,
    padding: 4,
  },
  loginButton: {
    backgroundColor: "#e96452",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  info: {
    color: "#8b5b52",
    fontSize: 13,
  },
  error: {
    color: "#d3302f",
    fontSize: 13,
  },
  actionRow: {
    marginTop: 6,
    gap: 8,
  },
  link: {
    color: "#e46350",
    fontSize: 13,
    fontWeight: "600",
  },
  shape: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.9,
  },
  topBlob: {
    width: 270,
    height: 270,
    top: -40,
    right: -90,
    backgroundColor: "#ef6d5a",
  },
  midBlob: {
    width: 220,
    height: 220,
    bottom: -50,
    left: -60,
    backgroundColor: "#f48a79",
  },
  ring: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1.2,
    borderColor: "rgba(233, 84, 70, 0.45)",
  },
  ringTop: {
    top: 120,
    right: -130,
  },
  ringBottom: {
    bottom: 80,
    left: -150,
  },
  noiseDot: {
    position: "absolute",
    top: 170,
    left: 20,
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(58, 52, 47, 0.55)",
  },
});
