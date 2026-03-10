import { appConfig, isSupabaseConfigured } from "./config.js";

const hasSupabaseBrowserClient = Boolean(window.supabase?.createClient);

export const supabase = isSupabaseConfigured
  && hasSupabaseBrowserClient
  ? window.supabase.createClient(appConfig.supabaseUrl, appConfig.supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function assertSupabaseConfigured() {
  if (!hasSupabaseBrowserClient) {
    throw new Error("Supabase 瀏覽器 client 未載入。");
  }
  if (!supabase) {
    throw new Error("尚未設定 Supabase URL 或 Publishable Key。");
  }
  return supabase;
}

export async function getSession() {
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export async function getCurrentUser() {
  if (!supabase) {
    return null;
  }

  const session = await getSession();
  if (session?.user) {
    return session.user;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    const message = error.message || "";
    if (/session/i.test(message) || /jwt/i.test(message)) {
      return null;
    }
    throw error;
  }
  return data.user || null;
}

export async function requireAuthenticatedPage(redirectHref = "../index.html") {
  if (!supabase) {
    const url = new URL(redirectHref, window.location.href);
    url.searchParams.set("error", "missing-config");
    window.location.href = url.toString();
    throw new Error("Supabase 未設定。");
  }

  const user = await getCurrentUser();
  if (!user) {
    const url = new URL(redirectHref, window.location.href);
    url.searchParams.set("error", "no-session");
    window.location.href = url.toString();
    throw new Error("尚未登入。");
  }
  return user;
}

export async function signInWithPassword(email, password) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signOut() {
  const client = assertSupabaseConfigured();
  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

export function onAuthStateChange(callback) {
  if (!supabase) {
    return { data: { subscription: { unsubscribe() {} } } };
  }
  return supabase.auth.onAuthStateChange(callback);
}
