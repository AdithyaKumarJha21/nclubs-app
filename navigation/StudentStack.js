import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StudentHomeScreen from "../screens/StudentHomeScreen";

const Stack = createNativeStackNavigator();

export default function StudentStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StudentHome"
        component={StudentHomeScreen}
        options={{ title: "Student Dashboard" }}
      />
    </Stack.Navigator>
  );
}
