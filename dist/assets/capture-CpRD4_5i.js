import{r as A,l as T,d as u,b as f,m as M,c as V,n as P,p as U,q as D}from"./workbench-ChSf54Qe.js";const r={captureForm:document.querySelector("#captureForm"),checkInVehicleList:document.querySelector("#checkInVehicleList"),selectedVehicleSummary:document.querySelector("#selectedVehicleSummary"),accessoryList:document.querySelector("#accessoryList"),customServiceInput:document.querySelector("#customServiceInput"),addServiceItemBtn:document.querySelector("#addServiceItemBtn"),addAccessoryBtn:document.querySelector("#addAccessoryBtn"),saveSetBtn:document.querySelector("#saveSetBtn"),captureStatus:document.querySelector("#captureStatus"),cameraOverlay:document.querySelector("#cameraOverlay"),cameraTitle:document.querySelector("#cameraTitle"),cameraVideo:document.querySelector("#cameraVideo"),cameraCanvas:document.querySelector("#cameraCanvas"),closeCameraBtn:document.querySelector("#closeCameraBtn"),cancelCameraBtn:document.querySelector("#cancelCameraBtn"),shutterCameraBtn:document.querySelector("#shutterCameraBtn"),currentUserEmail:document.querySelector("#currentUserEmail")},a={serviceItems:[],accessoryEntries:[],checkInSets:[],selectedCaptureSetId:"",vehicleThumbUrls:new Map,cameraTarget:null,cameraStream:null};function S(){return{id:`entry-${Date.now()}-${Math.floor(Math.random()*1e4)}`,itemIds:[],notes:"",photos:[]}}function C(e){return(e||"").trim().replace(/\s+/g," ")}function x(e,t){return[...e.filter(c=>c.id!==t.id),t].sort((c,s)=>c.sortOrder!==s.sortOrder?c.sortOrder-s.sortOrder:c.name.localeCompare(s.name,"zh-Hant"))}function n(e,t){r.captureStatus.textContent=e,r.captureStatus.className="status-text",t&&r.captureStatus.classList.add(`is-${t}`)}function O(e){r.currentUserEmail&&(r.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function y(){return!!(window.matchMedia?.("(pointer: coarse)").matches&&navigator.mediaDevices?.getUserMedia)}function j(){return y()?"拍安裝 / 維修 / 保養相片":"拍安裝 / 維修 / 保養相片或上傳"}function F(e=""){return y()?`
    <div class="upload-action-row">
      <button class="primary-button upload-action-btn" type="button" data-open-entry-camera="${e}">拍照</button>
      <button class="secondary-button upload-action-btn" type="button" data-open-entry-library="${e}">上傳相片</button>
    </div>
  `:""}function H(e){return!e?.width||!e?.height?"4 / 3":`${e.width} / ${e.height}`}function N(e,t,c,s){return`
    <figure class="upload-cover">
      <div class="upload-cover-frame" style="aspect-ratio: ${H(e)};">
        <img src="${e.previewUrl}" alt="${t}">
      </div>
      <figcaption class="upload-cover-footer">
        <span>${e.fileName}</span>
        <button class="tiny-button" type="button" ${c}="${s}">移除</button>
      </figcaption>
    </figure>
  `}function z(){r.addAccessoryBtn.classList.remove("is-flashing"),window.requestAnimationFrame(()=>{r.addAccessoryBtn.classList.add("is-flashing"),window.setTimeout(()=>{r.addAccessoryBtn.classList.remove("is-flashing")},1200)})}function R(){return a.checkInSets.find(e=>e.id===a.selectedCaptureSetId)||null}function g(){return a.accessoryEntries.some(e=>e.itemIds.length>0||e.photos.length>0||C(e.notes))}function w(){a.accessoryEntries.forEach(e=>{e.photos.forEach(t=>f(t))})}function I(){w(),a.accessoryEntries=[S()],d(),m()}function h(){const e=R();if(!e){r.selectedVehicleSummary.innerHTML=`
      <div class="empty-state compact">
        <strong>請先選擇已 Check-in 車輛</strong>
        <p class="muted-copy">上方會顯示最近已建立的車輛案件。</p>
      </div>
    `;return}const t=e.vehiclePhotos[0],c=a.vehicleThumbUrls.get(e.id);r.selectedVehicleSummary.innerHTML=`
    <article class="selected-vehicle-card">
      <div class="selected-vehicle-thumb">
        ${c?`<img src="${c}" alt="${e.brandName}${e.vehicleModel?` ${e.vehicleModel}`:""}">`:t?'<div class="vehicle-thumb-placeholder">載入縮圖中</div>':'<div class="vehicle-thumb-placeholder">未有車輛相片</div>'}
      </div>
      <div class="selected-vehicle-body">
        <p class="eyebrow">Selected Vehicle</p>
        <h3>${e.brandName}${e.vehicleModel?` ${e.vehicleModel}`:""}</h3>
        <div class="chip-row">
          <span class="meta-chip">${e.reference}</span>
          <span class="meta-chip">${e.captureDate}</span>
          <span class="meta-chip">已入 ${e.accessoryEntries.length} 項服務</span>
          <span class="meta-chip">Check-in：${e.createdByLabel||"未記錄"}</span>
        </div>
        <p class="muted-copy">${e.notes||"此車輛已完成 Check-in，可在下方新增安裝、維修或保養紀錄。"}</p>
        <div class="toolbar-row">
          <button class="ghost-button" type="button" id="changeVehicleBtn">重新選擇車輛</button>
        </div>
      </div>
    </article>
  `,r.selectedVehicleSummary.querySelector("#changeVehicleBtn")?.addEventListener("click",()=>{g()&&(I(),n("已清空目前服務草稿，請重新選擇車輛。","danger")),a.selectedCaptureSetId="",m(),h()})}function m(){if(!a.checkInSets.length){r.checkInVehicleList.innerHTML=`
      <div class="empty-state">
        <strong>暫時未有已 Check-in 車輛</strong>
        <p class="muted-copy">請先到 Check-in 頁建立車輛資料，然後再回來拍安裝維修保養相片。</p>
      </div>
    `,h();return}if(a.selectedCaptureSetId&&g()){r.checkInVehicleList.innerHTML=`
      <div class="empty-state compact">
        <strong>已鎖定目前車輛</strong>
        <p class="muted-copy">你已開始輸入安裝維修保養項目，縮圖列表已先隱藏避免誤按。需要更換車輛可按下方「重新選擇車輛」。</p>
      </div>
    `,h();return}r.checkInVehicleList.innerHTML=a.checkInSets.map(e=>{const t=a.vehicleThumbUrls.get(e.id),c=e.vehiclePhotos[0];return`
      <button
        class="vehicle-select-card ${e.id===a.selectedCaptureSetId?"is-selected":""}"
        type="button"
        data-select-capture-set="${e.id}"
      >
        <div class="vehicle-select-thumb">
          ${t?`<img src="${t}" alt="${e.brandName}${e.vehicleModel?` ${e.vehicleModel}`:""}">`:c?'<div class="vehicle-thumb-placeholder">載入縮圖中</div>':'<div class="vehicle-thumb-placeholder">未有車輛相片</div>'}
        </div>
        <div class="vehicle-select-body">
          <strong>${e.brandName}${e.vehicleModel?` ${e.vehicleModel}`:""}</strong>
          <span>${e.reference}</span>
          <span>${e.captureDate} · ${e.accessoryEntries.length} 項服務</span>
        </div>
      </button>
    `}).join(""),r.checkInVehicleList.querySelectorAll("[data-select-capture-set]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.selectCaptureSet;t!==a.selectedCaptureSetId&&(g()&&(I(),n("已切換車輛，未儲存的服務草稿已清空。","danger")),a.selectedCaptureSetId=t,m(),h())})}),h()}async function _(){const e=a.checkInSets.filter(t=>t.vehiclePhotos[0]?.storagePath&&!a.vehicleThumbUrls.has(t.id));e.length&&(await Promise.all(e.map(async t=>{try{const c=await P(t.vehiclePhotos[0].storagePath,{width:360,height:270});a.vehicleThumbUrls.set(t.id,c)}catch{a.vehicleThumbUrls.set(t.id,"")}})),m())}async function L(e={}){const t=e.keepSelection?a.selectedCaptureSetId:"";a.checkInSets=await M(24),t&&a.checkInSets.some(c=>c.id===t)?a.selectedCaptureSetId=t:a.selectedCaptureSetId=a.checkInSets[0]?.id||"",m(),await _()}function W(e){return e.photos.length?e.photos.map(t=>N(t,t.fileName,"data-remove-accessory-photo",`${e.id}:${t.localId}`)).join(""):`
      <div class="upload-prompt">
        <strong>${j()}</strong>
        <small>每個項目只可上傳一張相片。</small>
        ${F(e.id)}
      </div>
    `}function G(e){return e.itemIds.length?`已選：${a.serviceItems.filter(t=>e.itemIds.includes(t.id)).map(t=>t.name).join(" + ")}`:"可選多於一項安裝、維修或保養項目。"}function J(e){return a.serviceItems.map(t=>`
    <button class="choice-button ${e.itemIds.includes(t.id)?"is-selected":""}" type="button" data-entry-item="${e.id}:${t.id}">
      <strong>${t.name}</strong>
      <span>可多選</span>
    </button>
  `).join("")}function d(){if(!a.accessoryEntries.length){r.accessoryList.innerHTML=`
      <div class="empty-state">
        <strong>尚未加入安裝 / 維修 / 保養項目</strong>
        <p class="muted-copy">每加入一個項目，就可以上傳該項目的相片並記錄分類。</p>
      </div>
    `;return}r.accessoryList.innerHTML=a.accessoryEntries.map((e,t)=>`
    <article class="accessory-card">
      <div class="accessory-head">
        <h3>項目 ${String(t+1).padStart(2,"0")}</h3>
        <button class="tiny-button" type="button" data-remove-entry="${e.id}">移除</button>
      </div>

      <label class="upload-zone ${e.photos.length?"has-preview":""}" data-camera-entry="${e.id}" for="upload-${e.id}">
        <input id="upload-${e.id}" type="file" accept="image/*" capture="environment" ${e.photos.length||y()?"disabled":""}>
        <div class="upload-zone-content">${W(e)}</div>
      </label>
      <input class="utility-file-input" id="library-${e.id}" type="file" accept="image/*" ${e.photos.length?"disabled":""}>

      <div class="choice-grid service-grid">${J(e)}</div>
      <p class="accessory-subcopy">${G(e)}</p>
    </article>
  `).join(""),r.accessoryList.querySelectorAll("[data-remove-entry]").forEach(e=>{e.addEventListener("click",()=>{const t=a.accessoryEntries.findIndex(c=>c.id===e.dataset.removeEntry);t!==-1&&(a.accessoryEntries[t].photos.forEach(c=>f(c)),a.accessoryEntries.splice(t,1),d())})}),r.accessoryList.querySelectorAll("[data-entry-item]").forEach(e=>{e.addEventListener("click",()=>{const[t,c]=e.dataset.entryItem.split(":"),s=a.accessoryEntries.find(i=>i.id===t);if(s){if(s.itemIds.includes(c))s.itemIds=s.itemIds.filter(i=>i!==c);else{const i=new Set(s.itemIds);i.add(c),s.itemIds=a.serviceItems.map(o=>o.id).filter(o=>i.has(o))}d()}})}),r.accessoryList.querySelectorAll("[data-remove-accessory-photo]").forEach(e=>{e.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation();const[c,s]=e.dataset.removeAccessoryPhoto.split(":"),i=a.accessoryEntries.find(l=>l.id===c);if(!i)return;const o=i.photos.findIndex(l=>l.localId===s);o!==-1&&(f(i.photos[o]),i.photos.splice(o,1),d())})}),r.accessoryList.querySelectorAll("[data-camera-entry]").forEach(e=>{e.addEventListener("click",async t=>{if(!y()||t.target.closest("button"))return;const c=a.accessoryEntries.find(s=>s.id===e.dataset.cameraEntry);!c||c.photos.length>0||(t.preventDefault(),await E({kind:"accessory",entryId:c.id}))})}),r.accessoryList.querySelectorAll("[data-open-entry-camera]").forEach(e=>{e.addEventListener("click",async t=>{t.preventDefault(),t.stopPropagation(),await E({kind:"accessory",entryId:e.dataset.openEntryCamera})})}),r.accessoryList.querySelectorAll("[data-open-entry-library]").forEach(e=>{e.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation(),r.accessoryList.querySelector(`#library-${e.dataset.openEntryLibrary}`)?.click()})}),r.accessoryList.querySelectorAll('input[type="file"]').forEach(e=>{e.addEventListener("change",async()=>{const t=e.id.replace("upload-","").replace("library-",""),c=a.accessoryEntries.find(s=>s.id===t);if(!(!c||!e.files?.length))try{await k(c,e.files[0])}catch(s){n(u(s),"danger")}finally{e.value=""}})}),m()}async function k(e,t){if(t){if(e.photos.length>0){n("每個項目只可上傳一張相片。要再加入相片，請按「加入更多項目」。","danger"),z();return}n("處理項目相片中...",""),e.photos=[await V(t)],d(),n("已加入項目相片。","success")}}async function K(){try{return await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:!1})}catch{return navigator.mediaDevices.getUserMedia({video:!0,audio:!1})}}async function B(){a.cameraStream&&(a.cameraStream.getTracks().forEach(e=>e.stop()),a.cameraStream=null),r.cameraVideo.srcObject=null}async function p(){r.cameraOverlay.hidden=!0,document.body.classList.remove("camera-open"),a.cameraTarget=null,await B()}async function E(e){if(y()){r.cameraTitle.textContent="拍安裝 / 維修 / 保養相片",a.cameraTarget=e,r.cameraOverlay.hidden=!1,document.body.classList.add("camera-open");try{a.cameraStream=await K(),r.cameraVideo.srcObject=a.cameraStream,await r.cameraVideo.play()}catch(t){await p(),n(u(t),"danger")}}}function Q(e){const t=Date.now();return typeof File=="function"?new File([e],`service-${t}.jpg`,{type:"image/jpeg",lastModified:t}):(e.name=`service-${t}.jpg`,e)}async function X(){const e=a.cameraTarget;if(!e)return;const t=r.cameraVideo.videoWidth,c=r.cameraVideo.videoHeight;if(!t||!c){n("未能取得相機影像，請再試一次。","danger");return}r.shutterCameraBtn.disabled=!0;try{r.cameraCanvas.width=t,r.cameraCanvas.height=c;const s=r.cameraCanvas.getContext("2d");if(!s)throw new Error("無法建立拍照畫布。");s.drawImage(r.cameraVideo,0,0,t,c);const i=await new Promise((v,q)=>{r.cameraCanvas.toBlob(b=>b?v(b):q(new Error("拍照失敗。")),"image/jpeg",.92)}),o=Q(i);await p();const l=a.accessoryEntries.find(v=>v.id===e.entryId);if(!l){n("找不到目前項目，請重新拍照。","danger");return}await k(l,o)}catch(s){n(u(s),"danger")}finally{r.shutterCameraBtn.disabled=!1}}function Y(){return a.selectedCaptureSetId?a.accessoryEntries.length?a.accessoryEntries.find(t=>!t.itemIds.length||!t.photos.length)?"每個項目都需要至少選 1 項分類並上傳 1 張相片。":"":"請至少加入 1 個安裝、維修或保養項目。":"請先選擇已 Check-in 車輛。"}function Z(){return a.accessoryEntries.map(e=>({itemIds:[...e.itemIds],notes:e.notes||"",photos:e.photos}))}async function $(){const e=C(r.customServiceInput.value);if(!e){n("請先輸入未有的項目名稱。","danger"),r.customServiceInput.focus();return}r.addServiceItemBtn.disabled=!0;try{const t=await U(e);a.serviceItems=x(a.serviceItems,t),r.customServiceInput.value="";const c=a.accessoryEntries[a.accessoryEntries.length-1];c&&!c.itemIds.includes(t.id)&&(c.itemIds=[...c.itemIds,t.id]),d(),n(`已加入新項目「${t.name}」，之後所有用戶都可直接選用。`,"success")}catch(t){n(u(t),"danger")}finally{r.addServiceItemBtn.disabled=!1}}async function ee(e){e.preventDefault();const t=Y();if(t){n(t,"danger");return}r.saveSetBtn.disabled=!0,n("正在上傳安裝維修保養資料...","");try{const c=await D(a.selectedCaptureSetId,Z());I(),await L({keepSelection:!0}),n(`已為案件 ${c.reference} 新增安裝維修保養資料。`,"success")}catch(c){n(u(c),"danger")}finally{r.saveSetBtn.disabled=!1}}function te(){r.addAccessoryBtn.addEventListener("click",()=>{a.accessoryEntries.push(S()),d(),n("已新增一個服務項目。",""),window.requestAnimationFrame(()=>{r.accessoryList.lastElementChild?.scrollIntoView({behavior:"smooth",block:"nearest"})})}),r.addServiceItemBtn.addEventListener("click",$),r.customServiceInput.addEventListener("keydown",async e=>{e.key==="Enter"&&(e.preventDefault(),await $())}),r.captureForm.addEventListener("submit",ee),r.closeCameraBtn.addEventListener("click",p),r.cancelCameraBtn.addEventListener("click",p),r.shutterCameraBtn.addEventListener("click",X),r.cameraOverlay.addEventListener("click",async e=>{e.target===r.cameraOverlay&&await p()}),window.addEventListener("beforeunload",()=>{B(),w()})}async function ae(){const e=await A("../index.html");O(e),a.accessoryEntries=[S()],d(),n("正在載入已 Check-in 車輛與服務項目...","");try{const[t]=await Promise.all([T(),L()]);a.serviceItems=t,d(),n(a.checkInSets.length?"已連接 Supabase，可選擇車輛後開始輸入安裝維修保養資料。":"已連接 Supabase，但暫時未有已 Check-in 車輛。",a.checkInSets.length?"success":"")}catch(t){n(u(t),"danger")}te()}ae();
