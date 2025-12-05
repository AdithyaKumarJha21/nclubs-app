import { useEffect, useContext } from "react";
import { supabase } from "../services/supabase";
import { UserContext } from "../context/UserContext";

export default function useAuthListener() {
  const { setUser } = useContext(UserContext);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);
}
