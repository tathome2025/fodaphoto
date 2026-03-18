import{r as L,d,G as b,H as j,I as q,x,J as B,K as D,L as y,M as $,p as w,N as C,A as U,B as I,O as T,P as E,Q as N,R as k}from"./workbench-DXxRXhVJ.js";const A=new URLSearchParams(window.location.search).get("date"),a={selectedDate:A||null,currentMonth:null,selectedFilterId:"",filters:[],captureSets:[],uploadMap:{}},n={currentUserEmail:document.querySelector("#currentUserEmail"),monthLabel:document.querySelector("#monthLabel"),calendarGrid:document.querySelector("#calendarGrid"),selectedDateTitle:document.querySelector("#selectedDateTitle"),selectedDateMeta:document.querySelector("#selectedDateMeta"),setList:document.querySelector("#setList"),filterList:document.querySelector("#filterList"),applyDayFilterBtn:document.querySelector("#applyDayFilterBtn"),downloadDayBtn:document.querySelector("#downloadDayBtn"),selectedFilterChip:document.querySelector("#selectedFilterChip"),editStatus:document.querySelector("#editStatus"),prevMonthBtn:document.querySelector("#prevMonthBtn"),nextMonthBtn:document.querySelector("#nextMonthBtn")};function P(e){n.currentUserEmail&&(n.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function c(e,t){n.editStatus.textContent=e,n.editStatus.className="status-text",t&&n.editStatus.classList.add(`is-${t}`)}function H(e){const t=e.length,r=e.reduce((s,o)=>s+T(o),0);return`${t} 組案件，${r} 張相片`}async function R(e,t){const r=await w(e.storagePath,{width:720,height:540});return E(e.adjustments)?N(r,e.adjustments,{width:720,height:540,mimeType:"image/jpeg",quality:.86}):r}function M(){n.monthLabel.textContent=U(a.currentMonth);const e=I(a.currentMonth.getFullYear(),a.currentMonth.getMonth());n.calendarGrid.innerHTML=e.map(t=>{if(!t)return'<div class="calendar-day is-empty"></div>';const r=`${t.getFullYear()}-${`${t.getMonth()+1}`.padStart(2,"0")}-${`${t.getDate()}`.padStart(2,"0")}`,s=a.uploadMap[r]||0;return`
      <button class="${["calendar-day",s?"has-data":"",a.selectedDate===r?"is-selected":""].filter(Boolean).join(" ")}" type="button" data-calendar-date="${r}">
        <span>${t.getDate()}</span>
        ${s?`<span class="calendar-dot" title="${s} 張相片"></span>`:"<span></span>"}
      </button>
    `}).join(""),n.calendarGrid.querySelectorAll("[data-calendar-date]").forEach(t=>{t.addEventListener("click",async()=>{a.selectedDate=t.dataset.calendarDate,await f(),M(),Q()})})}function S(){a.filters.find(t=>t.id===a.selectedFilterId)||(a.selectedFilterId=a.filters[0]?.id||"");const e=a.filters.find(t=>t.id===a.selectedFilterId);if(n.selectedFilterChip.textContent=e?`批量 filter：${e.name}`:"尚未有已儲存 filter",!a.filters.length){n.filterList.innerHTML=`
      <div class="empty-state">
        <strong>暫時沒有已儲存 filter</strong>
        <p class="muted-copy">先進入任一張相片的進階調色頁，另存一個命名 filter。</p>
      </div>
    `;return}n.filterList.innerHTML=a.filters.map(t=>`
    <button class="filter-card ${t.id===a.selectedFilterId?"is-selected":""}" type="button" data-filter-id="${t.id}">
      <strong>${t.name}</strong>
      <p>亮度 ${t.adjustments.brightness} / 對比 ${t.adjustments.contrast} / 飽和 ${t.adjustments.saturation} / 色溫 ${t.adjustments.temperature}</p>
    </button>
  `).join(""),n.filterList.querySelectorAll("[data-filter-id]").forEach(t=>{t.addEventListener("click",()=>{a.selectedFilterId=t.dataset.filterId,S()})})}async function Y(){const e=[...n.setList.querySelectorAll("[data-photo-id]")];await Promise.all(e.map(async t=>{const r=t.dataset.photoId,s=t.querySelector("img"),o=a.captureSets.flatMap(i=>y(i)).find(i=>i.photo.id===r)?.photo;if(!(!o||!s))try{s.src=await R(o,"thumb")}catch(i){t.querySelector(".photo-body p").textContent=d(i)}}))}async function f(){n.selectedDateTitle.textContent=x(a.selectedDate);try{a.captureSets=await B(a.selectedDate)}catch(e){a.captureSets=[],n.setList.innerHTML=`
      <div class="empty-state">
        <strong>讀取失敗</strong>
        <p class="muted-copy">${d(e)}</p>
      </div>
    `,c(d(e),"danger");return}if(n.selectedDateMeta.textContent=H(a.captureSets),!a.captureSets.length){n.setList.innerHTML=`
      <div class="empty-state">
        <strong>這一天沒有相片</strong>
        <p class="muted-copy">回到 Check-in 或安裝維修保養頁面建立新案件，日曆便會自動出現標記。</p>
      </div>
    `;return}n.setList.innerHTML=a.captureSets.map(e=>{const t=D(e),r=y(e).map(({photo:s,kindLabel:o,itemName:i,itemNames:u})=>{const p=a.filters.find(l=>l.id===s.savedFilterId)?.name||(s.savedFilterId?"已套用 filter":"未套用 filter"),h=(u||[]).map(l=>`<span class="meta-chip">${l}</span>`).join("");return`
        <article class="photo-card" data-photo-id="${s.id}">
          <img alt="${s.fileName}">
          <div class="photo-body">
            <div class="chip-row">
              <span class="meta-chip">${o}</span>
              ${h||(i?`<span class="meta-chip">${i}</span>`:"")}
              <span class="meta-chip">${p}</span>
            </div>
            <strong>${s.fileName}</strong>
            <p>${e.notes||"未填整組備註"}</p>
          </div>
          <div class="photo-actions">
            <a class="secondary-button" href="./detail.html?photo=${encodeURIComponent(s.id)}">進階調色</a>
          </div>
        </article>
      `}).join("");return`
      <section class="set-card">
        <div class="set-head">
          <div>
            <h2>${e.brandName}${e.vehicleModel?` ${e.vehicleModel}`:""} · ${e.reference}</h2>
            <p>${e.notes||"未填整組備註"}</p>
          </div>
          <div class="chip-row">
            <span class="meta-chip">${e.captureDate}</span>
            <span class="meta-chip">${t}</span>
          </div>
        </div>
        <div class="photo-stack">${r}</div>
      </section>
    `}).join(""),await Y()}async function G(){a.filters=b(await j()),S()}async function z(){if(!a.selectedFilterId){c("請先選擇一個已儲存 filter。","danger");return}n.applyDayFilterBtn.disabled=!0,c("正在為當天相片套用 filter...","");try{const e=await k(a.selectedDate,a.selectedFilterId);c(`已為 ${e} 張相片套用 filter。`,"success"),await f()}catch(e){c(d(e),"danger")}finally{n.applyDayFilterBtn.disabled=!1}}function O(e,t){const r=URL.createObjectURL(e),s=document.createElement("a");s.href=r,s.download=t,s.click(),setTimeout(()=>URL.revokeObjectURL(r),1e3)}async function J(){if(!a.captureSets.length){c("這一天沒有可下載的相片。","danger");return}n.downloadDayBtn.disabled=!0,c("正在打包當天相片...","");try{const e=new window.JSZip;for(const r of a.captureSets){const s=e.folder($(D(r)));let o=1;for(const{photo:i,itemName:u,itemNames:p}of y(r)){const h=await w(i.storagePath),l=await C(h,i.adjustments,{mimeType:i.mimeType==="image/png"?"image/png":"image/jpeg",quality:.92}),g=i.mimeType==="image/png"?"png":"jpg",v=(p||[]).join("+")||u||i.itemId,F=i.kind==="vehicle"?`vehicle-${o}.${g}`:`accessory-${$(v||`item-${o}`)}-${o}.${g}`;s.file(F,l),o+=1}}const t=await e.generateAsync({type:"blob"});O(t,`garage-photos-${a.selectedDate}.zip`),c("下載壓縮包已開始。","success")}catch(e){c(d(e),"danger")}finally{n.downloadDayBtn.disabled=!1}}async function m(e){a.currentMonth=new Date(e.getFullYear(),e.getMonth(),1);try{a.uploadMap=await q(a.currentMonth.getFullYear(),a.currentMonth.getMonth()),M()}catch(t){c(d(t),"danger")}}function Q(){const e=new URL(window.location.href);e.searchParams.set("date",a.selectedDate),window.history.replaceState({},"",e)}function K(){n.applyDayFilterBtn.addEventListener("click",z),n.downloadDayBtn.addEventListener("click",J),n.prevMonthBtn.addEventListener("click",async()=>{const e=new Date(a.currentMonth.getFullYear(),a.currentMonth.getMonth()-1,1);await m(e)}),n.nextMonthBtn.addEventListener("click",async()=>{const e=new Date(a.currentMonth.getFullYear(),a.currentMonth.getMonth()+1,1);await m(e)})}async function W(){const e=await L(["superadmin","supreadmin"],"../index.html");P(e);const t=a.selectedDate?new Date(`${a.selectedDate}T00:00:00`):new Date;a.selectedDate||(a.selectedDate=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`),K(),c("讀取日曆與 filter 中...","");try{await G(),await m(t),await f(),c("已連接 Supabase。","success")}catch(r){c(d(r),"danger")}}W();
