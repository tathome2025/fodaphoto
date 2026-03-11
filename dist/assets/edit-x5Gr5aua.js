import{r as L,d,u as b,v as j,w as B,x as q,y as x,z as D,A as y,B as $,n as w,C,D as I,E as T,F as U,G as E,H as N,I as k}from"./workbench-BWuwk5XA.js";const A=new URLSearchParams(window.location.search).get("date"),t={selectedDate:A||null,currentMonth:null,selectedFilterId:"",filters:[],captureSets:[],uploadMap:{}},n={monthLabel:document.querySelector("#monthLabel"),calendarGrid:document.querySelector("#calendarGrid"),selectedDateTitle:document.querySelector("#selectedDateTitle"),selectedDateMeta:document.querySelector("#selectedDateMeta"),setList:document.querySelector("#setList"),filterList:document.querySelector("#filterList"),applyDayFilterBtn:document.querySelector("#applyDayFilterBtn"),downloadDayBtn:document.querySelector("#downloadDayBtn"),selectedFilterChip:document.querySelector("#selectedFilterChip"),editStatus:document.querySelector("#editStatus"),prevMonthBtn:document.querySelector("#prevMonthBtn"),nextMonthBtn:document.querySelector("#nextMonthBtn")};function c(e,a){n.editStatus.textContent=e,n.editStatus.className="status-text",a&&n.editStatus.classList.add(`is-${a}`)}function H(e){const a=e.length,r=e.reduce((s,o)=>s+U(o),0);return`${a} 組案件，${r} 張相片`}async function P(e,a){const r=await w(e.storagePath,{width:720,height:540});return E(e.adjustments)?N(r,e.adjustments,{width:720,height:540,mimeType:"image/jpeg",quality:.86}):r}function M(){n.monthLabel.textContent=I(t.currentMonth);const e=T(t.currentMonth.getFullYear(),t.currentMonth.getMonth());n.calendarGrid.innerHTML=e.map(a=>{if(!a)return'<div class="calendar-day is-empty"></div>';const r=`${a.getFullYear()}-${`${a.getMonth()+1}`.padStart(2,"0")}-${`${a.getDate()}`.padStart(2,"0")}`,s=t.uploadMap[r]||0;return`
      <button class="${["calendar-day",s?"has-data":"",t.selectedDate===r?"is-selected":""].filter(Boolean).join(" ")}" type="button" data-calendar-date="${r}">
        <span>${a.getDate()}</span>
        ${s?`<span class="calendar-dot" title="${s} 張相片"></span>`:"<span></span>"}
      </button>
    `}).join(""),n.calendarGrid.querySelectorAll("[data-calendar-date]").forEach(a=>{a.addEventListener("click",async()=>{t.selectedDate=a.dataset.calendarDate,await f(),M(),J()})})}function v(){t.filters.find(a=>a.id===t.selectedFilterId)||(t.selectedFilterId=t.filters[0]?.id||"");const e=t.filters.find(a=>a.id===t.selectedFilterId);if(n.selectedFilterChip.textContent=e?`批量 filter：${e.name}`:"尚未有已儲存 filter",!t.filters.length){n.filterList.innerHTML=`
      <div class="empty-state">
        <strong>暫時沒有已儲存 filter</strong>
        <p class="muted-copy">先進入任一張相片的進階調色頁，另存一個命名 filter。</p>
      </div>
    `;return}n.filterList.innerHTML=t.filters.map(a=>`
    <button class="filter-card ${a.id===t.selectedFilterId?"is-selected":""}" type="button" data-filter-id="${a.id}">
      <strong>${a.name}</strong>
      <p>亮度 ${a.adjustments.brightness} / 對比 ${a.adjustments.contrast} / 飽和 ${a.adjustments.saturation} / 色溫 ${a.adjustments.temperature}</p>
    </button>
  `).join(""),n.filterList.querySelectorAll("[data-filter-id]").forEach(a=>{a.addEventListener("click",()=>{t.selectedFilterId=a.dataset.filterId,v()})})}async function R(){const e=[...n.setList.querySelectorAll("[data-photo-id]")];await Promise.all(e.map(async a=>{const r=a.dataset.photoId,s=a.querySelector("img"),o=t.captureSets.flatMap(i=>y(i)).find(i=>i.photo.id===r)?.photo;if(!(!o||!s))try{s.src=await P(o,"thumb")}catch(i){a.querySelector(".photo-body p").textContent=d(i)}}))}async function f(){n.selectedDateTitle.textContent=q(t.selectedDate);try{t.captureSets=await x(t.selectedDate)}catch(e){t.captureSets=[],n.setList.innerHTML=`
      <div class="empty-state">
        <strong>讀取失敗</strong>
        <p class="muted-copy">${d(e)}</p>
      </div>
    `,c(d(e),"danger");return}if(n.selectedDateMeta.textContent=H(t.captureSets),!t.captureSets.length){n.setList.innerHTML=`
      <div class="empty-state">
        <strong>這一天沒有相片</strong>
        <p class="muted-copy">回到 Check-in 或安裝維修保養頁面建立新案件，日曆便會自動出現標記。</p>
      </div>
    `;return}n.setList.innerHTML=t.captureSets.map(e=>{const a=D(e),r=y(e).map(({photo:s,kindLabel:o,itemName:i,itemNames:u})=>{const p=t.filters.find(l=>l.id===s.savedFilterId)?.name||(s.savedFilterId?"已套用 filter":"未套用 filter"),h=(u||[]).map(l=>`<span class="meta-chip">${l}</span>`).join("");return`
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
            <span class="meta-chip">${a}</span>
          </div>
        </div>
        <div class="photo-stack">${r}</div>
      </section>
    `}).join(""),await R()}async function Y(){t.filters=b(await j()),v()}async function G(){if(!t.selectedFilterId){c("請先選擇一個已儲存 filter。","danger");return}n.applyDayFilterBtn.disabled=!0,c("正在為當天相片套用 filter...","");try{const e=await k(t.selectedDate,t.selectedFilterId);c(`已為 ${e} 張相片套用 filter。`,"success"),await f()}catch(e){c(d(e),"danger")}finally{n.applyDayFilterBtn.disabled=!1}}function z(e,a){const r=URL.createObjectURL(e),s=document.createElement("a");s.href=r,s.download=a,s.click(),setTimeout(()=>URL.revokeObjectURL(r),1e3)}async function O(){if(!t.captureSets.length){c("這一天沒有可下載的相片。","danger");return}n.downloadDayBtn.disabled=!0,c("正在打包當天相片...","");try{const e=new window.JSZip;for(const r of t.captureSets){const s=e.folder($(D(r)));let o=1;for(const{photo:i,itemName:u,itemNames:p}of y(r)){const h=await w(i.storagePath),l=await C(h,i.adjustments,{mimeType:i.mimeType==="image/png"?"image/png":"image/jpeg",quality:.92}),g=i.mimeType==="image/png"?"png":"jpg",S=(p||[]).join("+")||u||i.itemId,F=i.kind==="vehicle"?`vehicle-${o}.${g}`:`accessory-${$(S||`item-${o}`)}-${o}.${g}`;s.file(F,l),o+=1}}const a=await e.generateAsync({type:"blob"});z(a,`garage-photos-${t.selectedDate}.zip`),c("下載壓縮包已開始。","success")}catch(e){c(d(e),"danger")}finally{n.downloadDayBtn.disabled=!1}}async function m(e){t.currentMonth=new Date(e.getFullYear(),e.getMonth(),1);try{t.uploadMap=await B(t.currentMonth.getFullYear(),t.currentMonth.getMonth()),M()}catch(a){c(d(a),"danger")}}function J(){const e=new URL(window.location.href);e.searchParams.set("date",t.selectedDate),window.history.replaceState({},"",e)}function Q(){n.applyDayFilterBtn.addEventListener("click",G),n.downloadDayBtn.addEventListener("click",O),n.prevMonthBtn.addEventListener("click",async()=>{const e=new Date(t.currentMonth.getFullYear(),t.currentMonth.getMonth()-1,1);await m(e)}),n.nextMonthBtn.addEventListener("click",async()=>{const e=new Date(t.currentMonth.getFullYear(),t.currentMonth.getMonth()+1,1);await m(e)})}async function W(){await L("../index.html");const e=t.selectedDate?new Date(`${t.selectedDate}T00:00:00`):new Date;t.selectedDate||(t.selectedDate=`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`),Q(),c("讀取日曆與 filter 中...","");try{await Y(),await m(e),await f(),c("已連接 Supabase。","success")}catch(a){c(d(a),"danger")}}W();
