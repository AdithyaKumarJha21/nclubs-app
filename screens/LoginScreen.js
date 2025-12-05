import { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { loginUser } from "../services/auth";
import { supabase } from "../services/supabase";
import { UserContext } from "../context/UserContext";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setUser } = useContext(UserContext);

  async function handleLogin() {
    setError("");
    const { data, error } = await loginUser(email, password);

    if (error) return setError(error.message);

    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .single();

    setUser(profile);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput style={styles.input} placeholder="Email" onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry onChangeText={setPassword} />

      {error.length > 0 && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.btnText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
        <Text style={styles.link}>Create an account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  input: { borderWidth: 1, padding: 12, marginVertical: 8, borderRadius: 8 },
  button: { backgroundColor: "#0066FF", padding: 14, marginTop: 10, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  error: { color: "red", marginTop: 5 },
  link: { color: "#555", textAlign: "center", marginTop: 12 }
});
