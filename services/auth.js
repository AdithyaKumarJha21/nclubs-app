import { supabase } from './supabase';

export async function loginUser(email, password) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signupUser(email, password) {
  return await supabase.auth.signUp({ email, password });
}

export async function logoutUser() {
  return await supabase.auth.signOut();
}
