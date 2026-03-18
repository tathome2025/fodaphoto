import{r as u,d as r,m as d,n as k,u as m}from"./workbench-BWYZBm2m.js";const s={currentUserEmail:document.querySelector("#currentUserEmail"),checkoutVehicleList:document.querySelector("#checkoutVehicleList"),checkoutBtn:document.querySelector("#checkoutBtn"),checkoutStatus:document.querySelector("#checkoutStatus")},c={checkInSets:[],selectedCaptureSetId:"",vehicleThumbUrls:new Map};function v(e){s.currentUserEmail&&(s.currentUserEmail.textContent=e?.email||e?.phone||e?.id||"-")}function n(e,t){s.checkoutStatus.textContent=e,s.checkoutStatus.className="status-text",t&&s.checkoutStatus.classList.add(`is-${t}`)}function h(){return c.checkInSets.find(e=>e.id===c.selectedCaptureSetId)||null}function a(){s.checkoutBtn.disabled=!h()}function l(){if(!c.checkInSets.length){s.checkoutVehicleList.innerHTML=`
      <div class="empty-state">
        <strong>暫時未有可 Check out 車輛</strong>
        <p class="muted-copy">所有已 Check-in 車輛都已完成，或暫時未建立新案件。</p>
      </div>
    `,a();return}s.checkoutVehicleList.innerHTML=c.checkInSets.map(e=>{const t=c.vehicleThumbUrls.get(e.id),i=e.vehiclePhotos[0];return`
      <article class="vehicle-select-card ${e.id===c.selectedCaptureSetId?"is-selected":""}">
        <button
          class="vehicle-select-main"
          type="button"
          data-select-capture-set="${e.id}"
        >
          <div class="vehicle-select-thumb">
            ${t?`<img src="${t}" alt="${e.brandName}${e.vehicleModel?` ${e.vehicleModel}`:""}">`:i?'<div class="vehicle-thumb-placeholder">載入縮圖中</div>':'<div class="vehicle-thumb-placeholder">未有車輛相片</div>'}
          </div>
          <div class="vehicle-select-body">
            <strong>${e.brandName}${e.vehicleModel?` ${e.vehicleModel}`:""}</strong>
            <span>Check-in：${e.createdByLabel||"未記錄"}</span>
          </div>
        </button>
      </article>
    `}).join(""),s.checkoutVehicleList.querySelectorAll("[data-select-capture-set]").forEach(e=>{e.addEventListener("click",()=>{c.selectedCaptureSetId=e.dataset.selectCaptureSet,l(),n("已選擇車輛，可按下 Check out。","")})}),a()}async function C(){const e=c.checkInSets.filter(t=>t.vehiclePhotos[0]?.storagePath&&!c.vehicleThumbUrls.has(t.id));e.length&&(await Promise.all(e.map(async t=>{try{const i=await k(t.vehiclePhotos[0].storagePath,{width:360,height:270});c.vehicleThumbUrls.set(t.id,i)}catch{c.vehicleThumbUrls.set(t.id,"")}})),l())}async function o(){c.checkInSets=await d(48),c.checkInSets.some(e=>e.id===c.selectedCaptureSetId)||(c.selectedCaptureSetId=""),l(),await C()}async function S(){const e=h();if(!e){n("請先選擇一台要 Check out 的車輛。","danger");return}s.checkoutBtn.disabled=!0,n("正在完成 Check out...","");try{const t=await m(e.id);c.selectedCaptureSetId="",await o(),n(`案件 ${t.reference||e.id} 已 Check out，之後不再出現在安裝維修保養及 Check out 頁。`,"success"),document.querySelector(".capture-card")?.scrollIntoView({behavior:"smooth",block:"start"})}catch(t){n(r(t),"danger")}finally{a()}}function b(){s.checkoutBtn.addEventListener("click",S)}async function f(){const e=await u("../index.html");v(e),n("正在載入已 Check-in 車輛...","");try{await o(),n(c.checkInSets.length?"已連接 Supabase，請選擇一台車並執行 Check out。":"已連接 Supabase，但暫時未有可 Check out 車輛。",c.checkInSets.length?"success":"")}catch(t){n(r(t),"danger")}b()}f();
