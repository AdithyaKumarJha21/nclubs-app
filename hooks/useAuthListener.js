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
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch profile from 'profiles' table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        let safeProfile = profile;
        if (!profile) {
          // Auto-insert default profile if missing
          await supabase.from('profiles').insert({
            id: session.user.id,
            email: session.user.email,
            name: '',
            usn: '',
            role: 'student',
          });
          // Re-fetch
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          safeProfile = newProfile;
        }
        // Normalize
        setUser({
          id: safeProfile?.id ?? '',
          email: safeProfile?.email ?? '',
          name: safeProfile?.name ?? '',
          usn: safeProfile?.usn ?? '',
          role: safeProfile?.role ?? 'student',
        });
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
