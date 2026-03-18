import{r as m,C as L,d as c,D as x,x as f,z as h,p as y}from"./workbench-DXxRXhVJ.js";const o={photos:[],groups:[]};let l=null;const a={currentUserEmail:document.querySelector("#currentUserEmail"),galleryMeta:document.querySelector("#galleryMeta"),galleryCountChip:document.querySelector("#galleryCountChip"),galleryStatus:document.querySelector("#galleryStatus"),galleryDateList:document.querySelector("#galleryDateList"),galleryLightbox:document.querySelector("#galleryLightbox"),galleryLightboxClose:document.querySelector("#galleryLightboxClose"),galleryLightboxImage:document.querySelector("#galleryLightboxImage"),galleryLightboxTitle:document.querySelector("#galleryLightboxTitle"),galleryLightboxSubtitle:document.querySelector("#galleryLightboxSubtitle"),galleryLightboxOperator:document.querySelector("#galleryLightboxOperator")};function v(e){a.currentUserEmail&&(a.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function i(e,t){a.galleryStatus.textContent=e,a.galleryStatus.className="status-text",t&&a.galleryStatus.classList.add(`is-${t}`)}function p(e){const t=e.captureSet?.brandName||"未關聯品牌",r=e.captureSet?.vehicleModel?` ${e.captureSet.vehicleModel}`:"";return`${t}${r}`}function b(e){return e.kind==="vehicle"?"Check-in 車輛照":e.itemLabel||"未分類工序"}function S(e){const t=[],r=new Map;return e.forEach(g=>{const n=x(g.createdAt);if(!r.has(n)){const d={dateKey:n,photos:[]};r.set(n,d),t.push(d)}r.get(n).photos.push(g)}),t}function $(e){const t=e.captureSet?.reference||"未關聯案件";return`
    <article class="gallery-photo-card">
      <button class="gallery-photo-button" type="button" data-photo-id="${e.id}" aria-label="查看 ${e.fileName}">
        <div class="gallery-photo-frame" data-photo-path="${e.storagePath}">
          <img alt="${e.fileName}">
        </div>
        <div class="gallery-photo-caption">
          <strong>${p(e)}</strong>
          <span>${b(e)}</span>
          <span>${t} · ${h(e.createdAt)}</span>
          <span>${e.createdByLabel||"未記錄上傳帳號"}</span>
        </div>
      </button>
    </article>
  `}function C(){if(a.galleryCountChip.textContent=`${o.photos.length} 張相片`,a.galleryMeta.textContent=o.photos.length?`全部相片按上傳日期分段，最新日期與最新相片排在最上方。現時共有 ${o.groups.length} 個上傳日期分組。`:"目前未有任何相片紀錄。",!o.groups.length){a.galleryDateList.innerHTML=`
      <div class="empty-state">
        <strong>目前未有相片紀錄</strong>
        <p class="muted-copy">當車輛完成 Check-in 或安裝維修保養拍攝後，這裡就會顯示所有相片。</p>
      </div>
    `;return}a.galleryDateList.innerHTML=o.groups.map(e=>`
    <section class="gallery-date-group">
      <div class="gallery-date-head">
        <div>
          <p class="eyebrow">Upload Date</p>
          <h2>${f(e.dateKey)}</h2>
          <p class="muted-copy">${e.photos.length} 張相片</p>
        </div>
        <span class="filter-chip">${e.dateKey}</span>
      </div>
      <div class="gallery-date-divider"></div>
      <div class="gallery-photo-grid">
        ${e.photos.map(t=>$(t)).join("")}
      </div>
    </section>
  `).join("")}async function w(){const e=[...a.galleryDateList.querySelectorAll("[data-photo-path]")];if(e.length){if(l&&l.disconnect(),"IntersectionObserver"in window){l=new IntersectionObserver(t=>{t.forEach(r=>{r.isIntersecting&&(l.unobserve(r.target),u(r.target))})},{rootMargin:"320px 0px",threshold:.01}),e.forEach(t=>{l.observe(t)});return}for(const t of e)await u(t)}}async function u(e){if(!e||e.dataset.thumbState==="loading"||e.dataset.thumbState==="done")return;const t=e.querySelector("img");if(t){e.dataset.thumbState="loading";try{t.src=await y(e.dataset.photoPath,{width:360,height:360}),e.dataset.thumbState="done"}catch{e.dataset.thumbState="error",e.classList.add("is-error")}}}function s(){a.galleryLightbox.hidden=!0,a.galleryLightboxImage.removeAttribute("src"),document.body.classList.remove("model-open")}async function q(e){const t=o.photos.find(r=>r.id===e);if(t){a.galleryLightbox.hidden=!1,document.body.classList.add("model-open"),a.galleryLightboxTitle.textContent=`${p(t)} · ${b(t)}`,a.galleryLightboxSubtitle.textContent=`${t.captureSet?.reference||"未關聯案件"} · ${h(t.createdAt)}`,a.galleryLightboxOperator.textContent=`上傳帳號：${t.createdByLabel||"未記錄"}`,a.galleryLightboxImage.removeAttribute("src");try{a.galleryLightboxImage.src=await y(t.storagePath,{width:1600,height:1600})}catch(r){a.galleryLightboxTitle.textContent="圖片讀取失敗",a.galleryLightboxSubtitle.textContent=c(r),a.galleryLightboxOperator.textContent=t.storagePath}}}function E(){a.galleryDateList.addEventListener("click",async e=>{const t=e.target.closest("[data-photo-id]");t&&await q(t.dataset.photoId)}),a.galleryLightboxClose.addEventListener("click",s),a.galleryLightbox.addEventListener("click",e=>{e.target===a.galleryLightbox&&s()}),document.addEventListener("keydown",e=>{e.key==="Escape"&&!a.galleryLightbox.hidden&&s()})}async function D(){const e=await m(["superadmin","supreadmin"],"../index.html");v(e),i("正在載入全部圖片...","");try{o.photos=await L(),o.groups=S(o.photos),C(),await w(),i(o.photos.length?"已載入全部圖片庫。":"目前未有相片資料。",o.photos.length?"success":"")}catch(t){a.galleryDateList.innerHTML=`
      <div class="empty-state">
        <strong>讀取圖片庫失敗</strong>
        <p class="muted-copy">${c(t)}</p>
      </div>
    `,i(c(t),"danger")}E()}D();
