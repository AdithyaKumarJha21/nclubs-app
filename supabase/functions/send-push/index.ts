import "https://esm.sh/@supabase/functions-js@2/src/edge-runtime.d.ts";

declare const Deno: any;

Deno.serve(async (req: Request) => {
  try {
    const { user_id, title, body } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID")!;
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY")!;

    // Get OneSignal IDs for that user from DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const dbRes = await fetch(`${supabaseUrl}/rest/v1/user_devices?user_id=eq.${user_id}&active=eq.true&select=onesignal_id`, {
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
    });

    const devices = await dbRes.json();
    const onesignalIds = (devices || [])
      .map((d: any) => d.onesignal_id)
      .filter(Boolean);

    if (onesignalIds.length === 0) {
      return new Response(JSON.stringify({ error: "No active devices" }), { status: 404 });
    }

    // Send via OneSignal REST API
    const oneRes = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: onesignalIds,
        headings: { en: title },
        contents: { en: body },
      }),
    });

    const result = await oneRes.json();

    if (!oneRes.ok) {
      return new Response(JSON.stringify({ error: "OneSignal send failed", detail: result }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ ok: true, result }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error", detail: String(e) }), {
      status: 500,
    });
  }
});
