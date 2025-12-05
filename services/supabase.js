import { createClient } from '@supabase/supabase-js';

// ✅ Dheeraj's Supabase project (from C's backend setup)
const SUPABASE_URL = "https://fmwcvyjtoszpjbphnsoh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtd2N2eWp0b3N6cGpicGhuc29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTg3MjQsImV4cCI6MjA4MDQzNDcyNH0.ZiCNgQzOGLMtXCGZVgzBcOHLuXF39DmrGBhPSYZqq4g";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

