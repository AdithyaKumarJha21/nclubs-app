import { getSupabaseConfig } from "../services/supabaseConfig";

type PingResult = {
  ok: boolean;
  status?: number;
  error?: string;
};

export type NetworkDiagnosticsResult = {
  google: PingResult;
  supabaseRest: PingResult;
  session: {
    error?: string;
    hasSession: boolean;
  };
};

const createPingResult = async (url: string): Promise<PingResult> => {
  try {
    const response = await fetch(url);
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
};

export const runNetworkDiagnostics =
  async (): Promise<NetworkDiagnosticsResult> => {
    const { url: supabaseUrl } = getSupabaseConfig({ allowInvalid: true });
    const supabaseRestUrl = supabaseUrl
      ? `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/`
      : "";

    const [google, supabaseRest] = await Promise.all([
      createPingResult("https://www.google.com"),
      supabaseRestUrl
        ? createPingResult(supabaseRestUrl)
        : Promise.resolve({
            ok: false,
            error: "Supabase URL is missing.",
          }),
    ]);

    const { supabase } = await import("../services/supabase");
    const { data, error } = await supabase.auth.getSession();

    return {
      google,
      supabaseRest,
      session: {
        hasSession: Boolean(data.session),
        error: error?.message,
      },
    };
  };

export const logStartupDiagnostics = async (): Promise<void> => {
  const { url, anonKey, extra } = getSupabaseConfig({ allowInvalid: true });
  const hostname = (() => {
    try {
      return url ? new URL(url).hostname : "missing";
    } catch {
      return "invalid-url";
    }
  })();
  const anonKeyLength = anonKey ? anonKey.length : 0;
  const supabaseRestUrl = url ? `${url.replace(/\/+$/, "")}/rest/v1/` : "";

  console.info("[Diagnostics] Supabase hostname:", hostname);
  console.info("[Diagnostics] Supabase anon key length:", anonKeyLength);
  console.info("[Diagnostics] Expo extra config:", extra);

  const [google, supabaseRest] = await Promise.all([
    createPingResult("https://www.google.com"),
    supabaseRestUrl
      ? createPingResult(supabaseRestUrl)
      : Promise.resolve({
          ok: false,
          error: "Supabase URL is missing.",
        }),
  ]);

  console.info("[Diagnostics] Ping google:", google);
  console.info("[Diagnostics] Ping supabase rest:", supabaseRest);
};
