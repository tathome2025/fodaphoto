const viteEnv = import.meta.env || {};
const runtimeConfig = window.GaragePhotoWorkbenchConfig || {};

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = `${value || ""}`.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) {
    return false;
  }
  return fallback;
}

export const appConfig = {
  supabaseUrl: viteEnv.VITE_SUPABASE_URL || runtimeConfig.supabaseUrl || runtimeConfig.VITE_SUPABASE_URL || "",
  supabasePublishableKey: viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || runtimeConfig.supabasePublishableKey || runtimeConfig.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  storageBucket: viteEnv.VITE_SUPABASE_STORAGE_BUCKET || runtimeConfig.storageBucket || runtimeConfig.VITE_SUPABASE_STORAGE_BUCKET || "garage-originals",
  timezone: viteEnv.VITE_APP_TIMEZONE || runtimeConfig.timezone || runtimeConfig.VITE_APP_TIMEZONE || "Asia/Hong_Kong",
  imageTransformEnabled: parseBoolean(
    viteEnv.VITE_SUPABASE_IMAGE_TRANSFORM_ENABLED
    ?? runtimeConfig.imageTransformEnabled
    ?? runtimeConfig.VITE_SUPABASE_IMAGE_TRANSFORM_ENABLED,
    false
  ),
};

export const isSupabaseConfigured = Boolean(
  appConfig.supabaseUrl && appConfig.supabasePublishableKey
);
