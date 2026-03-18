import{r as T,m as M,d as u,c as p,n as P,e as U,p as V,q as D,u as x}from"./workbench-DJyKcN1a.js";const r={captureForm:document.querySelector("#captureForm"),checkInVehicleList:document.querySelector("#checkInVehicleList"),accessoryList:document.querySelector("#accessoryList"),customServiceInput:document.querySelector("#customServiceInput"),addServiceItemBtn:document.querySelector("#addServiceItemBtn"),addAccessoryBtn:document.querySelector("#addAccessoryBtn"),saveSetBtn:document.querySelector("#saveSetBtn"),captureStatus:document.querySelector("#captureStatus"),cameraOverlay:document.querySelector("#cameraOverlay"),cameraTitle:document.querySelector("#cameraTitle"),cameraVideo:document.querySelector("#cameraVideo"),cameraCanvas:document.querySelector("#cameraCanvas"),closeCameraBtn:document.querySelector("#closeCameraBtn"),cancelCameraBtn:document.querySelector("#cancelCameraBtn"),shutterCameraBtn:document.querySelector("#shutterCameraBtn"),currentUserEmail:document.querySelector("#currentUserEmail")},a={serviceItems:[],accessoryEntries:[],checkInSets:[],selectedCaptureSetId:"",vehicleThumbUrls:new Map,cameraTarget:null,cameraStream:null};function v(){return{id:`entry-${Date.now()}-${Math.floor(Math.random()*1e4)}`,itemIds:[],photos:[]}}function O(e){return(e||"").trim().replace(/\s+/g," ")}function j(e,t){return[...e.filter(s=>s.id!==t.id),t].sort((s,c)=>s.sortOrder!==c.sortOrder?s.sortOrder-c.sortOrder:s.name.localeCompare(c.name,"zh-Hant"))}function n(e,t){r.captureStatus.textContent=e,r.captureStatus.className="status-text",t&&r.captureStatus.classList.add(`is-${t}`)}function F(e){r.currentUserEmail&&(r.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function h(){return!!(window.matchMedia?.("(pointer: coarse)").matches&&navigator.mediaDevices?.getUserMedia)}function H(){return h()?"拍安裝 / 維修 / 保養相片":"拍安裝 / 維修 / 保養相片或上傳"}function N(e=""){return h()?`
    <div class="upload-action-row">
      <button class="primary-button upload-action-btn" type="button" data-open-entry-camera="${e}">拍照</button>
      <button class="secondary-button upload-action-btn" type="button" data-open-entry-library="${e}">上傳相片</button>
    </div>
  `:""}function z(e){return!e?.width||!e?.height?"1 / 1":`${e.width} / ${e.height}`}function R(e,t,s,c){return`
    <figure class="upload-cover">
      <div class="upload-cover-frame" style="aspect-ratio: ${z(e)};">
        <img src="${e.previewUrl}" alt="${t}">
      </div>
      <figcaption class="upload-cover-footer">
        <span>${e.fileName}</span>
        <button class="tiny-button" type="button" ${s}="${c}">移除</button>
      </figcaption>
    </figure>
  `}function _(){r.addAccessoryBtn.classList.remove("is-flashing"),window.requestAnimationFrame(()=>{r.addAccessoryBtn.classList.add("is-flashing"),window.setTimeout(()=>{r.addAccessoryBtn.classList.remove("is-flashing")},1200)})}function I(){return a.accessoryEntries.some(e=>e.itemIds.length>0||e.photos.length>0)}function C(){a.accessoryEntries.forEach(e=>{e.photos.forEach(t=>p(t))})}function w(){C(),a.accessoryEntries=[v()],d(),y()}function y(){if(!a.checkInSets.length){r.checkInVehicleList.innerHTML=`
      <div class="empty-state">
        <strong>暫時未有已 Check-in 車輛</strong>
        <p class="muted-copy">請先到 Check-in 頁建立車輛資料，然後再回來拍安裝維修保養相片。</p>
      </div>
    `;return}if(a.selectedCaptureSetId&&I()){r.checkInVehicleList.innerHTML="";return}r.checkInVehicleList.innerHTML=a.checkInSets.map(e=>{const t=a.vehicleThumbUrls.get(e.id),s=e.vehiclePhotos[0];return`
      <article class="vehicle-select-card ${e.id===a.selectedCaptureSetId?"is-selected":""}">
        <button
          class="vehicle-select-main"
          type="button"
          data-select-capture-set="${e.id}"
        >
          <div class="vehicle-select-thumb">
            ${t?`<img src="${t}" alt="${e.brandName}${e.vehicleModel?` ${e.vehicleModel}`:""}">`:s?'<div class="vehicle-thumb-placeholder">載入縮圖中</div>':'<div class="vehicle-thumb-placeholder">未有車輛相片</div>'}
          </div>
          <div class="vehicle-select-body">
            <strong>${e.brandName}${e.vehicleModel?` ${e.vehicleModel}`:""}</strong>
            <span>Check-in：${e.createdByLabel||"未記錄"}</span>
          </div>
        </button>
      </article>
    `}).join(""),r.checkInVehicleList.querySelectorAll("[data-select-capture-set]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.selectCaptureSet;t!==a.selectedCaptureSetId&&(I()&&(w(),n("已切換車輛，未儲存的服務草稿已清空。","danger")),a.selectedCaptureSetId=t,y())})})}async function W(){const e=a.checkInSets.filter(t=>t.vehiclePhotos[0]?.storagePath&&!a.vehicleThumbUrls.has(t.id));e.length&&(await Promise.all(e.map(async t=>{try{const s=await V(t.vehiclePhotos[0].storagePath,{width:360,height:270});a.vehicleThumbUrls.set(t.id,s)}catch{a.vehicleThumbUrls.set(t.id,"")}})),y())}async function L(e={}){const t=e.keepSelection?a.selectedCaptureSetId:"";a.checkInSets=await P(24),t&&a.checkInSets.some(s=>s.id===t)?a.selectedCaptureSetId=t:e.autoSelectFirst===!1?a.selectedCaptureSetId="":a.selectedCaptureSetId=a.checkInSets[0]?.id||"",y(),await W()}function X(e){return e.photos.length?e.photos.map(t=>R(t,t.fileName,"data-remove-accessory-photo",`${e.id}:${t.localId}`)).join(""):`
      <div class="upload-prompt">
        <strong>${H()}</strong>
        <small>每個項目只可上傳一張相片。</small>
        ${N(e.id)}
      </div>
    `}function Y(e){return e.itemIds.length?`已選：${a.serviceItems.filter(t=>e.itemIds.includes(t.id)).map(t=>t.name).join(" + ")}`:"可選多於一項安裝、維修或保養項目。"}function G(e){return a.serviceItems.map(t=>`
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
        <input id="upload-${e.id}" type="file" accept="image/*" capture="environment" ${e.photos.length||h()?"disabled":""}>
        <div class="upload-zone-content">${X(e)}</div>
      </label>
      <input class="utility-file-input" id="library-${e.id}" type="file" accept="image/*" ${e.photos.length?"disabled":""}>

      <div class="choice-grid service-grid">${G(e)}</div>
      <p class="accessory-subcopy">${Y(e)}</p>
    </article>
  `).join(""),r.accessoryList.querySelectorAll("[data-remove-entry]").forEach(e=>{e.addEventListener("click",()=>{const t=a.accessoryEntries.findIndex(s=>s.id===e.dataset.removeEntry);t!==-1&&(a.accessoryEntries[t].photos.forEach(s=>p(s)),a.accessoryEntries.splice(t,1),d())})}),r.accessoryList.querySelectorAll("[data-entry-item]").forEach(e=>{e.addEventListener("click",()=>{const[t,s]=e.dataset.entryItem.split(":"),c=a.accessoryEntries.find(i=>i.id===t);if(c){if(c.itemIds.includes(s))c.itemIds=c.itemIds.filter(i=>i!==s);else{const i=new Set(c.itemIds);i.add(s),c.itemIds=a.serviceItems.map(o=>o.id).filter(o=>i.has(o))}d()}})}),r.accessoryList.querySelectorAll("[data-remove-accessory-photo]").forEach(e=>{e.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation();const[s,c]=e.dataset.removeAccessoryPhoto.split(":"),i=a.accessoryEntries.find(l=>l.id===s);if(!i)return;const o=i.photos.findIndex(l=>l.localId===c);o!==-1&&(p(i.photos[o]),i.photos.splice(o,1),d())})}),r.accessoryList.querySelectorAll("[data-camera-entry]").forEach(e=>{e.addEventListener("click",async t=>{if(!h()||t.target.closest("button"))return;const s=a.accessoryEntries.find(c=>c.id===e.dataset.cameraEntry);!s||s.photos.length>0||(t.preventDefault(),await E({kind:"accessory",entryId:s.id}))})}),r.accessoryList.querySelectorAll("[data-open-entry-camera]").forEach(e=>{e.addEventListener("click",async t=>{t.preventDefault(),t.stopPropagation(),await E({kind:"accessory",entryId:e.dataset.openEntryCamera})})}),r.accessoryList.querySelectorAll("[data-open-entry-library]").forEach(e=>{e.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation(),r.accessoryList.querySelector(`#library-${e.dataset.openEntryLibrary}`)?.click()})}),r.accessoryList.querySelectorAll('input[type="file"]').forEach(e=>{e.addEventListener("change",async()=>{const t=e.id.replace("upload-","").replace("library-",""),s=a.accessoryEntries.find(c=>c.id===t);if(!(!s||!e.files?.length))try{await $(s,e.files[0])}catch(c){n(u(c),"danger")}finally{e.value=""}})}),y()}async function $(e,t){if(t){if(e.photos.length>0){n("每個項目只可上傳一張相片。要再加入相片，請按「加入更多項目」。","danger"),_();return}n("處理項目相片中...",""),e.photos=[await U(t)],d(),n("已加入項目相片。","success")}}async function J(){try{return await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:!1})}catch{return navigator.mediaDevices.getUserMedia({video:!0,audio:!1})}}async function k(){a.cameraStream&&(a.cameraStream.getTracks().forEach(e=>e.stop()),a.cameraStream=null),r.cameraVideo.srcObject=null}async function m(){r.cameraOverlay.hidden=!0,document.body.classList.remove("camera-open"),a.cameraTarget=null,await k()}async function E(e){if(h()){r.cameraTitle.textContent="拍安裝 / 維修 / 保養相片",a.cameraTarget=e,r.cameraOverlay.hidden=!1,document.body.classList.add("camera-open"),r.cameraVideo.hidden=!1,r.cameraCanvas.hidden=!0;try{a.cameraStream=await J(),r.cameraVideo.srcObject=a.cameraStream,await r.cameraVideo.play()}catch(t){await m(),n(u(t),"danger")}}}function K(e){const t=Date.now();return typeof File=="function"?new File([e],`service-${t}.jpg`,{type:"image/jpeg",lastModified:t}):(e.name=`service-${t}.jpg`,e)}async function Q(){const e=a.cameraTarget;if(!e)return;const t=r.cameraVideo.videoWidth,s=r.cameraVideo.videoHeight;if(!t||!s){n("未能取得相機影像，請再試一次。","danger");return}r.shutterCameraBtn.disabled=!0;try{const c=Math.min(t,s),i=Math.floor((t-c)/2),o=Math.floor((s-c)/2);r.cameraCanvas.width=c,r.cameraCanvas.height=c;const l=r.cameraCanvas.getContext("2d");if(!l)throw new Error("無法建立拍照畫布。");l.drawImage(r.cameraVideo,i,o,c,c,0,0,c,c);const A=await new Promise((f,q)=>{r.cameraCanvas.toBlob(S=>S?f(S):q(new Error("拍照失敗。")),"image/jpeg",.92)}),B=K(A);await m();const g=a.accessoryEntries.find(f=>f.id===e.entryId);if(!g){n("找不到目前項目，請重新拍照。","danger");return}await $(g,B)}catch(c){n(u(c),"danger")}finally{r.shutterCameraBtn.disabled=!1}}function Z(){return a.selectedCaptureSetId?a.accessoryEntries.length?a.accessoryEntries.find(t=>!t.itemIds.length||!t.photos.length)?"每個項目都需要至少選 1 項分類並上傳 1 張相片。":"":"請至少加入 1 個安裝、維修或保養項目。":"請先選擇已 Check-in 車輛。"}function ee(){return a.accessoryEntries.map(e=>({itemIds:[...e.itemIds],notes:"",photos:e.photos}))}async function b(){const e=O(r.customServiceInput.value);if(!e){n("請先輸入未有的項目名稱。","danger"),r.customServiceInput.focus();return}r.addServiceItemBtn.disabled=!0;try{const t=await D(e);a.serviceItems=j(a.serviceItems,t),r.customServiceInput.value="";const s=a.accessoryEntries[a.accessoryEntries.length-1];s&&!s.itemIds.includes(t.id)&&(s.itemIds=[...s.itemIds,t.id]),d(),n(`已加入新項目「${t.name}」，之後所有用戶都可直接選用。`,"success")}catch(t){n(u(t),"danger")}finally{r.addServiceItemBtn.disabled=!1}}async function te(e){e.preventDefault();const t=Z();if(t){n(t,"danger");return}r.saveSetBtn.disabled=!0,n("正在上傳安裝維修保養資料...","");try{const s=await x(a.selectedCaptureSetId,ee());w(),a.selectedCaptureSetId="",await L({autoSelectFirst:!1}),n(`已為案件 ${s.reference} 新增安裝維修保養資料。`,"success"),document.querySelector(".capture-card")?.scrollIntoView({behavior:"smooth",block:"start"})}catch(s){n(u(s),"danger")}finally{r.saveSetBtn.disabled=!1}}function ae(){r.addAccessoryBtn.addEventListener("click",()=>{a.accessoryEntries.push(v()),d(),n("已新增一個服務項目。",""),window.requestAnimationFrame(()=>{r.accessoryList.lastElementChild?.scrollIntoView({behavior:"smooth",block:"nearest"})})}),r.addServiceItemBtn.addEventListener("click",b),r.customServiceInput.addEventListener("keydown",async e=>{e.key==="Enter"&&(e.preventDefault(),await b())}),r.captureForm.addEventListener("submit",te),r.closeCameraBtn.addEventListener("click",m),r.cancelCameraBtn.addEventListener("click",m),r.shutterCameraBtn.addEventListener("click",Q),r.cameraOverlay.addEventListener("click",async e=>{e.target===r.cameraOverlay&&await m()}),window.addEventListener("beforeunload",()=>{k(),C()})}async function re(){const e=await T(["staff","admin","superadmin","supreadmin"],"../index.html");F(e),a.accessoryEntries=[v()],d(),n("正在載入已 Check-in 車輛與服務項目...","");try{const[t]=await Promise.all([M(),L()]);a.serviceItems=t,d(),n(a.checkInSets.length?"已連接 Supabase，可選擇車輛後開始輸入安裝維修保養資料。":"已連接 Supabase，但暫時未有已 Check-in 車輛。",a.checkInSets.length?"success":"")}catch(t){n(u(t),"danger")}ae()}re();
