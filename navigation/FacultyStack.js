import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FacultyDashboard from "../screens/FacultyDashboard";

const Stack = createNativeStackNavigator();

export default function FacultyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="FacultyDashboard" component={FacultyDashboard} />
    </Stack.Navigator>
  );
}
