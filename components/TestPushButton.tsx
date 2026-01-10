import { Text, TouchableOpacity } from "react-native";
import { supabase } from "../services/supabase";

export default function TestPushButton() {
  async function sendTest() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Not logged in");
      return;
    }

    await fetch("https://YOUR_PROJECT_ID.functions.supabase.co/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        title: "Test",
        body: "Push working!",
      }),
    });
  }

  return (
    <TouchableOpacity onPress={sendTest}>
      <Text>Send Test Push</Text>
    </TouchableOpacity>
  );
}
