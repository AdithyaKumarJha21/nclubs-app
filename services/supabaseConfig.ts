import Constants from "expo-constants";

export type SupabaseConfig = {
  url: string;
  anonKey: string;
  extra: Record<string, unknown> | undefined;
};

type ConfigOptions = {
  allowInvalid?: boolean;
};

const getExtra = (): Record<string, unknown> | undefined => {
  return Constants.expoConfig?.extra ?? undefined;
};

const getStringValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

const isHttpsUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const getSupabaseConfig = (
  options: ConfigOptions = {}
): SupabaseConfig => {
  const extra = getExtra();
  const url = getStringValue(
    extra?.SUPABASE_URL ??
      extra?.EXPO_PUBLIC_SUPABASE_URL ??
      process.env.EXPO_PUBLIC_SUPABASE_URL ??
      process.env.SUPABASE_URL
  );
  const anonKey = getStringValue(
    extra?.SUPABASE_ANON_KEY ??
      extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY
  );

  if (!options.allowInvalid) {
    if (!url || !anonKey) {
      throw new Error(
        "Supabase configuration is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in Expo config (extra) or EXPO_PUBLIC_* env vars."
      );
    }

    if (!isHttpsUrl(url)) {
      throw new Error(
        "Supabase URL must be a valid https:// URL. Check SUPABASE_URL in Expo config."
      );
    }
  }

  return {
    url,
    anonKey,
    extra,
  };
};
