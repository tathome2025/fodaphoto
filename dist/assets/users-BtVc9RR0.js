import{r as p,d as c,E as l}from"./workbench-BT-2qLI8.js";const s={currentUserEmail:document.querySelector("#currentUserEmail"),usersStatus:document.querySelector("#usersStatus"),usersList:document.querySelector("#usersList"),refreshUsersBtn:document.querySelector("#refreshUsersBtn"),createUserForm:document.querySelector("#createUserForm"),newUserEmail:document.querySelector("#newUserEmail"),newUserPassword:document.querySelector("#newUserPassword"),newUserGroup:document.querySelector("#newUserGroup"),createUserBtn:document.querySelector("#createUserBtn")},i={users:[],currentUserId:""};function f(e){s.currentUserEmail&&(s.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-"),i.currentUserId=e?.id||""}function t(e,r){s.usersStatus.textContent=e,s.usersStatus.className="status-text",r&&s.usersStatus.classList.add(`is-${r}`)}async function o(e,r={}){if(!l)throw new Error("Supabase 未設定。");const{data:n,error:a}=await l.functions.invoke("user-admin",{body:{action:e,...r}});if(a)throw a;if(!n?.ok)throw new Error(n?.error||"用戶管理操作失敗。");return n}function m(){if(!i.users.length){s.usersList.innerHTML=`
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
    `}).join(""),s.usersList.querySelectorAll("[data-save-user]").forEach(e=>{e.addEventListener("click",async()=>{const r=e.dataset.saveUser,a=s.usersList.querySelector(`[data-user-group="${r}"]`)?.value||"";if(!a){t("請先選擇群組。","danger");return}e.disabled=!0;try{await o("updateGroup",{userId:r,group:a}),await d(),t("用戶權限已更新。","success")}catch(u){t(c(u),"danger")}finally{e.disabled=!1}})}),s.usersList.querySelectorAll("[data-delete-user]").forEach(e=>{e.addEventListener("click",async()=>{const r=e.dataset.deleteUser,n=i.users.find(a=>a.id===r);if(n&&window.confirm(`確定刪除用戶 ${n.email||n.id}？此操作不可還原。`)){e.disabled=!0;try{await o("deleteUser",{userId:r}),await d(),t("用戶已刪除。","success")}catch(a){t(c(a),"danger")}finally{e.disabled=!1}}})})}async function d(){const e=await o("listUsers");i.users=e.users||[],m()}async function U(e){e.preventDefault();const r=s.newUserEmail.value.trim(),n=s.newUserPassword.value,a=s.newUserGroup.value;if(!r||!n||!a){t("請完整輸入 Email、Password 和群組。","danger");return}s.createUserBtn.disabled=!0;try{await o("createUser",{email:r,password:n,group:a}),s.newUserEmail.value="",s.newUserPassword.value="",s.newUserGroup.value="staff",await d(),t("新用戶已建立。","success")}catch(u){t(c(u),"danger")}finally{s.createUserBtn.disabled=!1}}function w(){s.refreshUsersBtn.addEventListener("click",async()=>{s.refreshUsersBtn.disabled=!0;try{await d(),t("已重新載入用戶資料。","success")}catch(e){t(c(e),"danger")}finally{s.refreshUsersBtn.disabled=!1}}),s.createUserForm.addEventListener("submit",U)}async function y(){const e=await p(["superadmin","supreadmin"],"../index.html");f(e),t("正在載入用戶資料...",""),w();try{await d(),t("可管理所有用戶的群組、新增與刪除。","success")}catch(r){t(c(r),"danger")}}y();
