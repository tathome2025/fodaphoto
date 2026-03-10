import { isSupabaseConfigured } from "./config.js";
import {
  getCurrentUser,
  onAuthStateChange,
  signInWithPassword,
  signOut,
} from "./supabase-browser.js";
import { describeSupabaseError } from "./workbench.js";

const refs = {
  loginForm: document.querySelector("#loginForm"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  loginBtn: document.querySelector("#loginBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  authStatus: document.querySelector("#authStatus"),
  userPanel: document.querySelector("#userPanel"),
  guestPanel: document.querySelector("#guestPanel"),
  userEmail: document.querySelector("#userEmail"),
};

function setStatus(message, type) {
  refs.authStatus.textContent = message;
  refs.authStatus.className = "status-text";
  if (type) {
    refs.authStatus.classList.add(`is-${type}`);
  }
}

function syncUserUI(user) {
  const hasUser = Boolean(user);
  refs.userPanel.hidden = !hasUser;
  refs.guestPanel.hidden = hasUser;
  refs.userEmail.textContent = user?.email || "-";
}

async function refreshUser() {
  const user = await getCurrentUser();
  syncUserUI(user);
  if (user) {
    setStatus(`目前已登入：${user.email}`, "success");
    return;
  }
  if (!isSupabaseConfigured) {
    setStatus("先設定 Supabase。若你已填 .env，請先執行 npm run sync-config。", "danger");
    return;
  }
  setStatus("登入後即可進入拍照分類與 edit 工作台。", "");
}

async function handleLogin(event) {
  event.preventDefault();
  if (!isSupabaseConfigured) {
    setStatus("尚未設定 Supabase。若你已填 .env，請先執行 npm run sync-config。", "danger");
    return;
  }

  refs.loginBtn.disabled = true;
  setStatus("登入中...", "");

  try {
    await signInWithPassword(refs.emailInput.value.trim(), refs.passwordInput.value);
    refs.passwordInput.value = "";
    await refreshUser();
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.loginBtn.disabled = false;
  }
}

async function handleLogout() {
  refs.logoutBtn.disabled = true;
  try {
    await signOut();
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
    "missing-config": "尚未設定 Supabase 環境變數。",
  };
  setStatus(messages[error] || "請先登入。", "danger");
  url.searchParams.delete("error");
  window.history.replaceState({}, "", url);
}

function bindEvents() {
  refs.loginForm.addEventListener("submit", handleLogin);
  refs.logoutBtn.addEventListener("click", handleLogout);
  onAuthStateChange(async () => {
    await refreshUser();
  });
}

consumeErrorParam();
bindEvents();
refreshUser();
