export const appConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  storageBucket: import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "garage-originals",
  timezone: import.meta.env.VITE_APP_TIMEZONE || "Asia/Hong_Kong",
};

export const isSupabaseConfigured = Boolean(
  appConfig.supabaseUrl && appConfig.supabasePublishableKey
);
