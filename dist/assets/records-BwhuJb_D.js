import{t as y,r as $,d as o,w as M,x as g,y as f,z as l,A as D,B as w,p as L}from"./workbench-DJyKcN1a.js";const t={selectedDate:new URLSearchParams(window.location.search).get("date")||y(),currentMonth:null,uploadMap:{},captureSets:[]},n={currentUserEmail:document.querySelector("#currentUserEmail"),monthLabel:document.querySelector("#monthLabel"),calendarGrid:document.querySelector("#calendarGrid"),selectedDateTitle:document.querySelector("#selectedDateTitle"),selectedDateMeta:document.querySelector("#selectedDateMeta"),selectedDateChip:document.querySelector("#selectedDateChip"),recordsStatus:document.querySelector("#recordsStatus"),recordList:document.querySelector("#recordList"),prevMonthBtn:document.querySelector("#prevMonthBtn"),nextMonthBtn:document.querySelector("#nextMonthBtn")};function S(e){n.currentUserEmail&&(n.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function s(e,a){n.recordsStatus.textContent=e,n.recordsStatus.className="status-text",a&&n.recordsStatus.classList.add(`is-${a}`)}function C(e){return`${e.length} 台車輛於當日有操作紀錄`}function b(){const e=new URL(window.location.href);e.searchParams.set("date",t.selectedDate),window.history.replaceState({},"",e)}function m(){n.monthLabel.textContent=D(t.currentMonth);const e=w(t.currentMonth.getFullYear(),t.currentMonth.getMonth());n.calendarGrid.innerHTML=e.map(a=>{if(!a)return'<div class="calendar-day is-empty"></div>';const c=`${a.getFullYear()}-${`${a.getMonth()+1}`.padStart(2,"0")}-${`${a.getDate()}`.padStart(2,"0")}`,r=t.uploadMap[c]||0;return`
      <button class="${["calendar-day",r?"has-data":"",t.selectedDate===c?"is-selected":""].filter(Boolean).join(" ")}" type="button" data-calendar-date="${c}">
        <span>${a.getDate()}</span>
        ${r?`<span class="calendar-dot" title="${r} 台車有紀錄"></span>`:"<span></span>"}
      </button>
    `}).join(""),n.calendarGrid.querySelectorAll("[data-calendar-date]").forEach(a=>{a.addEventListener("click",async()=>{t.selectedDate=a.dataset.calendarDate,await v(),m(),b()})})}async function x(){const e=[...n.recordList.querySelectorAll("[data-photo-path]")];await Promise.all(e.map(async a=>{const c=a.querySelector("img");if(c)try{c.src=await L(a.dataset.photoPath,{width:720,height:540})}catch(r){a.querySelector(".record-photo-caption")?.replaceChildren(document.createTextNode(o(r)))}}))}function u(e,a){return`
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
  `}async function v(){n.selectedDateTitle.textContent=g(t.selectedDate),n.selectedDateChip.textContent=t.selectedDate;try{t.captureSets=await f(t.selectedDate)}catch(e){t.captureSets=[],n.recordList.innerHTML=`
      <div class="empty-state">
        <strong>讀取失敗</strong>
        <p class="muted-copy">${o(e)}</p>
      </div>
    `,s(o(e),"danger");return}if(n.selectedDateMeta.textContent=C(t.captureSets),!t.captureSets.length){n.recordList.innerHTML=`
      <div class="empty-state">
        <strong>這一天未有處理紀錄</strong>
        <p class="muted-copy">可回到 Check-in 或安裝維修保養頁建立新紀錄。</p>
      </div>
    `,s("這一天暫時未有車輛處理紀錄。","");return}n.recordList.innerHTML=t.captureSets.map(e=>{const a=e.activityOnDate.hasCheckIn?`
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
            ${(e.vehiclePhotos||[]).map(r=>u(r,"車輛照")).join("")}
          </div>
        </section>
      `:"",c=e.activityOnDate.serviceEntries.map((r,p)=>{const i=r.photos[0];return`
        <section class="activity-block">
          <div class="activity-head">
            <div>
              <h3>工序 ${String(p+1).padStart(2,"0")} · ${r.itemLabel||"未分類"}</h3>
              <p>${i?.createdByLabel||"未記錄"} 於 ${i?.createdAt?l(i.createdAt):"-"} 輸入</p>
            </div>
            <div class="chip-row">
              ${(r.itemNames||[]).map(d=>`<span class="meta-chip">${d}</span>`).join("")}
            </div>
          </div>
          <p class="activity-note">${r.notes||"未填工序備註"}</p>
          <div class="record-photo-grid">
            ${(r.photos||[]).map(d=>u(d,r.itemLabel||"工序照片")).join("")}
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
          ${c||`
            <div class="empty-state compact">
              <strong>當日只有 Check-in 或沒有新增工序</strong>
              <p class="muted-copy">這台車於當日沒有額外安裝、維修或保養輸入。</p>
            </div>
          `}
        </div>
      </article>
    `}).join(""),await x(),s("已載入當日處理紀錄。","success")}async function h(){t.uploadMap=await M(t.currentMonth.getFullYear(),t.currentMonth.getMonth()),m()}function q(){n.prevMonthBtn.addEventListener("click",async()=>{t.currentMonth=new Date(t.currentMonth.getFullYear(),t.currentMonth.getMonth()-1,1),await h()}),n.nextMonthBtn.addEventListener("click",async()=>{t.currentMonth=new Date(t.currentMonth.getFullYear(),t.currentMonth.getMonth()+1,1),await h()})}async function B(){const e=await $(["staff","admin","superadmin","supreadmin"],"../index.html");S(e);const[a,c]=t.selectedDate.split("-").map(Number);t.currentMonth=new Date(a,c-1,1),s("正在載入處理紀錄...","");try{await h(),await v()}catch(r){s(o(r),"danger")}q()}B();
