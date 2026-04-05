import { requireAuthorizedPage } from "./supabase-browser.js";
import {
  describeSupabaseError,
  fetchRecentCheckInSets,
  getSignedPhotoUrl,
  markCaptureSetServiceCompleted,
  PHOTO_MISSING_PLACEHOLDER_URL,
  shouldUseMissingPhotoPlaceholder,
} from "./workbench.js";

const refs = {
  currentUserEmail: document.querySelector("#currentUserEmail"),
  checkoutVehicleList: document.querySelector("#checkoutVehicleList"),
  checkoutBtn: document.querySelector("#checkoutBtn"),
  checkoutStatus: document.querySelector("#checkoutStatus"),
  checkoutDetailSection: document.querySelector("#checkoutDetailSection"),
  checkoutDetailTitle: document.querySelector("#checkoutDetailTitle"),
  checkoutDetailSubtitle: document.querySelector("#checkoutDetailSubtitle"),
  checkoutDetailContent: document.querySelector("#checkoutDetailContent"),
};

const state = {
  checkInSets: [],
  selectedCaptureSetId: "",
  vehicleThumbUrls: new Map(),
  photoThumbUrls: new Map(),
};

function syncCurrentUser(user) {
  if (refs.currentUserEmail) {
    refs.currentUserEmail.textContent = user?.email || user?.phone || user?.id || "-";
  }
}

function setStatus(message, type) {
  refs.checkoutStatus.textContent = message;
  refs.checkoutStatus.className = "status-text";
  if (type) {
    refs.checkoutStatus.classList.add(`is-${type}`);
  }
}

function getSelectedCaptureSet() {
  return state.checkInSets.find((captureSet) => captureSet.id === state.selectedCaptureSetId) || null;
}

function renderCheckoutButton() {
  refs.checkoutBtn.disabled = !getSelectedCaptureSet();
}

function renderVehicleList() {
  if (!state.checkInSets.length) {
    refs.checkoutVehicleList.innerHTML = `
      <div class="empty-state">
        <strong>暫時未有可 Check out 車輛</strong>
        <p class="muted-copy">所有已 Check-in 車輛都已完成，或暫時未建立新案件。</p>
      </div>
    `;
    renderCheckoutButton();
    return;
  }

  refs.checkoutVehicleList.innerHTML = state.checkInSets.map((captureSet) => {
    const thumbUrl = state.vehicleThumbUrls.get(captureSet.id);
    const vehiclePhoto = captureSet.vehiclePhotos[0];
    return `
      <article class="vehicle-select-card ${captureSet.id === state.selectedCaptureSetId ? "is-selected" : ""}">
        <button
          class="vehicle-select-main"
          type="button"
          data-select-capture-set="${captureSet.id}"
        >
          <div class="vehicle-select-thumb">
            ${thumbUrl
              ? `<img src="${thumbUrl}" alt="${captureSet.brandName}${captureSet.vehicleModel ? ` ${captureSet.vehicleModel}` : ""}">`
              : vehiclePhoto
                ? `<div class="vehicle-thumb-placeholder">載入縮圖中</div>`
                : `<div class="vehicle-thumb-placeholder">未有車輛相片</div>`}
          </div>
          <div class="vehicle-select-body">
            <strong>${captureSet.brandName}${captureSet.vehicleModel ? ` ${captureSet.vehicleModel}` : ""}</strong>
            <span>Check-in：${captureSet.createdByLabel || "未記錄"}</span>
          </div>
        </button>
      </article>
    `;
  }).join("");

  refs.checkoutVehicleList.querySelectorAll("[data-select-capture-set]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCaptureSetId = button.dataset.selectCaptureSet;
      renderVehicleList();
      renderSelectedVehicleDetail();
      setStatus("已選擇車輛，可按下 Check out。", "");
    });
  });

  renderCheckoutButton();
}

function renderPhotoCard(photo, { lazy = false } = {}) {
  const thumbUrl = state.photoThumbUrls.get(photo.storagePath);
  const imgHtml = thumbUrl
    ? `<img src="${thumbUrl}" alt="${photo.itemLabel || photo.itemName || "相片"}" loading="lazy">`
    : `<div class="vehicle-thumb-placeholder" style="aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;font-size:0.8rem;">${lazy ? "載入中…" : "未有相片"}</div>`;
  return `
    <div class="record-photo-card" data-photo-path="${photo.storagePath || ""}">
      <div class="record-photo-frame">${imgHtml}</div>
      ${photo.createdByLabel || photo.createdAt ? `
      <div class="record-photo-caption">
        ${photo.createdByLabel ? `<strong>${photo.createdByLabel}</strong>` : ""}
        ${photo.createdAt ? `<span>${new Date(photo.createdAt).toLocaleString("zh-Hant", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>` : ""}
      </div>` : ""}
    </div>
  `;
}

function renderSelectedVehicleDetail() {
  const captureSet = getSelectedCaptureSet();
  if (!captureSet) {
    refs.checkoutDetailSection.hidden = true;
    return;
  }

  const vehicleName = `${captureSet.brandName}${captureSet.vehicleModel ? ` ${captureSet.vehicleModel}` : ""}`;
  refs.checkoutDetailTitle.textContent = `${vehicleName} — 維修詳情`;
  refs.checkoutDetailSubtitle.textContent = `Check-in：${captureSet.createdByLabel || "未記錄"}`;

  const { orderSheetPhotos = [], accessoryEntries = [] } = captureSet;

  let html = "";

  // Order sheet section
  if (orderSheetPhotos.length) {
    html += `
      <div class="accessory-card" style="margin-bottom:1rem;">
        <div class="accessory-head"><h3>Order Sheet 工作單</h3></div>
        <div class="record-photo-grid">${orderSheetPhotos.map((p) => renderPhotoCard(p, { lazy: true })).join("")}</div>
      </div>
    `;
  }

  // Service items section
  if (accessoryEntries.length) {
    html += `<div style="display:grid;gap:0.9rem;">`;
    accessoryEntries.forEach((entry) => {
      const label = entry.itemLabel || entry.itemName || "未分類項目";
      const notes = entry.notes ? `<p class="accessory-subcopy">${entry.notes}</p>` : "";
      const photos = (entry.photos || []).map((p) => renderPhotoCard(p, { lazy: true })).join("");
      html += `
        <div class="accessory-card">
          <div class="accessory-head"><h3>${label}</h3></div>
          ${notes}
          ${photos ? `<div class="record-photo-grid">${photos}</div>` : ""}
        </div>
      `;
    });
    html += `</div>`;
  }

  if (!orderSheetPhotos.length && !accessoryEntries.length) {
    html = `<div class="empty-state compact"><p class="muted-copy">此車輛暫時未有上傳安裝維修保養相片。</p></div>`;
  }

  refs.checkoutDetailContent.innerHTML = html;
  refs.checkoutDetailSection.hidden = false;
  refs.checkoutDetailSection.scrollIntoView({ behavior: "smooth", block: "nearest" });

  hydrateDetailThumbs(captureSet);
}

async function hydrateDetailThumbs(captureSet) {
  const allPhotos = [
    ...(captureSet.orderSheetPhotos || []),
    ...(captureSet.accessoryEntries || []).flatMap((e) => e.photos || []),
  ];

  const pending = allPhotos.filter((p) => p.storagePath && !state.photoThumbUrls.has(p.storagePath));
  if (!pending.length) return;

  await Promise.all(pending.map(async (photo) => {
    try {
      const url = await getSignedPhotoUrl(photo.storagePath, { width: 400, height: 300 });
      state.photoThumbUrls.set(photo.storagePath, url);
    } catch {
      state.photoThumbUrls.set(photo.storagePath, PHOTO_MISSING_PLACEHOLDER_URL);
    }
  }));

  // Patch img elements in-place without full re-render
  refs.checkoutDetailContent.querySelectorAll("[data-photo-path]").forEach((card) => {
    const path = card.dataset.photoPath;
    if (!path) return;
    const url = state.photoThumbUrls.get(path);
    if (!url) return;
    const frame = card.querySelector(".record-photo-frame");
    if (!frame) return;
    const existing = frame.querySelector("img");
    if (existing) return; // already loaded
    frame.innerHTML = `<img src="${url}" alt="相片" loading="lazy">`;
  });
}

async function hydrateVehicleThumbs() {
  const pendingSets = state.checkInSets.filter((captureSet) =>
    captureSet.vehiclePhotos[0]?.storagePath
    && !state.vehicleThumbUrls.has(captureSet.id)
  );

  if (!pendingSets.length) {
    return;
  }

  await Promise.all(pendingSets.map(async (captureSet) => {
    try {
      const thumbUrl = await getSignedPhotoUrl(captureSet.vehiclePhotos[0].storagePath, {
        width: 360,
        height: 270,
      });
      state.vehicleThumbUrls.set(captureSet.id, thumbUrl);
    } catch (error) {
      state.vehicleThumbUrls.set(
        captureSet.id,
        shouldUseMissingPhotoPlaceholder(error) ? PHOTO_MISSING_PLACEHOLDER_URL : ""
      );
    }
  }));

  renderVehicleList();
}

async function loadCheckInSets() {
  state.checkInSets = await fetchRecentCheckInSets(48);
  if (!state.checkInSets.some((captureSet) => captureSet.id === state.selectedCaptureSetId)) {
    state.selectedCaptureSetId = "";
  }
  renderVehicleList();
  await hydrateVehicleThumbs();
}

async function handleCheckout() {
  const selected = getSelectedCaptureSet();
  if (!selected) {
    setStatus("請先選擇一台要 Check out 的車輛。", "danger");
    return;
  }

  refs.checkoutBtn.disabled = true;
  setStatus("正在完成 Check out...", "");

  try {
    const result = await markCaptureSetServiceCompleted(selected.id);
    state.selectedCaptureSetId = "";
    refs.checkoutDetailSection.hidden = true;
    await loadCheckInSets();
    setStatus(`案件 ${result.reference || selected.id} 已 Check out，之後不再出現在安裝維修保養及 Check out 頁。`, "success");
    document.querySelector(".capture-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    renderCheckoutButton();
  }
}

function bindEvents() {
  refs.checkoutBtn.addEventListener("click", handleCheckout);
}

async function init() {
  const user = await requireAuthorizedPage(["admin", "superadmin", "supreadmin"], "../index.html");
  syncCurrentUser(user);
  setStatus("正在載入已 Check-in 車輛...", "");

  try {
    await loadCheckInSets();
    setStatus(
      state.checkInSets.length
        ? "已連接 Supabase，請選擇一台車並執行 Check out。"
        : "已連接 Supabase，但暫時未有可 Check out 車輛。",
      state.checkInSets.length ? "success" : ""
    );
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  }

  bindEvents();
}

init();
