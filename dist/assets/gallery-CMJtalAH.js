import{r as v,C as $,d as g,D as C,x as P,z as m,p as f,E as w}from"./workbench-DrXLKKbW.js";const o={photos:[],groups:[],selectedPhotoIds:new Set};let i=null;const a={currentUserEmail:document.querySelector("#currentUserEmail"),galleryMeta:document.querySelector("#galleryMeta"),galleryCountChip:document.querySelector("#galleryCountChip"),gallerySelectedChip:document.querySelector("#gallerySelectedChip"),deleteSelectedBtn:document.querySelector("#deleteSelectedBtn"),galleryStatus:document.querySelector("#galleryStatus"),galleryDateList:document.querySelector("#galleryDateList"),galleryLightbox:document.querySelector("#galleryLightbox"),galleryLightboxClose:document.querySelector("#galleryLightboxClose"),galleryLightboxImage:document.querySelector("#galleryLightboxImage"),galleryLightboxTitle:document.querySelector("#galleryLightboxTitle"),galleryLightboxSubtitle:document.querySelector("#galleryLightboxSubtitle"),galleryLightboxOperator:document.querySelector("#galleryLightboxOperator")};function I(e){a.currentUserEmail&&(a.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function s(e,t){a.galleryStatus.textContent=e,a.galleryStatus.className="status-text",t&&a.galleryStatus.classList.add(`is-${t}`)}function k(){return o.selectedPhotoIds.size}function u(){const e=k();a.gallerySelectedChip&&(a.gallerySelectedChip.textContent=e?`已選 ${e} 張`:"未選取相片"),a.deleteSelectedBtn&&(a.deleteSelectedBtn.disabled=e===0)}function L(e){const t=e.captureSet?.brandName||"未關聯品牌",l=e.captureSet?.vehicleModel?` ${e.captureSet.vehicleModel}`:"";return`${t}${l}`}function S(e){return e.kind==="vehicle"?"Check-in 車輛照":e.itemLabel||"未分類工序"}function x(e){const t=[],l=new Map;return e.forEach(d=>{const r=C(d.createdAt);if(!l.has(r)){const n={dateKey:r,photos:[]};l.set(r,n),t.push(n)}l.get(r).photos.push(d)}),t}function E(e){const t=e.captureSet?.reference||"未關聯案件",l=o.selectedPhotoIds.has(e.id);return`
    <article class="gallery-photo-card ${l?"is-selected":""}">
      <label class="gallery-photo-select">
        <input type="checkbox" data-select-photo="${e.id}" ${l?"checked":""}>
        <span>選取</span>
      </label>
      <button class="gallery-photo-button" type="button" data-photo-id="${e.id}" aria-label="查看 ${e.fileName}">
        <div class="gallery-photo-frame" data-photo-path="${e.storagePath}">
          <img alt="${e.fileName}">
        </div>
        <div class="gallery-photo-caption">
          <strong>${L(e)}</strong>
          <span>${S(e)}</span>
          <span>${t} · ${m(e.createdAt)}</span>
          <span>${e.createdByLabel||"未記錄上傳帳號"}</span>
        </div>
      </button>
    </article>
  `}function y(){if(a.galleryCountChip.textContent=`${o.photos.length} 張相片`,u(),a.galleryMeta.textContent=o.photos.length?`全部相片按上傳日期分段，最新日期與最新相片排在最上方。現時共有 ${o.groups.length} 個上傳日期分組。`:"目前未有任何相片紀錄。",!o.groups.length){a.galleryDateList.innerHTML=`
      <div class="empty-state">
        <strong>目前未有相片紀錄</strong>
        <p class="muted-copy">當車輛完成 Check-in 或安裝維修保養拍攝後，這裡就會顯示所有相片。</p>
      </div>
    `;return}a.galleryDateList.innerHTML=o.groups.map(e=>`
    <section class="gallery-date-group">
      <div class="gallery-date-head">
        <div>
          <p class="eyebrow">Upload Date</p>
          <h2>${P(e.dateKey)}</h2>
          <p class="muted-copy">${e.photos.length} 張相片</p>
        </div>
        <div class="gallery-date-actions">
          <span class="filter-chip">${e.dateKey}</span>
          <label class="gallery-date-select">
            <input
              type="checkbox"
              data-select-date="${e.dateKey}"
              ${e.photos.every(t=>o.selectedPhotoIds.has(t.id))?"checked":""}
            >
            <span>全選當日</span>
          </label>
        </div>
      </div>
      <div class="gallery-date-divider"></div>
      <div class="gallery-photo-grid">
        ${e.photos.map(t=>E(t)).join("")}
      </div>
    </section>
  `).join("")}function q(e){return o.groups.find(t=>t.dateKey===e)?.photos||[]}function D(e,t){q(e).forEach(l=>{if(t){o.selectedPhotoIds.add(l.id);return}o.selectedPhotoIds.delete(l.id)}),y(),p()}async function M(e){const t=o.photos.filter(r=>e.includes(r.id));if(!t.length){s("請先選取相片。","danger");return}const l=t.length,d=l===1?"確定刪除這 1 張相片？刪除後不可還原。":`確定刪除這 ${l} 張相片？刪除後不可還原。`;if(window.confirm(d)){a.deleteSelectedBtn&&(a.deleteSelectedBtn.disabled=!0),s(`正在刪除 ${l} 張相片...`,"");try{const r=await w(t),n=new Set(t.map(c=>c.id));o.photos=o.photos.filter(c=>!n.has(c.id)),n.forEach(c=>o.selectedPhotoIds.delete(c)),o.groups=x(o.photos),y(),await p(),h(),s(`已刪除 ${r} 張相片。`,"success")}catch(r){u(),s(g(r),"danger")}}}async function p(){const e=[...a.galleryDateList.querySelectorAll("[data-photo-path]")];if(e.length){if(i&&i.disconnect(),"IntersectionObserver"in window){i=new IntersectionObserver(t=>{t.forEach(l=>{l.isIntersecting&&(i.unobserve(l.target),b(l.target))})},{rootMargin:"320px 0px",threshold:.01}),e.forEach(t=>{i.observe(t)});return}for(const t of e)await b(t)}}async function b(e){if(!e||e.dataset.thumbState==="loading"||e.dataset.thumbState==="done")return;const t=e.querySelector("img");if(t){e.dataset.thumbState="loading";try{t.src=await f(e.dataset.photoPath,{width:360,height:360}),e.dataset.thumbState="done"}catch{e.dataset.thumbState="error",e.classList.add("is-error")}}}function h(){a.galleryLightbox.hidden=!0,a.galleryLightboxImage.removeAttribute("src"),document.body.classList.remove("model-open")}async function T(e){const t=o.photos.find(l=>l.id===e);if(t){a.galleryLightbox.hidden=!1,document.body.classList.add("model-open"),a.galleryLightboxTitle.textContent=`${L(t)} · ${S(t)}`,a.galleryLightboxSubtitle.textContent=`${t.captureSet?.reference||"未關聯案件"} · ${m(t.createdAt)}`,a.galleryLightboxOperator.textContent=`上傳帳號：${t.createdByLabel||"未記錄"}`,a.galleryLightboxImage.removeAttribute("src");try{a.galleryLightboxImage.src=await f(t.storagePath,{width:1600,height:1600})}catch(l){a.galleryLightboxTitle.textContent="圖片讀取失敗",a.galleryLightboxSubtitle.textContent=g(l),a.galleryLightboxOperator.textContent=t.storagePath}}}function B(){a.galleryDateList.addEventListener("click",async e=>{const t=e.target.closest("[data-photo-id]");t&&await T(t.dataset.photoId)}),a.galleryDateList.addEventListener("change",e=>{const t=e.target.closest("[data-select-date]");if(t){D(t.dataset.selectDate,t.checked);return}const l=e.target.closest("[data-select-photo]");l&&(l.checked?o.selectedPhotoIds.add(l.dataset.selectPhoto):o.selectedPhotoIds.delete(l.dataset.selectPhoto),u(),l.closest(".gallery-photo-card")?.classList.toggle("is-selected",l.checked))}),a.galleryLightboxClose.addEventListener("click",h),a.galleryLightbox.addEventListener("click",e=>{e.target===a.galleryLightbox&&h()}),document.addEventListener("keydown",e=>{e.key==="Escape"&&!a.galleryLightbox.hidden&&h()}),a.deleteSelectedBtn.addEventListener("click",async()=>{await M([...o.selectedPhotoIds])})}async function A(){const e=await v(["superadmin","supreadmin"],"../index.html");I(e),s("正在載入全部圖片...","");try{o.photos=await $(),o.groups=x(o.photos),y(),await p(),s(o.photos.length?"已載入全部圖片庫。":"目前未有相片資料。",o.photos.length?"success":"")}catch(t){a.galleryDateList.innerHTML=`
      <div class="empty-state">
        <strong>讀取圖片庫失敗</strong>
        <p class="muted-copy">${g(t)}</p>
      </div>
    `,s(g(t),"danger")}B()}A();
