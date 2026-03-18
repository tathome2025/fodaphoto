import{t as g,r as M,d as o,x as $,y as f,z as D,A as l,B as L,C as w,p as C,q as S,P as b}from"./workbench-4gzxfYMo.js";const t={selectedDate:new URLSearchParams(window.location.search).get("date")||g(),currentMonth:null,uploadMap:{},captureSets:[]},r={currentUserEmail:document.querySelector("#currentUserEmail"),monthLabel:document.querySelector("#monthLabel"),calendarGrid:document.querySelector("#calendarGrid"),selectedDateTitle:document.querySelector("#selectedDateTitle"),selectedDateMeta:document.querySelector("#selectedDateMeta"),selectedDateChip:document.querySelector("#selectedDateChip"),recordsStatus:document.querySelector("#recordsStatus"),recordList:document.querySelector("#recordList"),prevMonthBtn:document.querySelector("#prevMonthBtn"),nextMonthBtn:document.querySelector("#nextMonthBtn")};function P(e){r.currentUserEmail&&(r.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function c(e,a){r.recordsStatus.textContent=e,r.recordsStatus.className="status-text",a&&r.recordsStatus.classList.add(`is-${a}`)}function q(e){return`${e.length} 台車輛於當日有操作紀錄`}function x(){const e=new URL(window.location.href);e.searchParams.set("date",t.selectedDate),window.history.replaceState({},"",e)}function v(){r.monthLabel.textContent=L(t.currentMonth);const e=w(t.currentMonth.getFullYear(),t.currentMonth.getMonth());r.calendarGrid.innerHTML=e.map(a=>{if(!a)return'<div class="calendar-day is-empty"></div>';const s=`${a.getFullYear()}-${`${a.getMonth()+1}`.padStart(2,"0")}-${`${a.getDate()}`.padStart(2,"0")}`,n=t.uploadMap[s]||0;return`
      <button class="${["calendar-day",n?"has-data":"",t.selectedDate===s?"is-selected":""].filter(Boolean).join(" ")}" type="button" data-calendar-date="${s}">
        <span>${a.getDate()}</span>
        ${n?`<span class="calendar-dot" title="${n} 台車有紀錄"></span>`:"<span></span>"}
      </button>
    `}).join(""),r.calendarGrid.querySelectorAll("[data-calendar-date]").forEach(a=>{a.addEventListener("click",async()=>{t.selectedDate=a.dataset.calendarDate,await y(),v(),x()})})}async function B(){const e=[...r.recordList.querySelectorAll("[data-photo-path]")];await Promise.all(e.map(async a=>{const s=a.querySelector("img");if(s)try{s.src=await C(a.dataset.photoPath,{width:720,height:540})}catch(n){if(S(n)){s.src=b;return}a.querySelector(".record-photo-caption")?.replaceChildren(document.createTextNode(o(n)))}}))}function u(e,a){return`
    <article class="record-photo-card" data-photo-path="${e.storagePath}">
      <div class="record-photo-frame">
        <img alt="${e.fileName}">
      </div>
      <div class="record-photo-caption">
        <strong>${a}</strong>
        <span>${e.fileName}</span>
        <span>${e.createdByLabel||"未記錄"} · ${l(e.createdAt)}</span>
      </div>
    </article>
  `}function m(e="相片"){return`
    <div class="empty-state compact photo-missing-state">
      <strong>${e}已刪除</strong>
      <p class="muted-copy">資料紀錄仍然保留，但原始相片已不在圖片庫中。</p>
    </div>
  `}async function y(){r.selectedDateTitle.textContent=f(t.selectedDate),r.selectedDateChip.textContent=t.selectedDate;try{t.captureSets=await D(t.selectedDate)}catch(e){t.captureSets=[],r.recordList.innerHTML=`
      <div class="empty-state">
        <strong>讀取失敗</strong>
        <p class="muted-copy">${o(e)}</p>
      </div>
    `,c(o(e),"danger");return}if(r.selectedDateMeta.textContent=q(t.captureSets),!t.captureSets.length){r.recordList.innerHTML=`
      <div class="empty-state">
        <strong>這一天未有處理紀錄</strong>
        <p class="muted-copy">可回到 Check-in 或安裝維修保養頁建立新紀錄。</p>
      </div>
    `,c("這一天暫時未有車輛處理紀錄。","");return}r.recordList.innerHTML=t.captureSets.map(e=>{const a=e.activityOnDate.hasCheckIn?`
        <section class="activity-block">
          <div class="activity-head">
            <div>
              <h3>Check-in</h3>
              <p>${e.createdByLabel||"未記錄"} 於 ${l(e.createdAt)} 建立案件</p>
            </div>
            <div class="chip-row">
              <span class="meta-chip">${e.reference}</span>
              <span class="meta-chip">${e.captureDate}</span>
            </div>
          </div>
          <div class="record-photo-grid">
            ${(e.vehiclePhotos||[]).length?(e.vehiclePhotos||[]).map(n=>u(n,"車輛照")).join(""):m("車輛照")}
          </div>
        </section>
      `:"",s=e.activityOnDate.serviceEntries.map((n,p)=>{const i=n.photos[0];return`
        <section class="activity-block">
          <div class="activity-head">
            <div>
              <h3>工序 ${String(p+1).padStart(2,"0")} · ${n.itemLabel||"未分類"}</h3>
              <p>${i?.createdByLabel||"未記錄"} 於 ${i?.createdAt?l(i.createdAt):"-"} 輸入</p>
            </div>
            <div class="chip-row">
              ${(n.itemNames||[]).map(d=>`<span class="meta-chip">${d}</span>`).join("")}
            </div>
          </div>
          <p class="activity-note">${n.notes||"未填工序備註"}</p>
          <div class="record-photo-grid">
            ${(n.photos||[]).length?(n.photos||[]).map(d=>u(d,n.itemLabel||"工序照片")).join(""):m(n.itemLabel||"工序照片")}
          </div>
        </section>
      `}).join("");return`
      <article class="record-vehicle-card">
        <div class="set-head">
          <div>
            <h2>${e.brandName}${e.vehicleModel?` ${e.vehicleModel}`:""} · ${e.reference}</h2>
            <p>${e.notes||"未填整組備註"}</p>
          </div>
          <div class="chip-row">
            <span class="meta-chip">Check-in：${e.createdByLabel||"未記錄"}</span>
            <span class="meta-chip">${e.captureDate}</span>
          </div>
        </div>
        <div class="activity-stack">
          ${a}
          ${s||`
            <div class="empty-state compact">
              <strong>當日只有 Check-in 或沒有新增工序</strong>
              <p class="muted-copy">這台車於當日沒有額外安裝、維修或保養輸入。</p>
            </div>
          `}
        </div>
      </article>
    `}).join(""),await B(),c("已載入當日處理紀錄。","success")}async function h(){t.uploadMap=await $(t.currentMonth.getFullYear(),t.currentMonth.getMonth()),v()}function k(){r.prevMonthBtn.addEventListener("click",async()=>{t.currentMonth=new Date(t.currentMonth.getFullYear(),t.currentMonth.getMonth()-1,1),await h()}),r.nextMonthBtn.addEventListener("click",async()=>{t.currentMonth=new Date(t.currentMonth.getFullYear(),t.currentMonth.getMonth()+1,1),await h()})}async function E(){const e=await M(["staff","admin","superadmin","supreadmin"],"../index.html");P(e);const[a,s]=t.selectedDate.split("-").map(Number);t.currentMonth=new Date(a,s-1,1),c("正在載入處理紀錄...","");try{await h(),await y()}catch(n){c(o(n),"danger")}k()}E();
