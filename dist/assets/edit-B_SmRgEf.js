import{r as L,d,H as b,I as j,J as q,x,K as B,L as v,M as y,N as $,p as D,O as C,A as U,B as I,P as T,Q as E,R as N,S as P}from"./workbench-DrXLKKbW.js";const k=new URLSearchParams(window.location.search).get("date"),a={selectedDate:k||null,currentMonth:null,selectedFilterId:"",filters:[],captureSets:[],uploadMap:{}},n={currentUserEmail:document.querySelector("#currentUserEmail"),monthLabel:document.querySelector("#monthLabel"),calendarGrid:document.querySelector("#calendarGrid"),selectedDateTitle:document.querySelector("#selectedDateTitle"),selectedDateMeta:document.querySelector("#selectedDateMeta"),setList:document.querySelector("#setList"),filterList:document.querySelector("#filterList"),applyDayFilterBtn:document.querySelector("#applyDayFilterBtn"),downloadDayBtn:document.querySelector("#downloadDayBtn"),selectedFilterChip:document.querySelector("#selectedFilterChip"),editStatus:document.querySelector("#editStatus"),prevMonthBtn:document.querySelector("#prevMonthBtn"),nextMonthBtn:document.querySelector("#nextMonthBtn")};function A(e){n.currentUserEmail&&(n.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function c(e,t){n.editStatus.textContent=e,n.editStatus.className="status-text",t&&n.editStatus.classList.add(`is-${t}`)}function H(e){const t=e.length,s=e.reduce((i,r)=>i+T(r),0);return`${t} 組案件，${s} 張相片`}async function R(e,t){const s=await D(e.storagePath,{width:720,height:540});return E(e.adjustments)?N(s,e.adjustments,{width:720,height:540,mimeType:"image/jpeg",quality:.86}):s}function w(){n.monthLabel.textContent=U(a.currentMonth);const e=I(a.currentMonth.getFullYear(),a.currentMonth.getMonth());n.calendarGrid.innerHTML=e.map(t=>{if(!t)return'<div class="calendar-day is-empty"></div>';const s=`${t.getFullYear()}-${`${t.getMonth()+1}`.padStart(2,"0")}-${`${t.getDate()}`.padStart(2,"0")}`,i=a.uploadMap[s]||0;return`
      <button class="${["calendar-day",i?"has-data":"",a.selectedDate===s?"is-selected":""].filter(Boolean).join(" ")}" type="button" data-calendar-date="${s}">
        <span>${t.getDate()}</span>
        ${i?`<span class="calendar-dot" title="${i} 張相片"></span>`:"<span></span>"}
      </button>
    `}).join(""),n.calendarGrid.querySelectorAll("[data-calendar-date]").forEach(t=>{t.addEventListener("click",async()=>{a.selectedDate=t.dataset.calendarDate,await g(),w(),K()})})}function M(){a.filters.find(t=>t.id===a.selectedFilterId)||(a.selectedFilterId=a.filters[0]?.id||"");const e=a.filters.find(t=>t.id===a.selectedFilterId);if(n.selectedFilterChip.textContent=e?`批量 filter：${e.name}`:"尚未有已儲存 filter",!a.filters.length){n.filterList.innerHTML=`
      <div class="empty-state">
        <strong>暫時沒有已儲存 filter</strong>
        <p class="muted-copy">先進入任一張相片的進階調色頁，另存一個命名 filter。</p>
      </div>
    `;return}n.filterList.innerHTML=a.filters.map(t=>`
    <button class="filter-card ${t.id===a.selectedFilterId?"is-selected":""}" type="button" data-filter-id="${t.id}">
      <strong>${t.name}</strong>
      <p>亮度 ${t.adjustments.brightness} / 對比 ${t.adjustments.contrast} / 飽和 ${t.adjustments.saturation} / 色溫 ${t.adjustments.temperature}</p>
    </button>
  `).join(""),n.filterList.querySelectorAll("[data-filter-id]").forEach(t=>{t.addEventListener("click",()=>{a.selectedFilterId=t.dataset.filterId,M()})})}function Y(e){return`
    <article class="photo-card photo-card-missing">
      <div class="empty-state compact photo-missing-state">
        <strong>相片已刪除</strong>
        <p class="muted-copy">這組案件資料仍然存在，但原始相片已從圖片庫刪除。</p>
      </div>
      <div class="photo-body">
        <div class="chip-row">
          <span class="meta-chip">已刪除</span>
        </div>
        <strong>${e.reference}</strong>
        <p>${e.notes||"未填整組備註"}</p>
      </div>
      <div class="photo-actions"></div>
    </article>
  `}async function z(){const e=[...n.setList.querySelectorAll("[data-photo-id]")];await Promise.all(e.map(async t=>{const s=t.dataset.photoId,i=t.querySelector("img"),r=a.captureSets.flatMap(o=>y(o)).find(o=>o.photo.id===s)?.photo;if(!(!r||!i))try{i.src=await R(r,"thumb")}catch(o){t.querySelector(".photo-body p").textContent=d(o)}}))}async function g(){n.selectedDateTitle.textContent=x(a.selectedDate);try{a.captureSets=await B(a.selectedDate)}catch(e){a.captureSets=[],n.setList.innerHTML=`
      <div class="empty-state">
        <strong>讀取失敗</strong>
        <p class="muted-copy">${d(e)}</p>
      </div>
    `,c(d(e),"danger");return}if(n.selectedDateMeta.textContent=H(a.captureSets),!a.captureSets.length){n.setList.innerHTML=`
      <div class="empty-state">
        <strong>這一天沒有相片</strong>
        <p class="muted-copy">回到 Check-in 或安裝維修保養頁面建立新案件，日曆便會自動出現標記。</p>
      </div>
    `;return}n.setList.innerHTML=a.captureSets.map(e=>{const t=v(e),i=y(e).map(({photo:r,kindLabel:o,itemName:u,itemNames:p})=>{const h=a.filters.find(l=>l.id===r.savedFilterId)?.name||(r.savedFilterId?"已套用 filter":"未套用 filter"),m=(p||[]).map(l=>`<span class="meta-chip">${l}</span>`).join("");return`
        <article class="photo-card" data-photo-id="${r.id}">
          <img alt="${r.fileName}">
          <div class="photo-body">
            <div class="chip-row">
              <span class="meta-chip">${o}</span>
              ${m||(u?`<span class="meta-chip">${u}</span>`:"")}
              <span class="meta-chip">${h}</span>
            </div>
            <strong>${r.fileName}</strong>
            <p>${e.notes||"未填整組備註"}</p>
          </div>
          <div class="photo-actions">
            <a class="secondary-button" href="./detail.html?photo=${encodeURIComponent(r.id)}">進階調色</a>
          </div>
        </article>
      `}).join("")||Y(e);return`
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
        <div class="photo-stack">${i}</div>
      </section>
    `}).join(""),await z()}async function G(){a.filters=b(await j()),M()}async function O(){if(!a.selectedFilterId){c("請先選擇一個已儲存 filter。","danger");return}n.applyDayFilterBtn.disabled=!0,c("正在為當天相片套用 filter...","");try{const e=await P(a.selectedDate,a.selectedFilterId);c(`已為 ${e} 張相片套用 filter。`,"success"),await g()}catch(e){c(d(e),"danger")}finally{n.applyDayFilterBtn.disabled=!1}}function J(e,t){const s=URL.createObjectURL(e),i=document.createElement("a");i.href=s,i.download=t,i.click(),setTimeout(()=>URL.revokeObjectURL(s),1e3)}async function Q(){if(!a.captureSets.length){c("這一天沒有可下載的相片。","danger");return}n.downloadDayBtn.disabled=!0,c("正在打包當天相片...","");try{const e=new window.JSZip;for(const s of a.captureSets){const i=e.folder($(v(s)));let r=1;for(const{photo:o,itemName:u,itemNames:p}of y(s)){const h=await D(o.storagePath),m=await C(h,o.adjustments,{mimeType:o.mimeType==="image/png"?"image/png":"image/jpeg",quality:.92}),l=o.mimeType==="image/png"?"png":"jpg",S=(p||[]).join("+")||u||o.itemId,F=o.kind==="vehicle"?`vehicle-${r}.${l}`:`accessory-${$(S||`item-${r}`)}-${r}.${l}`;i.file(F,m),r+=1}}const t=await e.generateAsync({type:"blob"});J(t,`garage-photos-${a.selectedDate}.zip`),c("下載壓縮包已開始。","success")}catch(e){c(d(e),"danger")}finally{n.downloadDayBtn.disabled=!1}}async function f(e){a.currentMonth=new Date(e.getFullYear(),e.getMonth(),1);try{a.uploadMap=await q(a.currentMonth.getFullYear(),a.currentMonth.getMonth()),w()}catch(t){c(d(t),"danger")}}function K(){const e=new URL(window.location.href);e.searchParams.set("date",a.selectedDate),window.history.replaceState({},"",e)}function W(){n.applyDayFilterBtn.addEventListener("click",O),n.downloadDayBtn.addEventListener("click",Q),n.prevMonthBtn.addEventListener("click",async()=>{const e=new Date(a.currentMonth.getFullYear(),a.currentMonth.getMonth()-1,1);await f(e)}),n.nextMonthBtn.addEventListener("click",async()=>{const e=new Date(a.currentMonth.getFullYear(),a.currentMonth.getMonth()+1,1);await f(e)})}async function Z(){const e=await L(["superadmin","supreadmin"],"../index.html");A(e);const t=a.selectedDate?new Date(`${a.selectedDate}T00:00:00`):new Date;a.selectedDate||(a.selectedDate=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`),W(),c("讀取日曆與 filter 中...","");try{await G(),await f(t),await g(),c("已連接 Supabase。","success")}catch(s){c(d(s),"danger")}}Z();
