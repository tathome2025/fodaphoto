import{r as p,C as m,d as c,D as b,x as L,p as d,z as u}from"./workbench-BT-2qLI8.js";const l={photos:[],groups:[]},a={currentUserEmail:document.querySelector("#currentUserEmail"),galleryMeta:document.querySelector("#galleryMeta"),galleryCountChip:document.querySelector("#galleryCountChip"),galleryStatus:document.querySelector("#galleryStatus"),galleryDateList:document.querySelector("#galleryDateList"),galleryLightbox:document.querySelector("#galleryLightbox"),galleryLightboxClose:document.querySelector("#galleryLightboxClose"),galleryLightboxImage:document.querySelector("#galleryLightboxImage"),galleryLightboxTitle:document.querySelector("#galleryLightboxTitle"),galleryLightboxSubtitle:document.querySelector("#galleryLightboxSubtitle"),galleryLightboxOperator:document.querySelector("#galleryLightboxOperator")};function x(e){a.currentUserEmail&&(a.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function n(e,t){a.galleryStatus.textContent=e,a.galleryStatus.className="status-text",t&&a.galleryStatus.classList.add(`is-${t}`)}function y(e){const t=e.captureSet?.brandName||"未關聯品牌",r=e.captureSet?.vehicleModel?` ${e.captureSet.vehicleModel}`:"";return`${t}${r}`}function h(e){return e.kind==="vehicle"?"Check-in 車輛照":e.itemLabel||"未分類工序"}function f(e){const t=[],r=new Map;return e.forEach(i=>{const o=b(i.createdAt);if(!r.has(o)){const g={dateKey:o,photos:[]};r.set(o,g),t.push(g)}r.get(o).photos.push(i)}),t}function S(e){const t=e.captureSet?.reference||"未關聯案件";return`
    <article class="gallery-photo-card">
      <button class="gallery-photo-button" type="button" data-photo-id="${e.id}" aria-label="查看 ${e.fileName}">
        <div class="gallery-photo-frame" data-photo-path="${e.storagePath}">
          <img alt="${e.fileName}">
        </div>
        <div class="gallery-photo-caption">
          <strong>${y(e)}</strong>
          <span>${h(e)}</span>
          <span>${t} · ${u(e.createdAt)}</span>
          <span>${e.createdByLabel||"未記錄上傳帳號"}</span>
        </div>
      </button>
    </article>
  `}function v(){if(a.galleryCountChip.textContent=`${l.photos.length} 張相片`,a.galleryMeta.textContent=l.photos.length?`全部相片按上傳日期分段，最新日期與最新相片排在最上方。現時共有 ${l.groups.length} 個上傳日期分組。`:"目前未有任何相片紀錄。",!l.groups.length){a.galleryDateList.innerHTML=`
      <div class="empty-state">
        <strong>目前未有相片紀錄</strong>
        <p class="muted-copy">當車輛完成 Check-in 或安裝維修保養拍攝後，這裡就會顯示所有相片。</p>
      </div>
    `;return}a.galleryDateList.innerHTML=l.groups.map(e=>`
    <section class="gallery-date-group">
      <div class="gallery-date-head">
        <div>
          <p class="eyebrow">Upload Date</p>
          <h2>${L(e.dateKey)}</h2>
          <p class="muted-copy">${e.photos.length} 張相片</p>
        </div>
        <span class="filter-chip">${e.dateKey}</span>
      </div>
      <div class="gallery-date-divider"></div>
      <div class="gallery-photo-grid">
        ${e.photos.map(t=>S(t)).join("")}
      </div>
    </section>
  `).join("")}async function $(){const e=[...a.galleryDateList.querySelectorAll("[data-photo-path]")];await Promise.all(e.map(async t=>{const r=t.querySelector("img");if(r)try{r.src=await d(t.dataset.photoPath,{width:360,height:360})}catch{t.classList.add("is-error")}}))}function s(){a.galleryLightbox.hidden=!0,a.galleryLightboxImage.removeAttribute("src"),document.body.classList.remove("model-open")}async function C(e){const t=l.photos.find(r=>r.id===e);if(t){a.galleryLightbox.hidden=!1,document.body.classList.add("model-open"),a.galleryLightboxTitle.textContent=`${y(t)} · ${h(t)}`,a.galleryLightboxSubtitle.textContent=`${t.captureSet?.reference||"未關聯案件"} · ${u(t.createdAt)}`,a.galleryLightboxOperator.textContent=`上傳帳號：${t.createdByLabel||"未記錄"}`,a.galleryLightboxImage.removeAttribute("src");try{a.galleryLightboxImage.src=await d(t.storagePath,{width:1600,height:1600})}catch(r){a.galleryLightboxTitle.textContent="圖片讀取失敗",a.galleryLightboxSubtitle.textContent=c(r),a.galleryLightboxOperator.textContent=t.storagePath}}}function q(){a.galleryDateList.addEventListener("click",async e=>{const t=e.target.closest("[data-photo-id]");t&&await C(t.dataset.photoId)}),a.galleryLightboxClose.addEventListener("click",s),a.galleryLightbox.addEventListener("click",e=>{e.target===a.galleryLightbox&&s()}),document.addEventListener("keydown",e=>{e.key==="Escape"&&!a.galleryLightbox.hidden&&s()})}async function w(){const e=await p(["superadmin","supreadmin"],"../index.html");x(e),n("正在載入全部圖片...","");try{l.photos=await m(),l.groups=f(l.photos),v(),await $(),n(l.photos.length?"已載入全部圖片庫。":"目前未有相片資料。",l.photos.length?"success":"")}catch(t){a.galleryDateList.innerHTML=`
      <div class="empty-state">
        <strong>讀取圖片庫失敗</strong>
        <p class="muted-copy">${c(t)}</p>
      </div>
    `,n(c(t),"danger")}q()}w();
