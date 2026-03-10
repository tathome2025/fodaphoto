const viteEnv = import.meta.env || {};
const runtimeConfig = window.GaragePhotoWorkbenchConfig || {};

export const appConfig = {
  supabaseUrl: viteEnv.VITE_SUPABASE_URL || runtimeConfig.supabaseUrl || runtimeConfig.VITE_SUPABASE_URL || "",
  supabasePublishableKey: viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || runtimeConfig.supabasePublishableKey || runtimeConfig.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  storageBucket: viteEnv.VITE_SUPABASE_STORAGE_BUCKET || runtimeConfig.storageBucket || runtimeConfig.VITE_SUPABASE_STORAGE_BUCKET || "garage-originals",
  timezone: viteEnv.VITE_APP_TIMEZONE || runtimeConfig.timezone || runtimeConfig.VITE_APP_TIMEZONE || "Asia/Hong_Kong",
};

export const isSupabaseConfigured = Boolean(
  appConfig.supabaseUrl && appConfig.supabasePublishableKey
);
