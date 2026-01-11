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
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { event_id, student_id } = await req.json();

  const key = `scan:${event_id}:${student_id}`;
  const countRes = await supabaseClient
    .from("kv")
    .select("value")
    .eq("key", key)
    .single();

  if (countRes.data?.value >= 1) {
    return new Response("Too many requests", { status: 429 });
  }

  const insert = await supabaseClient.from("attendance").insert({
    event_id,
    student_id,
  });

  if (insert.error) {
    return new Response(JSON.stringify(insert.error), { status: 409 });
  }

  // store rate limit info
  await supabaseClient.from("kv").upsert({
    key,
    value: 1,
    expires_at: new Date(Date.now() + 60_000).toISOString(), // 1 minute
  });

  return new Response("Attendance marked", { status: 200 });
});
