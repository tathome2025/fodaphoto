import { isSupabaseConfigured } from "./config.js";
import {
  getCurrentUser,
  onAuthStateChange,
  signInWithPassword,
  signOut,
} from "./supabase-browser.js";
import { describeSupabaseError } from "./workbench.js";

const refs = {
  authHeading: document.querySelector("#authHeading"),
  loginForm: document.querySelector("#loginForm"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  loginBtn: document.querySelector("#loginBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  authStatus: document.querySelector("#authStatus"),
  userPanel: document.querySelector("#userPanel"),
  userEmail: document.querySelector("#userEmail"),
};

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(message));
      }, ms);
    }),
  ]);
}

function setStatus(message, type) {
  refs.authStatus.hidden = !message;
  refs.authStatus.textContent = message;
  refs.authStatus.className = "status-text";
  if (message && type) {
    refs.authStatus.classList.add(`is-${type}`);
  }
}

function syncUserUI(user) {
  const hasUser = Boolean(user);
  refs.authHeading.textContent = hasUser ? "已登入" : "登入";
  refs.loginForm.hidden = hasUser;
  refs.userPanel.hidden = !hasUser;
  refs.userEmail.textContent = user?.email || "-";
}

let preserveStatusOnce = false;

async function refreshUser() {
  const user = await getCurrentUser();
  syncUserUI(user);
  if (user) {
    setStatus("", "");
    return;
  }
  if (!isSupabaseConfigured) {
    setStatus("尚未設定 Supabase。請在 .env 或 static/runtime-config.js 填入 URL 與 Publishable Key。", "danger");
    return;
  }
  if (preserveStatusOnce) {
    preserveStatusOnce = false;
    return;
  }
  setStatus("", "");
}

async function handleLogin(event) {
  event.preventDefault();
  if (!isSupabaseConfigured) {
    setStatus("尚未設定 Supabase。請在 .env 或 static/runtime-config.js 填入 URL 與 Publishable Key。", "danger");
    return;
  }
  if (!refs.emailInput.value.trim() || !refs.passwordInput.value) {
    setStatus("請先輸入 Email 和 Password。", "danger");
    return;
  }

  refs.loginBtn.disabled = true;
  setStatus("登入中...", "");

  try {
    const session = await withTimeout(
      signInWithPassword(refs.emailInput.value.trim(), refs.passwordInput.value),
      15000,
      "登入逾時，請檢查 Supabase 設定或網絡連線。"
    );
    refs.passwordInput.value = "";
    if (session?.user) {
      syncUserUI(session.user);
      setStatus("", "");
      return;
    }
    await withTimeout(
      refreshUser(),
      8000,
      "登入完成，但帳號狀態讀取逾時。請重新整理頁面確認。"
    );
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.loginBtn.disabled = false;
  }
}

async function handleLogout() {
  refs.logoutBtn.disabled = true;
  try {
    await withTimeout(
      signOut(),
      10000,
      "登出逾時，請重新整理頁面再試。"
    );
    await refreshUser();
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.logoutBtn.disabled = false;
  }
}

function consumeErrorParam() {
  const url = new URL(window.location.href);
  const error = url.searchParams.get("error");
  if (!error) {
    return;
  }

  const messages = {
    "no-session": "請先登入，才能進入拍照分類或 edit 頁面。",
    "missing-config": "尚未設定 Supabase。請先補回 URL 與 Publishable Key。",
  };
  preserveStatusOnce = true;
  setStatus(messages[error] || "請先登入。", "danger");
  url.searchParams.delete("error");
  window.history.replaceState({}, "", url);
}

function bindEvents() {
  refs.loginForm.addEventListener("submit", handleLogin);
  refs.logoutBtn.addEventListener("click", handleLogout);
  onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      syncUserUI(session.user);
      setStatus("", "");
      return;
    }
    await refreshUser();
  });
}

consumeErrorParam();
bindEvents();
refreshUser();
