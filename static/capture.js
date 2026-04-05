import { requireAuthorizedPage } from "./supabase-browser.js";
import {
  appendServiceEntriesToCaptureSet,
  createServiceItem,
  describeSupabaseError,
  fetchRecentCheckInSets,
  fetchServiceItems,
  fileToDraftAsset,
  formatDateTime,
  attachThumbFallback,
  getSignedPhotoUrl,
  getSignedPhotoUrlsBatch,
  PHOTO_MISSING_PLACEHOLDER_URL,
  revokeDraftAsset,
  shouldUseMissingPhotoPlaceholder,
} from "./workbench.js";

const refs = {
  captureForm: document.querySelector("#captureForm"),
  checkInVehicleList: document.querySelector("#checkInVehicleList"),
  accessoryList: document.querySelector("#accessoryList"),
  customServiceInput: document.querySelector("#customServiceInput"),
  addServiceItemBtn: document.querySelector("#addServiceItemBtn"),
  addAccessoryBtn: document.querySelector("#addAccessoryBtn"),
  saveSetBtn: document.querySelector("#saveSetBtn"),
  captureStatus: document.querySelector("#captureStatus"),
  cameraOverlay: document.querySelector("#cameraOverlay"),
  cameraTitle: document.querySelector("#cameraTitle"),
  cameraVideo: document.querySelector("#cameraVideo"),
  cameraCanvas: document.querySelector("#cameraCanvas"),
  closeCameraBtn: document.querySelector("#closeCameraBtn"),
  cancelCameraBtn: document.querySelector("#cancelCameraBtn"),
  shutterCameraBtn: document.querySelector("#shutterCameraBtn"),
  orderSheetSection: document.querySelector("#orderSheetSection"),
  orderSheetMeta: document.querySelector("#orderSheetMeta"),
  orderSheetPreviewGrid: document.querySelector("#orderSheetPreviewGrid"),
  orderSheetHistoryList: document.querySelector("#orderSheetHistoryList"),
  updateOrderSheetBtn: document.querySelector("#updateOrderSheetBtn"),
  clearOrderSheetDraftBtn: document.querySelector("#clearOrderSheetDraftBtn"),
  orderSheetLightbox: document.querySelector("#orderSheetLightbox"),
  closeOrderSheetLightboxBtn: document.querySelector("#closeOrderSheetLightboxBtn"),
  orderSheetLightboxImage: document.querySelector("#orderSheetLightboxImage"),
  orderSheetFullSizeBtn: document.querySelector("#orderSheetFullSizeBtn"),
  orderSheetLightboxTitle: document.querySelector("#orderSheetLightboxTitle"),
  orderSheetLightboxMeta: document.querySelector("#orderSheetLightboxMeta"),
  currentUserEmail: document.querySelector("#currentUserEmail"),
  captureServiceHistory: document.querySelector("#captureServiceHistory"),
  captureServiceHistoryContent: document.querySelector("#captureServiceHistoryContent"),
};

const state = {
  serviceItems: [],
  accessoryEntries: [],
  checkInSets: [],
  selectedCaptureSetId: "",
  vehicleThumbUrls: new Map(),
  orderSheetThumbUrls: new Map(),
  orderSheetFullUrls: new Map(),
  orderSheetPhotoById: new Map(),
  servicePhotoThumbUrls: new Map(),
  pendingOrderSheetPhoto: null,
  pendingOrderSheetCapturedAt: "",
  cameraTarget: null,
  cameraStream: null,
};

const CAMERA_OUTPUT_SIZE = 2000;

function createAccessoryEntry() {
  return {
    id: `entry-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    itemIds: [],
    photos: [],
  };
}

function normalizeText(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function mergeLookupItem(items, nextItem) {
  return [...items.filter((item) => item.id !== nextItem.id), nextItem]
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return left.name.localeCompare(right.name, "zh-Hant");
    });
}

function setStatus(message, type) {
  refs.captureStatus.textContent = message;
  refs.captureStatus.className = "status-text";
  if (type) {
    refs.captureStatus.classList.add(`is-${type}`);
  }
}

function syncCurrentUser(user) {
  if (refs.currentUserEmail) {
    refs.currentUserEmail.textContent = user?.email || user?.phone || user?.id || "-";
  }
}

function isDirectCameraMode() {
  return Boolean(
    window.matchMedia?.("(pointer: coarse)").matches
    && navigator.mediaDevices?.getUserMedia
  );
}

function getAccessoryPromptText() {
  return isDirectCameraMode()
    ? "拍安裝 / 維修 / 保養相片"
    : "拍安裝 / 維修 / 保養相片或上傳";
}

function renderUploadActions(entryId = "") {
  if (!isDirectCameraMode()) {
    return "";
  }

  return `
    <div class="upload-action-row">
      <button class="primary-button upload-action-btn" type="button" data-open-entry-camera="${entryId}">拍照（開啟相機）</button>
      <button class="secondary-button upload-action-btn" type="button" data-open-entry-library="${entryId}">上傳相片（從相簿）</button>
    </div>
  `;
}

function getPreviewRatio(photo) {
  if (!photo?.width || !photo?.height) {
    return "1 / 1";
  }
  return `${photo.width} / ${photo.height}`;
}

function renderUploadCover(photo, altText, removeAttr, removeValue) {
  return `
    <figure class="upload-cover">
      <div class="upload-cover-frame" style="aspect-ratio: ${getPreviewRatio(photo)};">
        <img src="${photo.previewUrl}" alt="${altText}">
      </div>
      <figcaption class="upload-cover-footer">
        <span>${photo.fileName}</span>
        <button class="tiny-button" type="button" ${removeAttr}="${removeValue}">移除</button>
      </figcaption>
    </figure>
  `;
}

function flashAddAccessoryButton() {
  refs.addAccessoryBtn.classList.remove("is-flashing");
  window.requestAnimationFrame(() => {
    refs.addAccessoryBtn.classList.add("is-flashing");
    window.setTimeout(() => {
      refs.addAccessoryBtn.classList.remove("is-flashing");
    }, 1200);
  });
}

function hasDraftServiceData() {
  return Boolean(state.pendingOrderSheetPhoto)
    || state.accessoryEntries.some((entry) =>
      entry.itemIds.length > 0
      || entry.photos.length > 0
    );
}

function clearAccessoryAssets() {
  state.accessoryEntries.forEach((entry) => {
    entry.photos.forEach((asset) => revokeDraftAsset(asset));
  });
}

function clearPendingOrderSheetPhoto() {
  if (state.pendingOrderSheetPhoto) {
    revokeDraftAsset(state.pendingOrderSheetPhoto);
  }
  state.pendingOrderSheetPhoto = null;
  state.pendingOrderSheetCapturedAt = "";
}

function getSelectedCaptureSet() {
  return state.checkInSets.find((captureSet) => captureSet.id === state.selectedCaptureSetId) || null;
}

function getOrderSheetPhotosSorted(captureSet) {
  return [...(captureSet?.orderSheetPhotos || [])]
    .sort((left, right) => `${right.createdAt || ""}`.localeCompare(`${left.createdAt || ""}`));
}

function openOrderSheetLightboxBySrc(imageSrc, title, meta) {
  refs.orderSheetLightboxTitle.textContent = title || "Order Sheet";
  refs.orderSheetLightboxMeta.textContent = meta || "";
  refs.orderSheetLightboxImage.src = imageSrc || PHOTO_MISSING_PLACEHOLDER_URL;
  refs.orderSheetLightbox.hidden = false;
}

async function openOrderSheetLightboxByPath(storagePath, title, meta) {
  refs.orderSheetLightboxTitle.textContent = title || "Order Sheet";
  refs.orderSheetLightboxMeta.textContent = meta || "";
  refs.orderSheetLightboxImage.src = PHOTO_MISSING_PLACEHOLDER_URL;
  refs.orderSheetLightbox.hidden = false;

  if (!storagePath) {
    return;
  }

  try {
    if (!state.orderSheetFullUrls.has(storagePath)) {
      state.orderSheetFullUrls.set(storagePath, await getSignedPhotoUrl(storagePath));
    }
    refs.orderSheetLightboxImage.src = state.orderSheetFullUrls.get(storagePath);
  } catch (error) {
    refs.orderSheetLightboxImage.src = shouldUseMissingPhotoPlaceholder(error)
      ? PHOTO_MISSING_PLACEHOLDER_URL
      : "";
    setStatus(describeSupabaseError(error), "danger");
  }
}

function closeOrderSheetLightbox() {
  refs.orderSheetLightbox.hidden = true;
  refs.orderSheetLightboxImage.closest(".order-sheet-lightbox-frame").classList.remove("is-full-size");
  refs.orderSheetFullSizeBtn.textContent = "原始大小";
}

function resetAccessoryEntries() {
  clearAccessoryAssets();
  clearPendingOrderSheetPhoto();
  state.accessoryEntries = [createAccessoryEntry()];
  renderAccessoryList();
  renderCheckInVehicleList();
}

function renderCheckInVehicleList() {
  if (!state.checkInSets.length) {
    refs.checkInVehicleList.innerHTML = `
      <div class="empty-state">
        <strong>暫時未有已 Check-in 車輛</strong>
        <p class="muted-copy">請先到 Check-in 頁建立車輛資料，然後再回來拍安裝維修保養相片。</p>
      </div>
    `;
    renderOrderSheetPanel();
    return;
  }

  if (state.selectedCaptureSetId && hasDraftServiceData()) {
    refs.checkInVehicleList.innerHTML = "";
    renderOrderSheetPanel();
    return;
  }

  refs.checkInVehicleList.innerHTML = state.checkInSets.map((captureSet) => {
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

  refs.checkInVehicleList.querySelectorAll("[data-select-capture-set]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextId = button.dataset.selectCaptureSet;
      if (nextId === state.selectedCaptureSetId) {
        return;
      }
      if (hasDraftServiceData()) {
        resetAccessoryEntries();
        setStatus("已切換車輛，未儲存的服務草稿已清空。", "danger");
      }
      state.selectedCaptureSetId = nextId;
      renderCheckInVehicleList();
    });
  });

  renderOrderSheetPanel();
}

async function hydrateOrderSheetPreviews() {
  const cards = [...refs.orderSheetPreviewGrid.querySelectorAll("[data-order-sheet-path]")];
  if (!cards.length) return;

  const paths = cards.map((c) => c.dataset.orderSheetPath).filter(Boolean);
  const urlMap = await getSignedPhotoUrlsBatch(paths, { useThumb: true });

  cards.forEach((card) => {
    const image = card.querySelector("img");
    if (!image) return;
    const path = card.dataset.orderSheetPath;
    const url = urlMap.get(path);
    image.src = url || PHOTO_MISSING_PLACEHOLDER_URL;
  });
}

function renderServiceHistoryPanel() {
  const selectedSet = getSelectedCaptureSet();
  if (!selectedSet || !(selectedSet.accessoryEntries || []).length) {
    refs.captureServiceHistory.hidden = true;
    refs.captureServiceHistoryContent.innerHTML = "";
    return;
  }

  const entries = selectedSet.accessoryEntries;
  refs.captureServiceHistoryContent.innerHTML = entries.map((entry) => {
    const label = entry.itemLabel || entry.itemName || "未分類項目";
    const notes = entry.notes ? `<p class="accessory-subcopy">${entry.notes}</p>` : "";
    const photos = (entry.photos || []).map((photo) => {
      const thumbUrl = state.servicePhotoThumbUrls.get(photo.storagePath);
      const imgHtml = thumbUrl
        ? `<img src="${thumbUrl}" alt="${label}" loading="lazy">`
        : `<div class="vehicle-thumb-placeholder" style="aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;font-size:0.8rem;">載入中…</div>`;
      return `
        <div class="record-photo-card" data-service-photo-path="${photo.storagePath || ""}">
          <div class="record-photo-frame">${imgHtml}</div>
          ${photo.createdByLabel || photo.createdAt ? `
          <div class="record-photo-caption">
            ${photo.createdByLabel ? `<strong>${photo.createdByLabel}</strong>` : ""}
            ${photo.createdAt ? `<span>${new Date(photo.createdAt).toLocaleString("zh-Hant", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>` : ""}
          </div>` : ""}
        </div>
      `;
    }).join("");

    return `
      <div class="accessory-card" style="margin-bottom:0.9rem;">
        <div class="accessory-head"><h3>${label}</h3></div>
        ${notes}
        ${photos ? `<div class="record-photo-grid">${photos}</div>` : ""}
      </div>
    `;
  }).join("");

  refs.captureServiceHistory.hidden = false;
  hydrateServicePhotoThumbs(selectedSet);
}

async function hydrateServicePhotoThumbs(captureSet) {
  const allPhotos = (captureSet.accessoryEntries || []).flatMap((e) => e.photos || []);
  const pending = allPhotos.filter((p) => p.storagePath && !state.servicePhotoThumbUrls.has(p.storagePath));
  if (!pending.length) return;

  const paths = pending.map((p) => p.storagePath);
  const urlMap = await getSignedPhotoUrlsBatch(paths, { useThumb: true });
  urlMap.forEach((url, path) => { if (url) state.servicePhotoThumbUrls.set(path, url); });

  refs.captureServiceHistoryContent.querySelectorAll("[data-service-photo-path]").forEach((card) => {
    const path = card.dataset.servicePhotoPath;
    if (!path) return;
    const url = urlMap.get(path);
    const frame = card.querySelector(".record-photo-frame");
    if (!frame || frame.querySelector("img")) return;
    if (!url) {
      frame.innerHTML = `<img src="${PHOTO_MISSING_PLACEHOLDER_URL}" alt="未有相片">`;
      return;
    }
    frame.innerHTML = `<img src="${url}" alt="相片" loading="lazy">`;
  });
}

function renderOrderSheetPanel() {
  const selectedSet = getSelectedCaptureSet();
  if (!selectedSet) {
    closeOrderSheetLightbox();
    refs.orderSheetSection.hidden = true;
    refs.updateOrderSheetBtn.disabled = true;
    refs.orderSheetMeta.innerHTML = "";
    refs.orderSheetPreviewGrid.innerHTML = "";
    refs.orderSheetHistoryList.innerHTML = "";
    refs.clearOrderSheetDraftBtn.hidden = true;
    return;
  }

  refs.orderSheetSection.hidden = false;
  refs.updateOrderSheetBtn.disabled = false;
  const sortedPhotos = getOrderSheetPhotosSorted(selectedSet);
  state.orderSheetPhotoById = new Map(sortedPhotos.map((photo) => [photo.id, photo]));
  const latest = sortedPhotos[0] || null;
  const history = sortedPhotos.slice(1);
  const latestMeta = latest
    ? `目前版本：${formatDateTime(latest.createdAt)} · ${latest.createdByLabel || "未記錄"}`
    : "目前版本：未有 Order Sheet";
  const pendingMeta = state.pendingOrderSheetPhoto
    ? `待更新版本：${formatDateTime(state.pendingOrderSheetCapturedAt || new Date().toISOString())} · ${refs.currentUserEmail?.textContent || "目前帳號"}`
    : "";

  refs.orderSheetMeta.innerHTML = `
    <p class="order-sheet-state-line is-current">${latestMeta}</p>
    ${pendingMeta ? `<p class="order-sheet-state-line is-pending">${pendingMeta}</p>` : ""}
  `;

  refs.orderSheetPreviewGrid.innerHTML = `
    <article class="record-photo-card">
      <div class="record-photo-frame">
        ${latest
          ? `
            <button
              class="order-sheet-preview-button"
              type="button"
              data-open-order-sheet-path="${latest.storagePath}"
              data-open-order-sheet-title="目前 Order Sheet"
              data-open-order-sheet-photo-id="${latest.id}"
            >
              <div data-order-sheet-path="${latest.storagePath}" data-order-sheet-photo-id="${latest.id}">
                <img alt="目前 Order Sheet">
              </div>
            </button>
          `
          : `<img src="${PHOTO_MISSING_PLACEHOLDER_URL}" alt="未有 Order Sheet">`}
      </div>
      <div class="record-photo-caption">
        <strong>目前版本</strong>
        <span>${latest ? latest.fileName : "未有資料"}</span>
      </div>
    </article>
    ${state.pendingOrderSheetPhoto ? `
      <article class="record-photo-card">
        <div class="record-photo-frame">
          <button
            class="order-sheet-preview-button"
            type="button"
            data-open-order-sheet-src="${state.pendingOrderSheetPhoto.previewUrl}"
            data-open-order-sheet-title="待更新 Order Sheet（未上傳）"
            data-open-order-sheet-draft="true"
          >
            <img src="${state.pendingOrderSheetPhoto.previewUrl}" alt="待更新 Order Sheet">
          </button>
        </div>
        <div class="record-photo-caption">
          <strong>待更新（按完成後上傳）</strong>
          <span>${state.pendingOrderSheetPhoto.fileName}</span>
        </div>
      </article>
    ` : ""}
  `;

  refs.orderSheetHistoryList.innerHTML = history.length
    ? history.map((photo, index) => `
      <button
        class="order-sheet-history-link"
        type="button"
        data-open-order-sheet-path="${photo.storagePath}"
        data-open-order-sheet-title="舊版本 Order Sheet #${history.length - index}"
        data-open-order-sheet-photo-id="${photo.id}"
      >
        ${formatDateTime(photo.createdAt)} · ${photo.createdByLabel || "未記錄"}
      </button>
    `).join("")
    : `<p class="muted-copy">暫時未有舊版本。</p>`;

  refs.clearOrderSheetDraftBtn.hidden = !state.pendingOrderSheetPhoto;
  bindOrderSheetInteractions();
  hydrateOrderSheetPreviews();
  renderServiceHistoryPanel();
}

function bindOrderSheetInteractions() {
  refs.orderSheetSection.querySelectorAll("[data-open-order-sheet-path]").forEach((button) => {
    button.addEventListener("click", async () => {
      const photo = state.orderSheetPhotoById.get(button.dataset.openOrderSheetPhotoId || "");
      const meta = photo
        ? `${formatDateTime(photo.createdAt)} · ${photo.createdByLabel || "未記錄"}`
        : "";
      await openOrderSheetLightboxByPath(
        button.dataset.openOrderSheetPath,
        button.dataset.openOrderSheetTitle,
        meta
      );
    });
  });

  refs.orderSheetSection.querySelectorAll("[data-open-order-sheet-src]").forEach((button) => {
    const draftMeta = `${formatDateTime(state.pendingOrderSheetCapturedAt || new Date().toISOString())} · ${refs.currentUserEmail?.textContent || "目前帳號"}`;
    button.addEventListener("click", () => {
      openOrderSheetLightboxBySrc(
        button.dataset.openOrderSheetSrc,
        button.dataset.openOrderSheetTitle,
        draftMeta
      );
    });
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

  const paths = pendingSets.map((captureSet) => captureSet.vehiclePhotos[0].storagePath);
  const urlMap = await getSignedPhotoUrlsBatch(paths, { useThumb: true });
  pendingSets.forEach((captureSet) => {
    const url = urlMap.get(captureSet.vehiclePhotos[0].storagePath) || PHOTO_MISSING_PLACEHOLDER_URL;
    state.vehicleThumbUrls.set(captureSet.id, url);
  });

  renderCheckInVehicleList();

  refs.checkInVehicleList.querySelectorAll("[data-select-capture-set]").forEach((button) => {
    const captureSet = state.checkInSets.find((s) => s.id === button.dataset.selectCaptureSet);
    const originalPath = captureSet?.vehiclePhotos[0]?.storagePath;
    const img = button.querySelector("img");
    attachThumbFallback(img, originalPath);
  });
}

async function loadCheckInSets(options = {}) {
  const previousSelectedId = options.keepSelection ? state.selectedCaptureSetId : "";
  state.checkInSets = await fetchRecentCheckInSets(24);

  if (previousSelectedId && state.checkInSets.some((captureSet) => captureSet.id === previousSelectedId)) {
    state.selectedCaptureSetId = previousSelectedId;
  } else if (options.autoSelectFirst === false) {
    state.selectedCaptureSetId = "";
  } else {
    state.selectedCaptureSetId = state.checkInSets[0]?.id || "";
  }

  renderCheckInVehicleList();
  await hydrateVehicleThumbs();
}

function renderAccessoryPreview(entry) {
  if (!entry.photos.length) {
    return `
      <div class="upload-prompt">
        <strong>${getAccessoryPromptText()}</strong>
        <small>每個項目只可上傳一張相片。</small>
        ${renderUploadActions(entry.id)}
      </div>
    `;
  }

  return entry.photos.map((photo) => renderUploadCover(
    photo,
    photo.fileName,
    "data-remove-accessory-photo",
    `${entry.id}:${photo.localId}`
  )).join("");
}

function formatAccessorySelection(entry) {
  if (!entry.itemIds.length) {
    return "可選多於一項安裝、維修或保養項目。";
  }

  return `已選：${state.serviceItems
    .filter((item) => entry.itemIds.includes(item.id))
    .map((item) => item.name)
    .join(" + ")}`;
}

function renderServiceButtons(entry) {
  return state.serviceItems.map((item) => `
    <button class="choice-button ${entry.itemIds.includes(item.id) ? "is-selected" : ""}" type="button" data-entry-item="${entry.id}:${item.id}">
      <strong>${item.name}</strong>
      <span>可多選</span>
    </button>
  `).join("");
}

function renderAccessoryList() {
  if (!state.accessoryEntries.length) {
    refs.accessoryList.innerHTML = `
      <div class="empty-state">
        <strong>尚未加入安裝 / 維修 / 保養項目</strong>
        <p class="muted-copy">每加入一個項目，就可以上傳該項目的相片並記錄分類。</p>
      </div>
    `;
    return;
  }

  refs.accessoryList.innerHTML = state.accessoryEntries.map((entry, index) => `
    <article class="accessory-card">
      <div class="accessory-head">
        <h3>項目 ${String(index + 1).padStart(2, "0")}</h3>
        <button class="tiny-button" type="button" data-remove-entry="${entry.id}">移除</button>
      </div>

      <label class="upload-zone ${entry.photos.length ? "has-preview" : ""}" data-camera-entry="${entry.id}" for="upload-${entry.id}">
        <input id="upload-${entry.id}" type="file" accept="image/*" capture="environment" ${(entry.photos.length || isDirectCameraMode()) ? "disabled" : ""}>
        <div class="upload-zone-content">${renderAccessoryPreview(entry)}</div>
      </label>
      <input class="utility-file-input" id="library-${entry.id}" type="file" accept="image/*" ${entry.photos.length ? "disabled" : ""}>

      <div class="choice-grid service-grid">${renderServiceButtons(entry)}</div>
      <p class="accessory-subcopy">${formatAccessorySelection(entry)}</p>
    </article>
  `).join("");

  refs.accessoryList.querySelectorAll("[data-remove-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = state.accessoryEntries.findIndex((entry) => entry.id === button.dataset.removeEntry);
      if (index === -1) {
        return;
      }
      state.accessoryEntries[index].photos.forEach((asset) => revokeDraftAsset(asset));
      state.accessoryEntries.splice(index, 1);
      renderAccessoryList();
    });
  });

  refs.accessoryList.querySelectorAll("[data-entry-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const [entryId, itemId] = button.dataset.entryItem.split(":");
      const entry = state.accessoryEntries.find((record) => record.id === entryId);
      if (!entry) {
        return;
      }
      if (entry.itemIds.includes(itemId)) {
        entry.itemIds = entry.itemIds.filter((value) => value !== itemId);
      } else {
        const selected = new Set(entry.itemIds);
        selected.add(itemId);
        entry.itemIds = state.serviceItems
          .map((item) => item.id)
          .filter((id) => selected.has(id));
      }
      renderAccessoryList();
    });
  });

  refs.accessoryList.querySelectorAll("[data-remove-accessory-photo]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const [entryId, localId] = button.dataset.removeAccessoryPhoto.split(":");
      const entry = state.accessoryEntries.find((record) => record.id === entryId);
      if (!entry) {
        return;
      }
      const index = entry.photos.findIndex((photo) => photo.localId === localId);
      if (index === -1) {
        return;
      }
      revokeDraftAsset(entry.photos[index]);
      entry.photos.splice(index, 1);
      renderAccessoryList();
    });
  });

  refs.accessoryList.querySelectorAll("[data-camera-entry]").forEach((zone) => {
    zone.addEventListener("click", async (event) => {
      if (!isDirectCameraMode() || event.target.closest("button")) {
        return;
      }
      const entry = state.accessoryEntries.find((record) => record.id === zone.dataset.cameraEntry);
      if (!entry || entry.photos.length > 0) {
        return;
      }
      event.preventDefault();
      await openCameraOverlay({ kind: "accessory", entryId: entry.id });
    });
  });

  refs.accessoryList.querySelectorAll("[data-open-entry-camera]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await openCameraOverlay({ kind: "accessory", entryId: button.dataset.openEntryCamera });
    });
  });

  refs.accessoryList.querySelectorAll("[data-open-entry-library]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      refs.accessoryList.querySelector(`#library-${button.dataset.openEntryLibrary}`)?.click();
    });
  });

  refs.accessoryList.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener("change", async () => {
      const entryId = input.id.replace("upload-", "").replace("library-", "");
      const entry = state.accessoryEntries.find((record) => record.id === entryId);
      if (!entry || !input.files?.length) {
        return;
      }

      try {
        await applyAccessoryFile(entry, input.files[0]);
      } catch (error) {
        setStatus(describeSupabaseError(error), "danger");
      } finally {
        input.value = "";
      }
    });
  });

  renderCheckInVehicleList();
}

async function applyAccessoryFile(entry, file) {
  return applyAccessoryFileWithOptions(entry, file, {});
}

async function applyAccessoryFileWithOptions(entry, file, options = {}) {
  if (!file) {
    return;
  }

  if (entry.photos.length > 0) {
    setStatus("每個項目只可上傳一張相片。要再加入相片，請按「加入更多項目」。", "danger");
    flashAddAccessoryButton();
    return;
  }

  setStatus("處理項目相片中...", "");
  entry.photos = [await fileToDraftAsset(file, {
    targetSize: options.targetSize || undefined,
  })];
  renderAccessoryList();
  setStatus("已加入項目相片。", "success");
}

async function applyOrderSheetUpdateFile(file) {
  return applyOrderSheetUpdateFileWithOptions(file, {});
}

async function applyOrderSheetUpdateFileWithOptions(file, options = {}) {
  if (!file) {
    return;
  }

  setStatus("處理 Order Sheet 更新相片中...", "");
  clearPendingOrderSheetPhoto();
  state.pendingOrderSheetPhoto = await fileToDraftAsset(file, {
    targetSize: options.targetSize || undefined,
  });
  state.pendingOrderSheetCapturedAt = new Date().toISOString();
  renderOrderSheetPanel();
  setStatus("已加入 Order Sheet 更新草稿，按「完成」後會上傳。", "success");
}

async function requestCameraStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 4096 },
        height: { ideal: 4096 },
      },
      audio: false,
    });
  } catch (_error) {
    return navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
  }
}

async function stopCameraStream() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
  }
  refs.cameraVideo.srcObject = null;
}

function supportsImageCapture() {
  return typeof window.ImageCapture === "function";
}

function pickNativeCapturedFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);

    input.addEventListener("change", () => {
      const file = input.files?.[0] || null;
      input.remove();
      resolve(file);
    }, { once: true });

    input.click();
  });
}

async function captureUsingNativeCamera(target) {
  const file = await pickNativeCapturedFile();
  if (!file) {
    return;
  }

  if (target?.kind === "orderSheet") {
    await applyOrderSheetUpdateFileWithOptions(file, { targetSize: CAMERA_OUTPUT_SIZE });
    return;
  }

  const entry = state.accessoryEntries.find((record) => record.id === target?.entryId);
  if (!entry) {
    setStatus("找不到目前項目，請重新拍照。", "danger");
    return;
  }
  await applyAccessoryFileWithOptions(entry, file, { targetSize: CAMERA_OUTPUT_SIZE });
}

async function captureHighResBlobFromTrack() {
  const track = state.cameraStream?.getVideoTracks?.()[0];
  if (!track || !supportsImageCapture()) {
    return null;
  }

  try {
    const imageCapture = new window.ImageCapture(track);
    let settings = undefined;
    if (typeof imageCapture.getPhotoCapabilities === "function") {
      const capabilities = await imageCapture.getPhotoCapabilities().catch(() => null);
      if (capabilities?.imageWidth?.max && capabilities?.imageHeight?.max) {
        settings = {
          imageWidth: capabilities.imageWidth.max,
          imageHeight: capabilities.imageHeight.max,
        };
      }
    }
    return await imageCapture.takePhoto(settings);
  } catch (_error) {
    return null;
  }
}

async function closeCameraOverlay() {
  refs.cameraOverlay.hidden = true;
  document.body.classList.remove("camera-open");
  state.cameraTarget = null;
  await stopCameraStream();
}

async function openCameraOverlay(target) {
  if (!isDirectCameraMode()) {
    return;
  }

  if (!supportsImageCapture()) {
    await captureUsingNativeCamera(target);
    return;
  }

  refs.cameraTitle.textContent = target?.kind === "orderSheet"
    ? "拍最新 Order Sheet 工作單"
    : "拍安裝 / 維修 / 保養相片";
  state.cameraTarget = target;
  refs.cameraOverlay.hidden = false;
  document.body.classList.add("camera-open");
  refs.cameraVideo.hidden = false;
  refs.cameraCanvas.hidden = true;

  try {
    state.cameraStream = await requestCameraStream();
    refs.cameraVideo.srcObject = state.cameraStream;
    await refs.cameraVideo.play();
  } catch (error) {
    await closeCameraOverlay();
    setStatus(describeSupabaseError(error), "danger");
  }
}

function buildCapturedFile(blob) {
  const stamp = Date.now();
  const target = state.cameraTarget;
  const prefix = target?.kind === "orderSheet" ? "order-sheet-update" : "service";
  if (typeof File === "function") {
    return new File([blob], `${prefix}-${stamp}.jpg`, {
      type: "image/jpeg",
      lastModified: stamp,
    });
  }
  blob.name = `${prefix}-${stamp}.jpg`;
  return blob;
}

async function handleCameraCapture() {
  const target = state.cameraTarget;
  if (!target) {
    return;
  }

  refs.shutterCameraBtn.disabled = true;
  try {
    const blob = await captureHighResBlobFromTrack();
    if (!blob) {
      await closeCameraOverlay();
      await captureUsingNativeCamera(target);
      return;
    }
    const file = buildCapturedFile(blob);
    await closeCameraOverlay();
    if (target.kind === "orderSheet") {
      await applyOrderSheetUpdateFileWithOptions(file, { targetSize: CAMERA_OUTPUT_SIZE });
      return;
    }
    const entry = state.accessoryEntries.find((record) => record.id === target.entryId);
    if (!entry) {
      setStatus("找不到目前項目，請重新拍照。", "danger");
      return;
    }
    await applyAccessoryFileWithOptions(entry, file, { targetSize: CAMERA_OUTPUT_SIZE });
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.shutterCameraBtn.disabled = false;
  }
}

function validateBeforeSave() {
  if (!state.selectedCaptureSetId) {
    return "請先選擇已 Check-in 車輛。";
  }
  const hasOrderSheetUpdate = Boolean(state.pendingOrderSheetPhoto);
  const activeEntries = state.accessoryEntries.filter((entry) => entry.itemIds.length > 0 || entry.photos.length > 0);
  if (!activeEntries.length && !hasOrderSheetUpdate) {
    return "請至少新增一個安裝維修保養項目，或更新 Order Sheet。";
  }
  const invalidEntry = activeEntries.find((entry) => !entry.itemIds.length || !entry.photos.length);
  if (invalidEntry) {
    return "每個項目都需要至少選 1 項分類並上傳 1 張相片。";
  }
  return "";
}

function collectPayload() {
  return state.accessoryEntries
    .filter((entry) => entry.itemIds.length > 0 || entry.photos.length > 0)
    .map((entry) => ({
    itemIds: [...entry.itemIds],
    notes: "",
    photos: entry.photos,
    }));
}

async function handleCreateServiceItem() {
  const nextName = normalizeText(refs.customServiceInput.value);
  if (!nextName) {
    setStatus("請先輸入未有的項目名稱。", "danger");
    refs.customServiceInput.focus();
    return;
  }

  refs.addServiceItemBtn.disabled = true;
  try {
    const created = await createServiceItem(nextName);
    state.serviceItems = mergeLookupItem(state.serviceItems, created);
    refs.customServiceInput.value = "";
    const entry = state.accessoryEntries[state.accessoryEntries.length - 1];
    if (entry && !entry.itemIds.includes(created.id)) {
      entry.itemIds = [...entry.itemIds, created.id];
    }
    renderAccessoryList();
    setStatus(`已加入新項目「${created.name}」，之後所有用戶都可直接選用。`, "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.addServiceItemBtn.disabled = false;
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const validationMessage = validateBeforeSave();
  if (validationMessage) {
    setStatus(validationMessage, "danger");
    return;
  }

  refs.saveSetBtn.disabled = true;
  setStatus("正在上傳安裝維修保養資料...", "");

  try {
    const hasOrderSheetUpdate = Boolean(state.pendingOrderSheetPhoto);
    const captureSet = await appendServiceEntriesToCaptureSet(
      state.selectedCaptureSetId,
      collectPayload(),
      {
        orderSheetPhotos: hasOrderSheetUpdate ? [state.pendingOrderSheetPhoto] : [],
      }
    );
    resetAccessoryEntries();
    state.selectedCaptureSetId = "";
    await loadCheckInSets({ autoSelectFirst: false });
    setStatus(
      hasOrderSheetUpdate
        ? `已為案件 ${captureSet.reference} 新增資料並更新最新 Order Sheet。`
        : `已為案件 ${captureSet.reference} 新增安裝維修保養資料。`,
      "success"
    );
    document.querySelector(".capture-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.saveSetBtn.disabled = false;
  }
}

function bindEvents() {
  refs.updateOrderSheetBtn.addEventListener("click", async () => {
    if (!state.selectedCaptureSetId) {
      setStatus("請先選擇已 Check-in 車輛。", "danger");
      return;
    }
    await openCameraOverlay({ kind: "orderSheet" });
  });

  refs.clearOrderSheetDraftBtn.addEventListener("click", () => {
    clearPendingOrderSheetPhoto();
    renderOrderSheetPanel();
    setStatus("已取消待更新的 Order Sheet 相片。", "");
  });

  refs.addAccessoryBtn.addEventListener("click", () => {
    state.accessoryEntries.push(createAccessoryEntry());
    renderAccessoryList();
    setStatus("已新增一個服務項目。", "");
    window.requestAnimationFrame(() => {
      refs.accessoryList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
  refs.addServiceItemBtn.addEventListener("click", handleCreateServiceItem);
  refs.customServiceInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    await handleCreateServiceItem();
  });
  refs.captureForm.addEventListener("submit", handleSubmit);
  refs.closeCameraBtn.addEventListener("click", closeCameraOverlay);
  refs.cancelCameraBtn.addEventListener("click", closeCameraOverlay);
  refs.shutterCameraBtn.addEventListener("click", handleCameraCapture);
  refs.cameraOverlay.addEventListener("click", async (event) => {
    if (event.target === refs.cameraOverlay) {
      await closeCameraOverlay();
    }
  });
  refs.closeOrderSheetLightboxBtn.addEventListener("click", closeOrderSheetLightbox);
  refs.orderSheetFullSizeBtn.addEventListener("click", () => {
    const frame = refs.orderSheetLightboxImage.closest(".order-sheet-lightbox-frame");
    const isFullSize = frame.classList.toggle("is-full-size");
    refs.orderSheetFullSizeBtn.textContent = isFullSize ? "縮小適應" : "原始大小";
  });
  refs.orderSheetLightbox.addEventListener("click", (event) => {
    if (event.target === refs.orderSheetLightbox) {
      closeOrderSheetLightbox();
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !refs.orderSheetLightbox.hidden) {
      closeOrderSheetLightbox();
    }
  });

  window.addEventListener("beforeunload", () => {
    stopCameraStream();
    clearAccessoryAssets();
    clearPendingOrderSheetPhoto();
  });
}

async function init() {
  const user = await requireAuthorizedPage(["staff", "admin", "superadmin", "supreadmin"], "../index.html");
  syncCurrentUser(user);
  state.accessoryEntries = [createAccessoryEntry()];
  renderAccessoryList();
  setStatus("正在載入已 Check-in 車輛與服務項目...", "");

  try {
    const [serviceItems] = await Promise.all([
      fetchServiceItems(),
      loadCheckInSets(),
    ]);
    state.serviceItems = serviceItems;
    renderAccessoryList();
    setStatus(
      state.checkInSets.length
        ? "已連接 Supabase，可選擇車輛後開始輸入安裝維修保養資料。"
        : "已連接 Supabase，但暫時未有已 Check-in 車輛。",
      state.checkInSets.length ? "success" : ""
    );
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  }

  bindEvents();
}

init();
