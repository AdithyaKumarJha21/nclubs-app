import UserProvider from "./context/UserContext";
import RootNavigator from "./navigation/RootNavigator";
import useAuthListener from "./hooks/useAuthListener";

export default function App() {
  useAuthListener();

  return (
    <UserProvider>
      <RootNavigator />
    </UserProvider>
  );
}
