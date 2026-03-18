import{r as m,d as u,E as p}from"./workbench-BT-2qLI8.js";const s={currentUserEmail:document.querySelector("#currentUserEmail"),usersStatus:document.querySelector("#usersStatus"),usersList:document.querySelector("#usersList"),refreshUsersBtn:document.querySelector("#refreshUsersBtn"),createUserForm:document.querySelector("#createUserForm"),newUserEmail:document.querySelector("#newUserEmail"),newUserPassword:document.querySelector("#newUserPassword"),newUserGroup:document.querySelector("#newUserGroup"),createUserBtn:document.querySelector("#createUserBtn")},i={users:[],currentUserId:""};function w(e){s.currentUserEmail&&(s.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-"),i.currentUserId=e?.id||""}function t(e,r){s.usersStatus.textContent=e,s.usersStatus.className="status-text",r&&s.usersStatus.classList.add(`is-${r}`)}async function f(e,r={}){if(!p)throw new Error("Supabase 未設定。");const{data:n,error:a}=await p.auth.getSession();if(a)throw a;if(!n.session?.access_token)throw new Error("目前登入狀態無效，請先重新登入。");const{data:o,error:c}=await p.functions.invoke("user-admin",{headers:{Authorization:`Bearer ${n.session.access_token}`},body:{action:e,...r}});if(c){if(typeof c.context?.json=="function")try{const d=await c.context.json();throw new Error(d?.error||c.message||"用戶管理操作失敗。")}catch(d){if(d instanceof Error&&d.message)throw d}throw c}if(!o?.ok)throw new Error(o?.error||"用戶管理操作失敗。");return o}function U(){if(!i.users.length){s.usersList.innerHTML=`
      <div class="empty-state compact">
        <strong>暫時沒有可管理的用戶</strong>
        <p class="muted-copy">請先用左邊表單建立第一個用戶。</p>
      </div>
    `;return}s.usersList.innerHTML=i.users.map(e=>{const r=e.id===i.currentUserId;return`
      <article class="user-card">
        <div class="user-card-head">
          <div class="user-card-meta">
            <strong>${e.email||"未有 Email"}</strong>
            <span>${e.id}</span>
            <span>建立時間：${e.createdAt?new Date(e.createdAt).toLocaleString("zh-Hant-HK"):"未記錄"}</span>
            <span>最近登入：${e.lastSignInAt?new Date(e.lastSignInAt).toLocaleString("zh-Hant-HK"):"未登入"}</span>
          </div>
          <span class="filter-chip">${e.group||"未設定群組"}</span>
        </div>
        <div class="user-card-actions">
          <label class="field user-group-field">
            <span>群組</span>
            <select data-user-group="${e.id}">
              <option value="staff" ${e.group==="staff"?"selected":""}>staff</option>
              <option value="admin" ${e.group==="admin"?"selected":""}>admin</option>
              <option value="superadmin" ${e.group==="superadmin"?"selected":""}>superadmin</option>
            </select>
          </label>
          <button class="secondary-button" type="button" data-save-user="${e.id}">更新權限</button>
          <button class="secondary-button user-delete-btn" type="button" data-delete-user="${e.id}" ${r?"disabled":""}>刪除用戶</button>
        </div>
      </article>
    `}).join(""),s.usersList.querySelectorAll("[data-save-user]").forEach(e=>{e.addEventListener("click",async()=>{const r=e.dataset.saveUser,a=s.usersList.querySelector(`[data-user-group="${r}"]`)?.value||"";if(!a){t("請先選擇群組。","danger");return}e.disabled=!0;try{await f("updateGroup",{userId:r,group:a}),await l(),t("用戶權限已更新。","success")}catch(o){t(u(o),"danger")}finally{e.disabled=!1}})}),s.usersList.querySelectorAll("[data-delete-user]").forEach(e=>{e.addEventListener("click",async()=>{const r=e.dataset.deleteUser,n=i.users.find(a=>a.id===r);if(n&&window.confirm(`確定刪除用戶 ${n.email||n.id}？此操作不可還原。`)){e.disabled=!0;try{await f("deleteUser",{userId:r}),await l(),t("用戶已刪除。","success")}catch(a){t(u(a),"danger")}finally{e.disabled=!1}}})})}async function l(){const e=await f("listUsers");i.users=e.users||[],U()}async function y(e){e.preventDefault();const r=s.newUserEmail.value.trim(),n=s.newUserPassword.value,a=s.newUserGroup.value;if(!r||!n||!a){t("請完整輸入 Email、Password 和群組。","danger");return}s.createUserBtn.disabled=!0;try{await f("createUser",{email:r,password:n,group:a}),s.newUserEmail.value="",s.newUserPassword.value="",s.newUserGroup.value="staff",await l(),t("新用戶已建立。","success")}catch(o){t(u(o),"danger")}finally{s.createUserBtn.disabled=!1}}function h(){s.refreshUsersBtn.addEventListener("click",async()=>{s.refreshUsersBtn.disabled=!0;try{await l(),t("已重新載入用戶資料。","success")}catch(e){t(u(e),"danger")}finally{s.refreshUsersBtn.disabled=!1}}),s.createUserForm.addEventListener("submit",y)}async function g(){const e=await m(["superadmin","supreadmin"],"../index.html");w(e),t("正在載入用戶資料...",""),h();try{await l(),t("可管理所有用戶的群組、新增與刪除。","success")}catch(r){t(u(r),"danger")}}g();
