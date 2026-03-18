import { requireAuthorizedPage } from "./supabase-browser.js";
import { describeSupabaseError, supabase } from "./workbench.js";

const refs = {
  currentUserEmail: document.querySelector("#currentUserEmail"),
  usersStatus: document.querySelector("#usersStatus"),
  usersList: document.querySelector("#usersList"),
  refreshUsersBtn: document.querySelector("#refreshUsersBtn"),
  createUserForm: document.querySelector("#createUserForm"),
  newUserEmail: document.querySelector("#newUserEmail"),
  newUserPassword: document.querySelector("#newUserPassword"),
  newUserGroup: document.querySelector("#newUserGroup"),
  createUserBtn: document.querySelector("#createUserBtn"),
};

const state = {
  users: [],
  currentUserId: "",
};

function syncCurrentUser(user) {
  if (refs.currentUserEmail) {
    refs.currentUserEmail.textContent = user?.email || user?.phone || user?.id || "-";
  }
  state.currentUserId = user?.id || "";
}

function setStatus(message, type) {
  refs.usersStatus.textContent = message;
  refs.usersStatus.className = "status-text";
  if (type) {
    refs.usersStatus.classList.add(`is-${type}`);
  }
}

async function invokeUserAdmin(action, payload = {}) {
  if (!supabase) {
    throw new Error("Supabase 未設定。");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  if (!sessionData.session?.access_token) {
    throw new Error("目前登入狀態無效，請先重新登入。");
  }

  const { data, error } = await supabase.functions.invoke("user-admin", {
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: {
      action,
      ...payload,
    },
  });

  if (error) {
    if (typeof error.context?.json === "function") {
      try {
        const body = await error.context.json();
        throw new Error(body?.error || error.message || "用戶管理操作失敗。");
      } catch (contextError) {
        if (contextError instanceof Error && contextError.message) {
          throw contextError;
        }
      }
    }
    throw error;
  }
  if (!data?.ok) {
    throw new Error(data?.error || "用戶管理操作失敗。");
  }
  return data;
}

function renderUsers() {
  if (!state.users.length) {
    refs.usersList.innerHTML = `
      <div class="empty-state compact">
        <strong>暫時沒有可管理的用戶</strong>
        <p class="muted-copy">請先用左邊表單建立第一個用戶。</p>
      </div>
    `;
    return;
  }

  refs.usersList.innerHTML = state.users.map((user) => {
    const isCurrentUser = user.id === state.currentUserId;
    return `
      <article class="user-card">
        <div class="user-card-head">
          <div class="user-card-meta">
            <strong>${user.email || "未有 Email"}</strong>
            <span>${user.id}</span>
            <span>建立時間：${user.createdAt ? new Date(user.createdAt).toLocaleString("zh-Hant-HK") : "未記錄"}</span>
            <span>最近登入：${user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString("zh-Hant-HK") : "未登入"}</span>
          </div>
          <span class="filter-chip">${user.group || "未設定群組"}</span>
        </div>
        <div class="user-card-actions">
          <label class="field user-group-field">
            <span>群組</span>
            <select data-user-group="${user.id}">
              <option value="staff" ${user.group === "staff" ? "selected" : ""}>staff</option>
              <option value="admin" ${user.group === "admin" ? "selected" : ""}>admin</option>
              <option value="superadmin" ${user.group === "superadmin" ? "selected" : ""}>superadmin</option>
            </select>
          </label>
          <button class="secondary-button" type="button" data-save-user="${user.id}">更新權限</button>
          <button class="secondary-button user-delete-btn" type="button" data-delete-user="${user.id}" ${isCurrentUser ? "disabled" : ""}>刪除用戶</button>
        </div>
      </article>
    `;
  }).join("");

  refs.usersList.querySelectorAll("[data-save-user]").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.saveUser;
      const select = refs.usersList.querySelector(`[data-user-group="${userId}"]`);
      const group = select?.value || "";
      if (!group) {
        setStatus("請先選擇群組。", "danger");
        return;
      }

      button.disabled = true;
      try {
        await invokeUserAdmin("updateGroup", { userId, group });
        await loadUsers();
        setStatus("用戶權限已更新。", "success");
      } catch (error) {
        setStatus(describeSupabaseError(error), "danger");
      } finally {
        button.disabled = false;
      }
    });
  });

  refs.usersList.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.deleteUser;
      const target = state.users.find((item) => item.id === userId);
      if (!target) {
        return;
      }
      if (!window.confirm(`確定刪除用戶 ${target.email || target.id}？此操作不可還原。`)) {
        return;
      }

      button.disabled = true;
      try {
        await invokeUserAdmin("deleteUser", { userId });
        await loadUsers();
        setStatus("用戶已刪除。", "success");
      } catch (error) {
        setStatus(describeSupabaseError(error), "danger");
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function loadUsers() {
  const data = await invokeUserAdmin("listUsers");
  state.users = data.users || [];
  renderUsers();
}

async function handleCreateUser(event) {
  event.preventDefault();
  const email = refs.newUserEmail.value.trim();
  const password = refs.newUserPassword.value;
  const group = refs.newUserGroup.value;

  if (!email || !password || !group) {
    setStatus("請完整輸入 Email、Password 和群組。", "danger");
    return;
  }

  refs.createUserBtn.disabled = true;
  try {
    await invokeUserAdmin("createUser", { email, password, group });
    refs.newUserEmail.value = "";
    refs.newUserPassword.value = "";
    refs.newUserGroup.value = "staff";
    await loadUsers();
    setStatus("新用戶已建立。", "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.createUserBtn.disabled = false;
  }
}

function bindEvents() {
  refs.refreshUsersBtn.addEventListener("click", async () => {
    refs.refreshUsersBtn.disabled = true;
    try {
      await loadUsers();
      setStatus("已重新載入用戶資料。", "success");
    } catch (error) {
      setStatus(describeSupabaseError(error), "danger");
    } finally {
      refs.refreshUsersBtn.disabled = false;
    }
  });
  refs.createUserForm.addEventListener("submit", handleCreateUser);
}

async function init() {
  const user = await requireAuthorizedPage(["superadmin", "supreadmin"], "../index.html");
  syncCurrentUser(user);
  setStatus("正在載入用戶資料...", "");
  bindEvents();

  try {
    await loadUsers();
    setStatus("可管理所有用戶的群組、新增與刪除。", "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  }
}

init();
