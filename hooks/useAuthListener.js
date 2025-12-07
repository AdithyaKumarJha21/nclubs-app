import { useContext, useEffect } from 'react';
import { UserContext } from '../context/UserContext';
import { supabase } from '../services/supabase';

const useAuthListener = () => {
  const ctx = useContext(UserContext);

  if (!ctx) {
    console.warn('UserContext is not initialized');
    return;
  }

  const { setUser } = ctx;

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [setUser]);
};

export default useAuthListener;
