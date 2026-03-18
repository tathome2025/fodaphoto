import{r as P,C as D,d as g,D as I,x as E,z as S,p as x,E as k}from"./workbench-D6gZtMOq.js";const l={photos:[],groups:[],selectedPhotoIds:new Set};let d=null;const a={currentUserEmail:document.querySelector("#currentUserEmail"),galleryMeta:document.querySelector("#galleryMeta"),galleryCountChip:document.querySelector("#galleryCountChip"),gallerySelectedChip:document.querySelector("#gallerySelectedChip"),deleteSelectedBtn:document.querySelector("#deleteSelectedBtn"),galleryStatus:document.querySelector("#galleryStatus"),galleryDateList:document.querySelector("#galleryDateList"),galleryLightbox:document.querySelector("#galleryLightbox"),galleryLightboxClose:document.querySelector("#galleryLightboxClose"),galleryLightboxImage:document.querySelector("#galleryLightboxImage"),galleryLightboxTitle:document.querySelector("#galleryLightboxTitle"),galleryLightboxSubtitle:document.querySelector("#galleryLightboxSubtitle"),galleryLightboxOperator:document.querySelector("#galleryLightboxOperator")};function q(e){a.currentUserEmail&&(a.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function i(e,t){a.galleryStatus.textContent=e,a.galleryStatus.className="status-text",t&&a.galleryStatus.classList.add(`is-${t}`)}function B(){return l.selectedPhotoIds.size}function y(){const e=B();a.gallerySelectedChip&&(a.gallerySelectedChip.textContent=e?`已選 ${e} 張`:"未選取相片"),a.deleteSelectedBtn&&(a.deleteSelectedBtn.disabled=e===0)}function v(e){const t=e.captureSet?.brandName||"未關聯品牌",o=e.captureSet?.vehicleModel?` ${e.captureSet.vehicleModel}`:"";return`${t}${o}`}function $(e){return e.kind==="vehicle"?"Check-in 車輛照":e.itemLabel||"未分類工序"}function C(e){const t=[],o=new Map;return e.forEach(s=>{const r=I(s.createdAt);if(!o.has(r)){const n={dateKey:r,photos:[]};o.set(r,n),t.push(n)}o.get(r).photos.push(s)}),t}function M(e){const t=e.captureSet?.reference||"未關聯案件",o=l.selectedPhotoIds.has(e.id);return`
    <article class="gallery-photo-card ${o?"is-selected":""}">
      <label class="gallery-photo-select">
        <input type="checkbox" data-select-photo="${e.id}" ${o?"checked":""}>
        <span>選取</span>
      </label>
      <button class="gallery-photo-button" type="button" data-photo-id="${e.id}" aria-label="查看 ${e.fileName}">
        <div class="gallery-photo-frame" data-photo-path="${e.storagePath}">
          <img alt="${e.fileName}">
        </div>
        <div class="gallery-photo-caption">
          <strong>${v(e)}</strong>
          <span>${$(e)}</span>
          <span>${t} · ${S(e.createdAt)}</span>
          <span>${e.createdByLabel||"未記錄上傳帳號"}</span>
        </div>
      </button>
    </article>
  `}function p(){if(a.galleryCountChip.textContent=`${l.photos.length} 張相片`,y(),a.galleryMeta.textContent=l.photos.length?`全部相片按上傳日期分段，最新日期與最新相片排在最上方。現時共有 ${l.groups.length} 個上傳日期分組。`:"目前未有任何相片紀錄。",!l.groups.length){a.galleryDateList.innerHTML=`
      <div class="empty-state">
        <strong>目前未有相片紀錄</strong>
        <p class="muted-copy">當車輛完成 Check-in 或安裝維修保養拍攝後，這裡就會顯示所有相片。</p>
      </div>
    `;return}a.galleryDateList.innerHTML=l.groups.map(e=>`
    <section class="gallery-date-group">
      <div class="gallery-date-head">
        <div>
          <p class="eyebrow">Upload Date</p>
          <h2>${E(e.dateKey)}</h2>
          <p class="muted-copy">${e.photos.length} 張相片</p>
        </div>
        <div class="gallery-date-actions">
          <span class="filter-chip">${e.dateKey}</span>
          <button class="secondary-button" type="button" data-select-date="${e.dateKey}">全選當日</button>
          <button class="secondary-button" type="button" data-clear-date="${e.dateKey}">清除當日</button>
          <button class="secondary-button gallery-delete-btn" type="button" data-delete-date="${e.dateKey}">刪除當日已選</button>
        </div>
      </div>
      <div class="gallery-date-divider"></div>
      <div class="gallery-photo-grid">
        ${e.photos.map(t=>M(t)).join("")}
      </div>
    </section>
  `).join("")}function w(e){return l.groups.find(t=>t.dateKey===e)?.photos||[]}function m(e,t){w(e).forEach(o=>{if(t){l.selectedPhotoIds.add(o.id);return}l.selectedPhotoIds.delete(o.id)}),p(),b()}async function f(e){const t=l.photos.filter(r=>e.includes(r.id));if(!t.length){i("請先選取相片。","danger");return}const o=t.length,s=o===1?"確定刪除這 1 張相片？刪除後不可還原。":`確定刪除這 ${o} 張相片？刪除後不可還原。`;if(window.confirm(s)){a.deleteSelectedBtn&&(a.deleteSelectedBtn.disabled=!0),i(`正在刪除 ${o} 張相片...`,"");try{const r=await k(t),n=new Set(t.map(c=>c.id));l.photos=l.photos.filter(c=>!n.has(c.id)),n.forEach(c=>l.selectedPhotoIds.delete(c)),l.groups=C(l.photos),p(),await b(),u(),i(`已刪除 ${r} 張相片。`,"success")}catch(r){y(),i(g(r),"danger")}}}async function b(){const e=[...a.galleryDateList.querySelectorAll("[data-photo-path]")];if(e.length){if(d&&d.disconnect(),"IntersectionObserver"in window){d=new IntersectionObserver(t=>{t.forEach(o=>{o.isIntersecting&&(d.unobserve(o.target),L(o.target))})},{rootMargin:"320px 0px",threshold:.01}),e.forEach(t=>{d.observe(t)});return}for(const t of e)await L(t)}}async function L(e){if(!e||e.dataset.thumbState==="loading"||e.dataset.thumbState==="done")return;const t=e.querySelector("img");if(t){e.dataset.thumbState="loading";try{t.src=await x(e.dataset.photoPath,{width:360,height:360}),e.dataset.thumbState="done"}catch{e.dataset.thumbState="error",e.classList.add("is-error")}}}function u(){a.galleryLightbox.hidden=!0,a.galleryLightboxImage.removeAttribute("src"),document.body.classList.remove("model-open")}async function T(e){const t=l.photos.find(o=>o.id===e);if(t){a.galleryLightbox.hidden=!1,document.body.classList.add("model-open"),a.galleryLightboxTitle.textContent=`${v(t)} · ${$(t)}`,a.galleryLightboxSubtitle.textContent=`${t.captureSet?.reference||"未關聯案件"} · ${S(t.createdAt)}`,a.galleryLightboxOperator.textContent=`上傳帳號：${t.createdByLabel||"未記錄"}`,a.galleryLightboxImage.removeAttribute("src");try{a.galleryLightboxImage.src=await x(t.storagePath,{width:1600,height:1600})}catch(o){a.galleryLightboxTitle.textContent="圖片讀取失敗",a.galleryLightboxSubtitle.textContent=g(o),a.galleryLightboxOperator.textContent=t.storagePath}}}function K(){a.galleryDateList.addEventListener("click",async e=>{const t=e.target.closest("[data-select-date]");if(t){m(t.dataset.selectDate,!0);return}const o=e.target.closest("[data-clear-date]");if(o){m(o.dataset.clearDate,!1);return}const s=e.target.closest("[data-delete-date]");if(s){const n=s.dataset.deleteDate,c=w(n).map(h=>h.id).filter(h=>l.selectedPhotoIds.has(h));await f(c);return}const r=e.target.closest("[data-photo-id]");r&&await T(r.dataset.photoId)}),a.galleryDateList.addEventListener("change",e=>{const t=e.target.closest("[data-select-photo]");t&&(t.checked?l.selectedPhotoIds.add(t.dataset.selectPhoto):l.selectedPhotoIds.delete(t.dataset.selectPhoto),y(),t.closest(".gallery-photo-card")?.classList.toggle("is-selected",t.checked))}),a.galleryLightboxClose.addEventListener("click",u),a.galleryLightbox.addEventListener("click",e=>{e.target===a.galleryLightbox&&u()}),document.addEventListener("keydown",e=>{e.key==="Escape"&&!a.galleryLightbox.hidden&&u()}),a.deleteSelectedBtn.addEventListener("click",async()=>{await f([...l.selectedPhotoIds])})}async function A(){const e=await P(["superadmin","supreadmin"],"../index.html");q(e),i("正在載入全部圖片...","");try{l.photos=await D(),l.groups=C(l.photos),p(),await b(),i(l.photos.length?"已載入全部圖片庫。":"目前未有相片資料。",l.photos.length?"success":"")}catch(t){a.galleryDateList.innerHTML=`
      <div class="empty-state">
        <strong>讀取圖片庫失敗</strong>
        <p class="muted-copy">${g(t)}</p>
      </div>
    `,i(g(t),"danger")}K()}A();
