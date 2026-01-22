// services/supabase.ts
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = "https://fmwcvyjtoszpjbphnsoh.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_xB_6Jh8J4O_Cv1m8-JkBsA_VtH1jOJO";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // no AsyncStorage here (avoids window error during web/SSR)
    autoRefreshToken: true,
    persistSession: false, // since we're not storing it anywhere
    detectSessionInUrl: false,
  },
});
