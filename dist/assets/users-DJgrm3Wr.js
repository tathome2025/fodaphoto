import{r as y,d as l,G as w,a as h,H as U}from"./workbench-4gzxfYMo.js";const m="20260318-4",s={currentUserEmail:document.querySelector("#currentUserEmail"),usersStatus:document.querySelector("#usersStatus"),usersList:document.querySelector("#usersList"),refreshUsersBtn:document.querySelector("#refreshUsersBtn"),createUserForm:document.querySelector("#createUserForm"),newUserEmail:document.querySelector("#newUserEmail"),newUserPassword:document.querySelector("#newUserPassword"),newUserGroup:document.querySelector("#newUserGroup"),createUserBtn:document.querySelector("#createUserBtn")},c={users:[],currentUserId:""};function g(e){s.currentUserEmail&&(s.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-"),c.currentUserId=e?.id||""}function a(e,r){s.usersStatus.textContent=e,s.usersStatus.className="status-text",r&&s.usersStatus.classList.add(`is-${r}`)}async function p(e,r={}){if(!w)throw new Error("Supabase 未設定。");let{data:t,error:n}=await w.auth.getSession();if(n)throw n;if(t.session?.refresh_token){const d=await w.auth.refreshSession({refresh_token:t.session.refresh_token});if(d.error)throw/jwt|session/i.test(d.error.message||"")?(await h().catch(()=>{}),new Error("登入狀態已失效，請重新登入 superadmin 帳號。")):d.error;t=d.data}if(!t.session?.access_token)throw new Error("目前登入狀態無效，請先重新登入。");const o=await fetch(`${U.supabaseUrl}/functions/v1/user-admin`,{method:"POST",headers:{"Content-Type":"application/json",apikey:U.supabasePublishableKey,Authorization:`Bearer ${t.session.access_token}`},body:JSON.stringify({action:e,...r})});let i=null,u="";try{u=await o.text(),i=u?JSON.parse(u):null}catch{i=null}if(!o.ok)throw/invalid jwt/i.test(`${i?.error||i?.message||u||""}`)?(await h().catch(()=>{}),new Error("登入狀態已失效，請重新登入 superadmin 帳號。")):new Error(i?.error||i?.message||u||`用戶管理操作失敗（HTTP ${o.status}）。`);if(!i?.ok)throw new Error(i?.error||"用戶管理操作失敗。");return i}function S(){if(!c.users.length){s.usersList.innerHTML=`
      <div class="empty-state compact">
        <strong>暫時沒有可管理的用戶</strong>
        <p class="muted-copy">請先用左邊表單建立第一個用戶。</p>
      </div>
    `;return}s.usersList.innerHTML=c.users.map(e=>{const r=e.id===c.currentUserId;return`
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
    `}).join(""),s.usersList.querySelectorAll("[data-save-user]").forEach(e=>{e.addEventListener("click",async()=>{const r=e.dataset.saveUser,n=s.usersList.querySelector(`[data-user-group="${r}"]`)?.value||"";if(!n){a("請先選擇群組。","danger");return}e.disabled=!0;try{await p("updateGroup",{userId:r,group:n}),await f(),a("用戶權限已更新。","success")}catch(o){a(l(o),"danger")}finally{e.disabled=!1}})}),s.usersList.querySelectorAll("[data-delete-user]").forEach(e=>{e.addEventListener("click",async()=>{const r=e.dataset.deleteUser,t=c.users.find(n=>n.id===r);if(t&&window.confirm(`確定刪除用戶 ${t.email||t.id}？此操作不可還原。`)){e.disabled=!0;try{await p("deleteUser",{userId:r}),await f(),a("用戶已刪除。","success")}catch(n){a(l(n),"danger")}finally{e.disabled=!1}}})})}async function f(){const e=await p("listUsers");c.users=e.users||[],S()}async function v(e){e.preventDefault();const r=s.newUserEmail.value.trim(),t=s.newUserPassword.value,n=s.newUserGroup.value;if(!r||!t||!n){a("請完整輸入 Email、Password 和群組。","danger");return}s.createUserBtn.disabled=!0;try{await p("createUser",{email:r,password:t,group:n}),s.newUserEmail.value="",s.newUserPassword.value="",s.newUserGroup.value="staff",await f(),a("新用戶已建立。","success")}catch(o){a(l(o),"danger")}finally{s.createUserBtn.disabled=!1}}function E(){s.refreshUsersBtn.addEventListener("click",async()=>{s.refreshUsersBtn.disabled=!0;try{await f(),a("已重新載入用戶資料。","success")}catch(e){a(l(e),"danger")}finally{s.refreshUsersBtn.disabled=!1}}),s.createUserForm.addEventListener("submit",v)}async function b(){const e=await y(["superadmin","supreadmin"],"../index.html");g(e),a(`正在載入用戶資料...（client ${m}）`,""),E();try{await f(),a(`可管理所有用戶的群組、新增與刪除。（client ${m}）`,"success")}catch(r){a(`[client ${m}] ${l(r)}`,"danger")}}b();
