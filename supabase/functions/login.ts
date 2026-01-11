// @ts-nocheck
// deno-lint-ignore-file
/// <reference lib="deno.ns" />
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

serve(async (req: Request) => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});


serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const key = `login:${ip}`;

  const res = await supabase.from("kv").select("value").eq("key", key).single();

  if (res.data?.value >= 5) {
    return new Response("Too many login attempts", { status: 429 });
  }

  // Log login attempt (you would add auth logic here)
  await supabase.from("kv").upsert({
    key,
    value: (res.data?.value ?? 0) + 1,
    expires_at: new Date(Date.now() + 60_000).toISOString(), // 1 minute
  });

  return new Response("Login allowed", { status: 200 });
});
