import { NavigationContainer } from "@react-navigation/native";
import { useContext } from "react";
import AuthStack from "./AuthStack";
import StudentStack from "./StudentStack";
import FacultyStack from "./FacultyStack";
import { UserContext } from "../context/UserContext";

export default function RootNavigator() {
  const { user } = useContext(UserContext);

  if (!user) return <NavigationContainer><AuthStack /></NavigationContainer>;

  const role = user?.role || "student"; // default fallback

  return (
    <NavigationContainer>
      {role === "student" ? <StudentStack /> : <FacultyStack />}
    </NavigationContainer>
  );
}
