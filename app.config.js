const appJson = require("./app.json");

const getEnvValue = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
};

module.exports = ({ config }) => {
  const baseConfig = appJson.expo ?? config;
  const SUPABASE_URL = getEnvValue(
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  );
  const SUPABASE_ANON_KEY = getEnvValue(
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  );

  return {
    ...appJson,
    expo: {
      ...baseConfig,
      extra: {
        ...(baseConfig?.extra ?? {}),
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
      },
    },
  };
};
