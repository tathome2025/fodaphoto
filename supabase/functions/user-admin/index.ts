import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeGroup(value: unknown) {
  const normalized = `${value || ""}`.trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  return normalized === "supreadmin" ? "superadmin" : normalized;
}

function extractGroup(user: any) {
  return normalizeGroup(
    user?.app_metadata?.group
    || user?.app_metadata?.role
    || user?.user_metadata?.group
    || user?.user_metadata?.role
  );
}

function ensureAllowedGroup(group: string) {
  if (!["staff", "admin", "superadmin"].includes(group)) {
    throw new Error("群組只可為 staff、admin 或 superadmin。");
  }
}

function mapUser(user: any) {
  return {
    id: user.id,
    email: user.email || "",
    group: extractGroup(user),
    createdAt: user.created_at || null,
    lastSignInAt: user.last_sign_in_at || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error("Supabase Functions 環境變數未完整設定。");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ ok: false, error: "缺少登入授權。" }, 401);
    }

    const requesterClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: requesterData, error: requesterError } = await requesterClient.auth.getUser();
    if (requesterError || !requesterData.user) {
      return json({ ok: false, error: requesterError?.message || "登入狀態無效。" }, 401);
    }

    if (extractGroup(requesterData.user) !== "superadmin") {
      return json({ ok: false, error: "只有 superadmin 可管理用戶。" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = `${body?.action || ""}`.trim();

    if (action === "listUsers") {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (error) {
        throw error;
      }
      return json({
        ok: true,
        users: (data.users || []).map(mapUser).sort((left, right) => left.email.localeCompare(right.email)),
      });
    }

    if (action === "createUser") {
      const email = `${body?.email || ""}`.trim().toLowerCase();
      const password = `${body?.password || ""}`;
      const group = normalizeGroup(body?.group);
      ensureAllowedGroup(group);

      if (!email) {
        throw new Error("請提供 Email。");
      }
      if (password.length < 8) {
        throw new Error("Password 最少要 8 個字元。");
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          group,
        },
      });
      if (error) {
        throw error;
      }
      return json({
        ok: true,
        user: mapUser(data.user),
      });
    }

    if (action === "updateGroup") {
      const userId = `${body?.userId || ""}`.trim();
      const group = normalizeGroup(body?.group);
      ensureAllowedGroup(group);

      if (!userId) {
        throw new Error("缺少 userId。");
      }

      const { data: existingData, error: existingError } = await adminClient.auth.admin.getUserById(userId);
      if (existingError) {
        throw existingError;
      }

      const nextMetadata = {
        ...(existingData.user?.app_metadata || {}),
        group,
      };

      const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
        app_metadata: nextMetadata,
      });
      if (error) {
        throw error;
      }
      return json({
        ok: true,
        user: mapUser(data.user),
      });
    }

    if (action === "deleteUser") {
      const userId = `${body?.userId || ""}`.trim();
      if (!userId) {
        throw new Error("缺少 userId。");
      }
      if (userId === requesterData.user.id) {
        throw new Error("不可刪除目前登入中的 superadmin 帳號。");
      }

      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) {
        throw error;
      }
      return json({ ok: true });
    }

    return json({ ok: false, error: "不支援的操作。" }, 400);
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "發生未知錯誤。",
    }, 500);
  }
});
