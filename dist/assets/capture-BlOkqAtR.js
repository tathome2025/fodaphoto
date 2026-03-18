import{r as M,l as V,d as l,b as f,m as P,c as U,n as D,p as x,q as O,u as j}from"./workbench-BWYZBm2m.js";const a={captureForm:document.querySelector("#captureForm"),checkInVehicleList:document.querySelector("#checkInVehicleList"),vehicleCompleteRow:document.querySelector("#vehicleCompleteRow"),accessoryList:document.querySelector("#accessoryList"),customServiceInput:document.querySelector("#customServiceInput"),addServiceItemBtn:document.querySelector("#addServiceItemBtn"),addAccessoryBtn:document.querySelector("#addAccessoryBtn"),saveSetBtn:document.querySelector("#saveSetBtn"),captureStatus:document.querySelector("#captureStatus"),cameraOverlay:document.querySelector("#cameraOverlay"),cameraTitle:document.querySelector("#cameraTitle"),cameraVideo:document.querySelector("#cameraVideo"),cameraCanvas:document.querySelector("#cameraCanvas"),closeCameraBtn:document.querySelector("#closeCameraBtn"),cancelCameraBtn:document.querySelector("#cancelCameraBtn"),shutterCameraBtn:document.querySelector("#shutterCameraBtn"),currentUserEmail:document.querySelector("#currentUserEmail")},r={serviceItems:[],accessoryEntries:[],checkInSets:[],selectedCaptureSetId:"",vehicleThumbUrls:new Map,cameraTarget:null,cameraStream:null};function S(){return{id:`entry-${Date.now()}-${Math.floor(Math.random()*1e4)}`,itemIds:[],photos:[]}}function F(e){return(e||"").trim().replace(/\s+/g," ")}function H(e,t){return[...e.filter(c=>c.id!==t.id),t].sort((c,s)=>c.sortOrder!==s.sortOrder?c.sortOrder-s.sortOrder:c.name.localeCompare(s.name,"zh-Hant"))}function n(e,t){a.captureStatus.textContent=e,a.captureStatus.className="status-text",t&&a.captureStatus.classList.add(`is-${t}`)}function R(e){a.currentUserEmail&&(a.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function h(){return!!(window.matchMedia?.("(pointer: coarse)").matches&&navigator.mediaDevices?.getUserMedia)}function N(){return h()?"拍安裝 / 維修 / 保養相片":"拍安裝 / 維修 / 保養相片或上傳"}function z(e=""){return h()?`
    <div class="upload-action-row">
      <button class="primary-button upload-action-btn" type="button" data-open-entry-camera="${e}">拍照</button>
      <button class="secondary-button upload-action-btn" type="button" data-open-entry-library="${e}">上傳相片</button>
    </div>
  `:""}function _(e){return!e?.width||!e?.height?"1 / 1":`${e.width} / ${e.height}`}function W(e,t,c,s){return`
    <figure class="upload-cover">
      <div class="upload-cover-frame" style="aspect-ratio: ${_(e)};">
        <img src="${e.previewUrl}" alt="${t}">
      </div>
      <figcaption class="upload-cover-footer">
        <span>${e.fileName}</span>
        <button class="tiny-button" type="button" ${c}="${s}">移除</button>
      </figcaption>
    </figure>
  `}function X(){a.addAccessoryBtn.classList.remove("is-flashing"),window.requestAnimationFrame(()=>{a.addAccessoryBtn.classList.add("is-flashing"),window.setTimeout(()=>{a.addAccessoryBtn.classList.remove("is-flashing")},1200)})}function Y(){return r.checkInSets.find(e=>e.id===r.selectedCaptureSetId)||null}function v(){return r.accessoryEntries.some(e=>e.itemIds.length>0||e.photos.length>0)}function k(){r.accessoryEntries.forEach(e=>{e.photos.forEach(t=>f(t))})}function g(){k(),r.accessoryEntries=[S()],d(),y()}function y(){if(!r.checkInSets.length){a.checkInVehicleList.innerHTML=`
      <div class="empty-state">
        <strong>暫時未有已 Check-in 車輛</strong>
        <p class="muted-copy">請先到 Check-in 頁建立車輛資料，然後再回來拍安裝維修保養相片。</p>
      </div>
    `,a.vehicleCompleteRow.innerHTML="";return}if(r.selectedCaptureSetId&&v()){a.checkInVehicleList.innerHTML="",E();return}a.checkInVehicleList.innerHTML=r.checkInSets.map(e=>{const t=r.vehicleThumbUrls.get(e.id),c=e.vehiclePhotos[0];return`
      <article class="vehicle-select-card ${e.id===r.selectedCaptureSetId?"is-selected":""}">
        <button
          class="vehicle-select-main"
          type="button"
          data-select-capture-set="${e.id}"
        >
          <div class="vehicle-select-thumb">
            ${t?`<img src="${t}" alt="${e.brandName}${e.vehicleModel?` ${e.vehicleModel}`:""}">`:c?'<div class="vehicle-thumb-placeholder">載入縮圖中</div>':'<div class="vehicle-thumb-placeholder">未有車輛相片</div>'}
          </div>
          <div class="vehicle-select-body">
            <strong>${e.brandName}${e.vehicleModel?` ${e.vehicleModel}`:""}</strong>
            <span>Check-in：${e.createdByLabel||"未記錄"}</span>
          </div>
        </button>
      </article>
    `}).join(""),a.checkInVehicleList.querySelectorAll("[data-select-capture-set]").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.selectCaptureSet;t!==r.selectedCaptureSetId&&(v()&&(g(),n("已切換車輛，未儲存的服務草稿已清空。","danger")),r.selectedCaptureSetId=t,y())})}),E()}function E(){const e=Y();if(!e){a.vehicleCompleteRow.innerHTML="";return}a.vehicleCompleteRow.innerHTML=`
    <button class="vehicle-complete-btn warning-stripe-button-darktext" type="button" id="completeSelectedVehicleBtn">
      <span>已完成所有安裝維修保養</span>
    </button>
  `,a.vehicleCompleteRow.querySelector("#completeSelectedVehicleBtn")?.addEventListener("click",async()=>{const t=e.id;if(!t)return;if(t===r.selectedCaptureSetId&&v()){n("請先完成或清空目前項目，再標記這台車已完成。","danger");return}const c=a.vehicleCompleteRow.querySelector("#completeSelectedVehicleBtn");c&&(c.disabled=!0);try{const s=await j(t);t===r.selectedCaptureSetId&&(r.selectedCaptureSetId="",g()),await I(),n(`案件 ${s.reference||t} 已標記為完成，不會再於安裝維修保養頁顯示。`,"success")}catch(s){n(l(s),"danger")}finally{c&&(c.disabled=!1)}})}async function G(){const e=r.checkInSets.filter(t=>t.vehiclePhotos[0]?.storagePath&&!r.vehicleThumbUrls.has(t.id));e.length&&(await Promise.all(e.map(async t=>{try{const c=await D(t.vehiclePhotos[0].storagePath,{width:360,height:270});r.vehicleThumbUrls.set(t.id,c)}catch{r.vehicleThumbUrls.set(t.id,"")}})),y())}async function I(e={}){const t=e.keepSelection?r.selectedCaptureSetId:"";r.checkInSets=await P(24),t&&r.checkInSets.some(c=>c.id===t)?r.selectedCaptureSetId=t:e.autoSelectFirst===!1?r.selectedCaptureSetId="":r.selectedCaptureSetId=r.checkInSets[0]?.id||"",y(),await G()}function J(e){return e.photos.length?e.photos.map(t=>W(t,t.fileName,"data-remove-accessory-photo",`${e.id}:${t.localId}`)).join(""):`
      <div class="upload-prompt">
        <strong>${N()}</strong>
        <small>每個項目只可上傳一張相片。</small>
        ${z(e.id)}
      </div>
    `}function K(e){return e.itemIds.length?`已選：${r.serviceItems.filter(t=>e.itemIds.includes(t.id)).map(t=>t.name).join(" + ")}`:"可選多於一項安裝、維修或保養項目。"}function Q(e){return r.serviceItems.map(t=>`
    <button class="choice-button ${e.itemIds.includes(t.id)?"is-selected":""}" type="button" data-entry-item="${e.id}:${t.id}">
      <strong>${t.name}</strong>
      <span>可多選</span>
    </button>
  `).join("")}function d(){if(!r.accessoryEntries.length){a.accessoryList.innerHTML=`
      <div class="empty-state">
        <strong>尚未加入安裝 / 維修 / 保養項目</strong>
        <p class="muted-copy">每加入一個項目，就可以上傳該項目的相片並記錄分類。</p>
      </div>
    `;return}a.accessoryList.innerHTML=r.accessoryEntries.map((e,t)=>`
    <article class="accessory-card">
      <div class="accessory-head">
        <h3>項目 ${String(t+1).padStart(2,"0")}</h3>
        <button class="tiny-button" type="button" data-remove-entry="${e.id}">移除</button>
      </div>

      <label class="upload-zone ${e.photos.length?"has-preview":""}" data-camera-entry="${e.id}" for="upload-${e.id}">
        <input id="upload-${e.id}" type="file" accept="image/*" capture="environment" ${e.photos.length||h()?"disabled":""}>
        <div class="upload-zone-content">${J(e)}</div>
      </label>
      <input class="utility-file-input" id="library-${e.id}" type="file" accept="image/*" ${e.photos.length?"disabled":""}>

      <div class="choice-grid service-grid">${Q(e)}</div>
      <p class="accessory-subcopy">${K(e)}</p>
    </article>
  `).join(""),a.accessoryList.querySelectorAll("[data-remove-entry]").forEach(e=>{e.addEventListener("click",()=>{const t=r.accessoryEntries.findIndex(c=>c.id===e.dataset.removeEntry);t!==-1&&(r.accessoryEntries[t].photos.forEach(c=>f(c)),r.accessoryEntries.splice(t,1),d())})}),a.accessoryList.querySelectorAll("[data-entry-item]").forEach(e=>{e.addEventListener("click",()=>{const[t,c]=e.dataset.entryItem.split(":"),s=r.accessoryEntries.find(i=>i.id===t);if(s){if(s.itemIds.includes(c))s.itemIds=s.itemIds.filter(i=>i!==c);else{const i=new Set(s.itemIds);i.add(c),s.itemIds=r.serviceItems.map(o=>o.id).filter(o=>i.has(o))}d()}})}),a.accessoryList.querySelectorAll("[data-remove-accessory-photo]").forEach(e=>{e.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation();const[c,s]=e.dataset.removeAccessoryPhoto.split(":"),i=r.accessoryEntries.find(u=>u.id===c);if(!i)return;const o=i.photos.findIndex(u=>u.localId===s);o!==-1&&(f(i.photos[o]),i.photos.splice(o,1),d())})}),a.accessoryList.querySelectorAll("[data-camera-entry]").forEach(e=>{e.addEventListener("click",async t=>{if(!h()||t.target.closest("button"))return;const c=r.accessoryEntries.find(s=>s.id===e.dataset.cameraEntry);!c||c.photos.length>0||(t.preventDefault(),await w({kind:"accessory",entryId:c.id}))})}),a.accessoryList.querySelectorAll("[data-open-entry-camera]").forEach(e=>{e.addEventListener("click",async t=>{t.preventDefault(),t.stopPropagation(),await w({kind:"accessory",entryId:e.dataset.openEntryCamera})})}),a.accessoryList.querySelectorAll("[data-open-entry-library]").forEach(e=>{e.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation(),a.accessoryList.querySelector(`#library-${e.dataset.openEntryLibrary}`)?.click()})}),a.accessoryList.querySelectorAll('input[type="file"]').forEach(e=>{e.addEventListener("change",async()=>{const t=e.id.replace("upload-","").replace("library-",""),c=r.accessoryEntries.find(s=>s.id===t);if(!(!c||!e.files?.length))try{await $(c,e.files[0])}catch(s){n(l(s),"danger")}finally{e.value=""}})}),y()}async function $(e,t){if(t){if(e.photos.length>0){n("每個項目只可上傳一張相片。要再加入相片，請按「加入更多項目」。","danger"),X();return}n("處理項目相片中...",""),e.photos=[await U(t)],d(),n("已加入項目相片。","success")}}async function Z(){try{return await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:!1})}catch{return navigator.mediaDevices.getUserMedia({video:!0,audio:!1})}}async function B(){r.cameraStream&&(r.cameraStream.getTracks().forEach(e=>e.stop()),r.cameraStream=null),a.cameraVideo.srcObject=null}async function m(){a.cameraOverlay.hidden=!0,document.body.classList.remove("camera-open"),r.cameraTarget=null,await B()}async function w(e){if(h()){a.cameraTitle.textContent="拍安裝 / 維修 / 保養相片",r.cameraTarget=e,a.cameraOverlay.hidden=!1,document.body.classList.add("camera-open"),a.cameraVideo.hidden=!1,a.cameraCanvas.hidden=!0;try{r.cameraStream=await Z(),a.cameraVideo.srcObject=r.cameraStream,await a.cameraVideo.play()}catch(t){await m(),n(l(t),"danger")}}}function ee(e){const t=Date.now();return typeof File=="function"?new File([e],`service-${t}.jpg`,{type:"image/jpeg",lastModified:t}):(e.name=`service-${t}.jpg`,e)}async function te(){const e=r.cameraTarget;if(!e)return;const t=a.cameraVideo.videoWidth,c=a.cameraVideo.videoHeight;if(!t||!c){n("未能取得相機影像，請再試一次。","danger");return}a.shutterCameraBtn.disabled=!0;try{const s=Math.min(t,c),i=Math.floor((t-s)/2),o=Math.floor((c-s)/2);a.cameraCanvas.width=s,a.cameraCanvas.height=s;const u=a.cameraCanvas.getContext("2d");if(!u)throw new Error("無法建立拍照畫布。");u.drawImage(a.cameraVideo,i,o,s,s,0,0,s,s);const q=await new Promise((p,T)=>{a.cameraCanvas.toBlob(C=>C?p(C):T(new Error("拍照失敗。")),"image/jpeg",.92)}),A=ee(q);await m();const b=r.accessoryEntries.find(p=>p.id===e.entryId);if(!b){n("找不到目前項目，請重新拍照。","danger");return}await $(b,A)}catch(s){n(l(s),"danger")}finally{a.shutterCameraBtn.disabled=!1}}function re(){return r.selectedCaptureSetId?r.accessoryEntries.length?r.accessoryEntries.find(t=>!t.itemIds.length||!t.photos.length)?"每個項目都需要至少選 1 項分類並上傳 1 張相片。":"":"請至少加入 1 個安裝、維修或保養項目。":"請先選擇已 Check-in 車輛。"}function ae(){return r.accessoryEntries.map(e=>({itemIds:[...e.itemIds],notes:"",photos:e.photos}))}async function L(){const e=F(a.customServiceInput.value);if(!e){n("請先輸入未有的項目名稱。","danger"),a.customServiceInput.focus();return}a.addServiceItemBtn.disabled=!0;try{const t=await x(e);r.serviceItems=H(r.serviceItems,t),a.customServiceInput.value="";const c=r.accessoryEntries[r.accessoryEntries.length-1];c&&!c.itemIds.includes(t.id)&&(c.itemIds=[...c.itemIds,t.id]),d(),n(`已加入新項目「${t.name}」，之後所有用戶都可直接選用。`,"success")}catch(t){n(l(t),"danger")}finally{a.addServiceItemBtn.disabled=!1}}async function ce(e){e.preventDefault();const t=re();if(t){n(t,"danger");return}a.saveSetBtn.disabled=!0,n("正在上傳安裝維修保養資料...","");try{const c=await O(r.selectedCaptureSetId,ae());g(),r.selectedCaptureSetId="",await I({autoSelectFirst:!1}),n(`已為案件 ${c.reference} 新增安裝維修保養資料。`,"success"),document.querySelector(".capture-card")?.scrollIntoView({behavior:"smooth",block:"start"})}catch(c){n(l(c),"danger")}finally{a.saveSetBtn.disabled=!1}}function se(){a.addAccessoryBtn.addEventListener("click",()=>{r.accessoryEntries.push(S()),d(),n("已新增一個服務項目。",""),window.requestAnimationFrame(()=>{a.accessoryList.lastElementChild?.scrollIntoView({behavior:"smooth",block:"nearest"})})}),a.addServiceItemBtn.addEventListener("click",L),a.customServiceInput.addEventListener("keydown",async e=>{e.key==="Enter"&&(e.preventDefault(),await L())}),a.captureForm.addEventListener("submit",ce),a.closeCameraBtn.addEventListener("click",m),a.cancelCameraBtn.addEventListener("click",m),a.shutterCameraBtn.addEventListener("click",te),a.cameraOverlay.addEventListener("click",async e=>{e.target===a.cameraOverlay&&await m()}),window.addEventListener("beforeunload",()=>{B(),k()})}async function ne(){const e=await M("../index.html");R(e),r.accessoryEntries=[S()],d(),n("正在載入已 Check-in 車輛與服務項目...","");try{const[t]=await Promise.all([V(),I()]);r.serviceItems=t,d(),n(r.checkInSets.length?"已連接 Supabase，可選擇車輛後開始輸入安裝維修保養資料。":"已連接 Supabase，但暫時未有已 Check-in 車輛。",r.checkInSets.length?"success":"")}catch(t){n(l(t),"danger")}se()}ne();
