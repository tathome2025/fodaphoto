import{r as C,D as P,d as g,E as I,y as w,A as L,p as f,q as S,P as x,F as k}from"./workbench-VwRDttHn.js";const o={photos:[],groups:[],selectedPhotoIds:new Set};let c=null;const a={currentUserEmail:document.querySelector("#currentUserEmail"),galleryMeta:document.querySelector("#galleryMeta"),galleryCountChip:document.querySelector("#galleryCountChip"),gallerySelectedChip:document.querySelector("#gallerySelectedChip"),deleteSelectedBtn:document.querySelector("#deleteSelectedBtn"),galleryStatus:document.querySelector("#galleryStatus"),galleryDateList:document.querySelector("#galleryDateList"),galleryLightbox:document.querySelector("#galleryLightbox"),galleryLightboxClose:document.querySelector("#galleryLightboxClose"),galleryLightboxImage:document.querySelector("#galleryLightboxImage"),galleryLightboxTitle:document.querySelector("#galleryLightboxTitle"),galleryLightboxSubtitle:document.querySelector("#galleryLightboxSubtitle"),galleryLightboxOperator:document.querySelector("#galleryLightboxOperator")};function E(e){a.currentUserEmail&&(a.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function s(e,t){a.galleryStatus.textContent=e,a.galleryStatus.className="status-text",t&&a.galleryStatus.classList.add(`is-${t}`)}function q(){return o.selectedPhotoIds.size}function y(){const e=q();a.gallerySelectedChip&&(a.gallerySelectedChip.textContent=e?`已選 ${e} 張`:"未選取相片"),a.deleteSelectedBtn&&(a.deleteSelectedBtn.disabled=e===0)}function u(e){const t=e.captureSet?.brandName||"未關聯品牌",l=e.captureSet?.vehicleModel?` ${e.captureSet.vehicleModel}`:"";return`${t}${l}`}function v(e){return e.kind==="vehicle"?"Check-in 車輛照":e.kind==="order_sheet"?"Order Sheet 工作單":e.itemLabel||"未分類工序"}function $(e){const t=[],l=new Map;return e.forEach(d=>{const r=I(d.createdAt);if(!l.has(r)){const n={dateKey:r,photos:[]};l.set(r,n),t.push(n)}l.get(r).photos.push(d)}),t}function D(e){const t=e.captureSet?.reference||"未關聯案件",l=o.selectedPhotoIds.has(e.id);return`
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
          <strong>${u(e)}</strong>
          <span>${v(e)}</span>
          <span>${t} · ${L(e.createdAt)}</span>
          <span>${e.createdByLabel||"未記錄上傳帳號"}</span>
        </div>
      </button>
    </article>
  `}function p(){if(a.galleryCountChip.textContent=`${o.photos.length} 張相片`,y(),a.galleryMeta.textContent=o.photos.length?`全部相片按上傳日期分段，最新日期與最新相片排在最上方。現時共有 ${o.groups.length} 個上傳日期分組。`:"目前未有任何相片紀錄。",!o.groups.length){a.galleryDateList.innerHTML=`
      <div class="empty-state">
        <strong>目前未有相片紀錄</strong>
        <p class="muted-copy">當車輛完成 Check-in 或安裝維修保養拍攝後，這裡就會顯示所有相片。</p>
      </div>
    `;return}a.galleryDateList.innerHTML=o.groups.map(e=>`
    <section class="gallery-date-group">
      <div class="gallery-date-head">
        <div>
          <p class="eyebrow">Upload Date</p>
          <h2>${w(e.dateKey)}</h2>
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
        ${e.photos.map(t=>D(t)).join("")}
      </div>
    </section>
  `).join("")}function M(e){return o.groups.find(t=>t.dateKey===e)?.photos||[]}function T(e,t){M(e).forEach(l=>{if(t){o.selectedPhotoIds.add(l.id);return}o.selectedPhotoIds.delete(l.id)}),p(),b()}async function B(e){const t=o.photos.filter(r=>e.includes(r.id));if(!t.length){s("請先選取相片。","danger");return}const l=t.length,d=l===1?"確定刪除這 1 張相片？刪除後不可還原。":`確定刪除這 ${l} 張相片？刪除後不可還原。`;if(window.confirm(d)){a.deleteSelectedBtn&&(a.deleteSelectedBtn.disabled=!0),s(`正在刪除 ${l} 張相片...`,"");try{const r=await k(t),n=new Set(t.map(i=>i.id));o.photos=o.photos.filter(i=>!n.has(i.id)),n.forEach(i=>o.selectedPhotoIds.delete(i)),o.groups=$(o.photos),p(),await b(),h(),s(`已刪除 ${r} 張相片。`,"success")}catch(r){y(),s(g(r),"danger")}}}async function b(){const e=[...a.galleryDateList.querySelectorAll("[data-photo-path]")];if(e.length){if(c&&c.disconnect(),"IntersectionObserver"in window){c=new IntersectionObserver(t=>{t.forEach(l=>{l.isIntersecting&&(c.unobserve(l.target),m(l.target))})},{rootMargin:"320px 0px",threshold:.01}),e.forEach(t=>{c.observe(t)});return}for(const t of e)await m(t)}}async function m(e){if(!e||e.dataset.thumbState==="loading"||e.dataset.thumbState==="done")return;const t=e.querySelector("img");if(t){e.dataset.thumbState="loading";try{t.src=await f(e.dataset.photoPath,{width:360,height:360}),e.dataset.thumbState="done"}catch(l){if(S(l)){t.src=x,e.dataset.thumbState="done";return}e.dataset.thumbState="error",e.classList.add("is-error")}}}function h(){a.galleryLightbox.hidden=!0,a.galleryLightboxImage.removeAttribute("src"),document.body.classList.remove("model-open")}async function O(e){const t=o.photos.find(l=>l.id===e);if(t){a.galleryLightbox.hidden=!1,document.body.classList.add("model-open"),a.galleryLightboxTitle.textContent=`${u(t)} · ${v(t)}`,a.galleryLightboxSubtitle.textContent=`${t.captureSet?.reference||"未關聯案件"} · ${L(t.createdAt)}`,a.galleryLightboxOperator.textContent=`上傳帳號：${t.createdByLabel||"未記錄"}`,a.galleryLightboxImage.removeAttribute("src");try{a.galleryLightboxImage.src=await f(t.storagePath,{width:1600,height:1600})}catch(l){if(S(l)){a.galleryLightboxImage.src=x,a.galleryLightboxTitle.textContent=`${u(t)} · 圖片已刪除`,a.galleryLightboxSubtitle.textContent="原始圖片不存在，現以替代圖顯示。",a.galleryLightboxOperator.textContent=`上傳帳號：${t.createdByLabel||"未記錄"}`;return}a.galleryLightboxTitle.textContent="圖片讀取失敗",a.galleryLightboxSubtitle.textContent=g(l),a.galleryLightboxOperator.textContent=t.storagePath}}}function A(){a.galleryDateList.addEventListener("click",async e=>{const t=e.target.closest("[data-photo-id]");t&&await O(t.dataset.photoId)}),a.galleryDateList.addEventListener("change",e=>{const t=e.target.closest("[data-select-date]");if(t){T(t.dataset.selectDate,t.checked);return}const l=e.target.closest("[data-select-photo]");l&&(l.checked?o.selectedPhotoIds.add(l.dataset.selectPhoto):o.selectedPhotoIds.delete(l.dataset.selectPhoto),y(),l.closest(".gallery-photo-card")?.classList.toggle("is-selected",l.checked))}),a.galleryLightboxClose.addEventListener("click",h),a.galleryLightbox.addEventListener("click",e=>{e.target===a.galleryLightbox&&h()}),document.addEventListener("keydown",e=>{e.key==="Escape"&&!a.galleryLightbox.hidden&&h()}),a.deleteSelectedBtn.addEventListener("click",async()=>{await B([...o.selectedPhotoIds])})}async function U(){const e=await C(["superadmin","supreadmin"],"../index.html");E(e),s("正在載入全部圖片...","");try{o.photos=await P(),o.groups=$(o.photos),p(),await b(),s(o.photos.length?"已載入全部圖片庫。":"目前未有相片資料。",o.photos.length?"success":"")}catch(t){a.galleryDateList.innerHTML=`
      <div class="empty-state">
        <strong>讀取圖片庫失敗</strong>
        <p class="muted-copy">${g(t)}</p>
      </div>
    `,s(g(t),"danger")}A()}U();
