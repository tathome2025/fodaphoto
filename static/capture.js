import { requireAuthenticatedPage } from "./supabase-browser.js";
import {
  createCaptureSet,
  describeSupabaseError,
  fetchBrands,
  fetchServiceItems,
  fileToDraftAsset,
  revokeDraftAsset,
  todayLocal,
} from "./workbench.js";

const refs = {
  captureForm: document.querySelector("#captureForm"),
  vehicleInput: document.querySelector("#vehicleInput"),
  vehicleLibraryInput: document.querySelector("#vehicleLibraryInput"),
  vehicleZone: document.querySelector("#vehicleZone"),
  vehiclePreview: document.querySelector("#vehiclePreview"),
  brandGrid: document.querySelector("#brandGrid"),
  vehicleModelSummary: document.querySelector("#vehicleModelSummary"),
  accessoryList: document.querySelector("#accessoryList"),
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
  modelOverlay: document.querySelector("#modelOverlay"),
  modelOverlayBrand: document.querySelector("#modelOverlayBrand"),
  modelForm: document.querySelector("#modelForm"),
  vehicleModelInput: document.querySelector("#vehicleModelInput"),
  recentModelList: document.querySelector("#recentModelList"),
  closeModelBtn: document.querySelector("#closeModelBtn"),
  cancelModelBtn: document.querySelector("#cancelModelBtn"),
};

const state = {
  brands: [],
  serviceItems: [],
  brandId: "",
  vehicleModel: "",
  vehiclePhotos: [],
  accessoryEntries: [],
  cameraTarget: null,
  cameraStream: null,
  pendingBrandId: "",
};

const RECENT_MODELS_KEY = "garage-photo-workbench.recent-models";

function createAccessoryEntry() {
  return {
    id: `entry-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    itemId: "",
    notes: "",
    photos: [],
  };
}

function setStatus(message, type) {
  refs.captureStatus.textContent = message;
  refs.captureStatus.className = "status-text";
  if (type) {
    refs.captureStatus.classList.add(`is-${type}`);
  }
}

function isVehicleReady() {
  return state.vehiclePhotos.length > 0;
}

function isBrandReady() {
  return Boolean(state.brandId && state.vehicleModel);
}

function isAccessoryReady() {
  return state.accessoryEntries.length > 0 && state.accessoryEntries.every((entry) => entry.itemId && entry.photos.length > 0);
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

function createAutoReference() {
  const dateStamp = todayLocal().replace(/-/g, "");
  const timeStamp = `${Date.now()}`.slice(-6);
  return `AUTO-${dateStamp}-${timeStamp}`;
}

function clearAssets(list) {
  list.forEach((asset) => revokeDraftAsset(asset));
}

function normalizeModelName(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function getBrandById(brandId) {
  return state.brands.find((brand) => brand.id === brandId) || null;
}

function loadRecentModels() {
  try {
    const raw = window.localStorage.getItem(RECENT_MODELS_KEY);
    const list = JSON.parse(raw || "[]");
    if (!Array.isArray(list)) {
      return [];
    }
    return list.filter((item) => item && typeof item.model === "string").slice(0, 20);
  } catch (_error) {
    return [];
  }
}

function saveRecentModels(list) {
  try {
    window.localStorage.setItem(RECENT_MODELS_KEY, JSON.stringify(list.slice(0, 20)));
  } catch (_error) {
    // Ignore storage errors and continue without recent history.
  }
}

function pushRecentModel(brandId, model) {
  const normalized = normalizeModelName(model);
  if (!brandId || !normalized) {
    return;
  }

  const brand = getBrandById(brandId);
  const next = [
    {
      brandId,
      brandName: brand?.name || brandId,
      model: normalized,
    },
    ...loadRecentModels().filter((item) => (
      `${item.brandId}::${item.model}`.toLowerCase() !== `${brandId}::${normalized}`.toLowerCase()
    )),
  ];
  saveRecentModels(next);
}

function getRecentModelsForBrand(brandId) {
  const sameBrand = [];
  const otherBrands = [];

  loadRecentModels().forEach((item) => {
    if (item.brandId === brandId) {
      sameBrand.push(item);
      return;
    }
    otherBrands.push(item);
  });

  return [...sameBrand, ...otherBrands].slice(0, 20);
}

function isDirectCameraMode() {
  return Boolean(
    window.matchMedia?.("(pointer: coarse)").matches
    && navigator.mediaDevices?.getUserMedia
  );
}

function getVehiclePromptText() {
  return isDirectCameraMode()
    ? "按一下拍照"
    : "按一下拍照或上傳車輛照";
}

function getAccessoryPromptText() {
  return isDirectCameraMode()
    ? "拍配件 / 維修相片"
    : "拍配件 / 維修相片或上傳";
}

function renderUploadActions(kind, entryId = "") {
  if (!isDirectCameraMode()) {
    return "";
  }

  if (kind === "vehicle") {
    return `
      <div class="upload-action-row">
        <button class="primary-button upload-action-btn" type="button" data-open-vehicle-camera>拍照</button>
        <button class="secondary-button upload-action-btn" type="button" data-open-vehicle-library>上傳相片</button>
      </div>
    `;
  }

  return `
    <div class="upload-action-row">
      <button class="primary-button upload-action-btn" type="button" data-open-entry-camera="${entryId}">拍照</button>
      <button class="secondary-button upload-action-btn" type="button" data-open-entry-library="${entryId}">上傳相片</button>
    </div>
  `;
}

function getPreviewRatio(photo) {
  if (!photo?.width || !photo?.height) {
    return "4 / 3";
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

function renderVehiclePreview() {
  refs.vehicleZone.classList.toggle("has-preview", state.vehiclePhotos.length > 0);
  refs.vehicleInput.disabled = state.vehiclePhotos.length > 0 || isDirectCameraMode();
  if (!state.vehiclePhotos.length) {
    refs.vehiclePreview.innerHTML = `
      <div class="upload-prompt">
        <strong>${getVehiclePromptText()}</strong>
        <small>只可上傳一張車輛照。</small>
        ${renderUploadActions("vehicle")}
      </div>
    `;

    refs.vehiclePreview.querySelector("[data-open-vehicle-camera]")?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await openCameraOverlay({ kind: "vehicle" });
    });

    refs.vehiclePreview.querySelector("[data-open-vehicle-library]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      refs.vehicleLibraryInput.click();
    });
    return;
  }

  refs.vehiclePreview.innerHTML = state.vehiclePhotos.map((photo, index) => renderUploadCover(
    photo,
    `車輛照 ${index + 1}`,
    "data-remove-vehicle",
    photo.localId
  )).join("");

  refs.vehiclePreview.querySelectorAll("[data-remove-vehicle]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const index = state.vehiclePhotos.findIndex((photo) => photo.localId === button.dataset.removeVehicle);
      if (index === -1) {
        return;
      }
      revokeDraftAsset(state.vehiclePhotos[index]);
      state.vehiclePhotos.splice(index, 1);
      renderVehiclePreview();
    });
  });
}

function renderVehicleModelSummary() {
  const brand = getBrandById(state.brandId);
  const hasModel = Boolean(state.vehicleModel);
  refs.vehicleModelSummary.hidden = !hasModel;
  if (!hasModel) {
    refs.vehicleModelSummary.textContent = "";
    return;
  }
  refs.vehicleModelSummary.textContent = `已選車型：${brand?.name || state.brandId} · ${state.vehicleModel}`;
  refs.vehicleModelSummary.className = "status-text is-success";
}

function renderRecentModelList(brandId) {
  const items = getRecentModelsForBrand(brandId);
  if (!items.length) {
    refs.recentModelList.innerHTML = `
      <div class="empty-state">
        <strong>暫時沒有最近型號</strong>
        <p class="muted-copy">輸入一次後，之後會顯示在這裡。</p>
      </div>
    `;
    return;
  }

  refs.recentModelList.innerHTML = items.map((item) => `
    <button class="choice-button" type="button" data-recent-model="${item.model}">
      <strong>${item.model}</strong>
      <span>${item.brandName || item.brandId || "-"}</span>
    </button>
  `).join("");

  refs.recentModelList.querySelectorAll("[data-recent-model]").forEach((button) => {
    button.addEventListener("click", () => {
      refs.vehicleModelInput.value = button.dataset.recentModel;
      refs.vehicleModelInput.focus();
      refs.vehicleModelInput.select();
    });
  });
}

function openModelOverlay(brandId) {
  state.pendingBrandId = brandId;
  const brand = getBrandById(brandId);
  refs.modelOverlayBrand.textContent = brand?.name || brandId;
  refs.vehicleModelInput.value = state.brandId === brandId ? state.vehicleModel : "";
  renderRecentModelList(brandId);
  refs.modelOverlay.hidden = false;
  document.body.classList.add("model-open");
  window.setTimeout(() => {
    refs.vehicleModelInput.focus();
    refs.vehicleModelInput.select();
  }, 20);
}

function closeModelOverlay() {
  refs.modelOverlay.hidden = true;
  document.body.classList.remove("model-open");
  state.pendingBrandId = "";
  refs.vehicleModelInput.value = "";
}

function handleModelSubmit(event) {
  event.preventDefault();
  const model = normalizeModelName(refs.vehicleModelInput.value);
  if (!state.pendingBrandId) {
    closeModelOverlay();
    return;
  }
  if (!model) {
    setStatus("請先輸入車輛型號。", "danger");
    refs.vehicleModelInput.focus();
    return;
  }

  state.brandId = state.pendingBrandId;
  state.vehicleModel = model;
  pushRecentModel(state.brandId, state.vehicleModel);
  renderBrands();
  setStatus(`已選擇 ${getBrandById(state.brandId)?.name || state.brandId} · ${state.vehicleModel}`, "success");
  closeModelOverlay();
}

function renderBrands() {
  refs.brandGrid.innerHTML = state.brands.map((brand) => `
    <button class="choice-button ${state.brandId === brand.id ? "is-selected" : ""}" type="button" data-brand-id="${brand.id}">
      <strong>${brand.name}</strong>
      <span>${state.brandId === brand.id && state.vehicleModel ? state.vehicleModel : "此案件車輛品牌"}</span>
    </button>
  `).join("");

  refs.brandGrid.querySelectorAll("[data-brand-id]").forEach((button) => {
    button.addEventListener("click", () => {
      openModelOverlay(button.dataset.brandId);
    });
  });

  renderVehicleModelSummary();
}

function renderAccessoryPreview(entry) {
  if (!entry.photos.length) {
    return `
      <div class="upload-prompt">
        <strong>${getAccessoryPromptText()}</strong>
        <small>只可上傳一張相片。</small>
        ${renderUploadActions("accessory", entry.id)}
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

function renderServiceButtons(entry) {
  return state.serviceItems.map((item) => `
    <button class="choice-button ${entry.itemId === item.id ? "is-selected" : ""}" type="button" data-entry-item="${entry.id}:${item.id}">
      <strong>${item.name}</strong>
      <span>把這組相片歸入此項目</span>
    </button>
  `).join("");
}

function renderAccessoryList() {
  if (!state.accessoryEntries.length) {
    refs.accessoryList.innerHTML = `
      <div class="empty-state">
        <strong>尚未加入配件或維修項目</strong>
        <p class="muted-copy">每加入一個項目，就可以上傳該項目的相片並選分類。</p>
      </div>
    `;
    return;
  }

  refs.accessoryList.innerHTML = state.accessoryEntries.map((entry, index) => `
    <article class="accessory-card">
      <div class="accessory-head">
        <h3>配件 / 維修 ${String(index + 1).padStart(2, "0")}</h3>
        <button class="tiny-button" type="button" data-remove-entry="${entry.id}">移除</button>
      </div>

      <label class="upload-zone ${entry.photos.length ? "has-preview" : ""}" data-camera-entry="${entry.id}" for="upload-${entry.id}">
        <input id="upload-${entry.id}" type="file" accept="image/*" capture="environment" ${(entry.photos.length || isDirectCameraMode()) ? "disabled" : ""}>
        <div class="upload-zone-content">${renderAccessoryPreview(entry)}</div>
      </label>
      <input class="utility-file-input" id="library-${entry.id}" type="file" accept="image/*" ${entry.photos.length ? "disabled" : ""}>

      <div class="choice-grid service-grid">${renderServiceButtons(entry)}</div>

      <div class="field-wide">
        <label for="notes-${entry.id}">項目備註</label>
        <textarea id="notes-${entry.id}" placeholder="例如：前避震漏油，已更換彈簧及塔頂膠。">${entry.notes || ""}</textarea>
      </div>
    </article>
  `).join("");

  refs.accessoryList.querySelectorAll("[data-remove-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = state.accessoryEntries.findIndex((entry) => entry.id === button.dataset.removeEntry);
      if (index === -1) {
        return;
      }
      clearAssets(state.accessoryEntries[index].photos);
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
      entry.itemId = itemId;
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
      if (!isDirectCameraMode()) {
        return;
      }
      if (event.target.closest("button")) {
        return;
      }
      const entryId = zone.dataset.cameraEntry;
      const entry = state.accessoryEntries.find((record) => record.id === entryId);
      if (!entry || entry.photos.length > 0) {
        return;
      }
      event.preventDefault();
      await openCameraOverlay({ kind: "accessory", entryId });
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
      const entryId = button.dataset.openEntryLibrary;
      const input = refs.accessoryList.querySelector(`#library-${entryId}`);
      input?.click();
    });
  });

  refs.accessoryList.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener("change", async () => {
      const entryId = input.id.replace("upload-", "").replace("library-", "");
      const entry = state.accessoryEntries.find((record) => record.id === entryId);
      if (!entry || !input.files?.length) {
        return;
      }

      if (entry.photos.length > 0) {
        setStatus("每個配件項目只可上傳一張。要再加入相片，請按「加入更多配件」。", "danger");
        flashAddAccessoryButton();
        input.value = "";
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

  refs.accessoryList.querySelectorAll("textarea").forEach((textarea) => {
    textarea.addEventListener("input", () => {
      const entryId = textarea.id.replace("notes-", "");
      const entry = state.accessoryEntries.find((record) => record.id === entryId);
      if (entry) {
        entry.notes = textarea.value;
      }
    });
  });

}

async function applyAccessoryFile(entry, file) {
  if (!file) {
    return;
  }

  if (entry.photos.length > 0) {
    setStatus("每個配件項目只可上傳一張。要再加入相片，請按「加入更多配件」。", "danger");
    flashAddAccessoryButton();
    return;
  }

  setStatus("處理配件相片中...", "");
  const prepared = await fileToDraftAsset(file);
  entry.photos = [prepared];
  renderAccessoryList();
  setStatus("已加入配件相片。", "success");
}

async function handleVehicleUpload(files) {
  if (!files.length) {
    return;
  }

  await applyVehicleFile(files[0]);
}

async function applyVehicleFile(file) {
  if (!file) {
    return;
  }

  if (state.vehiclePhotos.length > 0) {
    setStatus("車輛照只可上傳一張，如需更換請先移除。", "danger");
    refs.vehicleInput.value = "";
    return;
  }

  try {
    setStatus("處理車輛相片中...", "");
    const prepared = await fileToDraftAsset(file);
    state.vehiclePhotos = [prepared];
    renderVehiclePreview();
    setStatus("已加入車輛照。", "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.vehicleInput.value = "";
  }
}

async function requestCameraStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
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

  refs.cameraTitle.textContent = target.kind === "vehicle" ? "拍車輛照" : "拍配件 / 維修相片";
  state.cameraTarget = target;
  refs.cameraOverlay.hidden = false;
  document.body.classList.add("camera-open");

  try {
    state.cameraStream = await requestCameraStream();
    refs.cameraVideo.srcObject = state.cameraStream;
    await refs.cameraVideo.play();
  } catch (error) {
    await closeCameraOverlay();
    setStatus(describeSupabaseError(error), "danger");
  }
}

function buildCapturedFile(blob, target) {
  const stamp = Date.now();
  const prefix = target.kind === "vehicle" ? "vehicle" : "accessory";
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

  const width = refs.cameraVideo.videoWidth;
  const height = refs.cameraVideo.videoHeight;
  if (!width || !height) {
    setStatus("未能取得相機影像，請再試一次。", "danger");
    return;
  }

  refs.shutterCameraBtn.disabled = true;
  try {
    refs.cameraCanvas.width = width;
    refs.cameraCanvas.height = height;
    const context = refs.cameraCanvas.getContext("2d");
    if (!context) {
      throw new Error("無法建立拍照畫布。");
    }
    context.drawImage(refs.cameraVideo, 0, 0, width, height);
    const blob = await new Promise((resolve, reject) => {
      refs.cameraCanvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("拍照失敗。"))),
        "image/jpeg",
        0.92
      );
    });
    const file = buildCapturedFile(blob, target);
    await closeCameraOverlay();
    if (target.kind === "vehicle") {
      await applyVehicleFile(file);
      return;
    }
    const entry = state.accessoryEntries.find((record) => record.id === target.entryId);
    if (!entry) {
      setStatus("找不到目前的配件項目，請重新拍照。", "danger");
      return;
    }
    await applyAccessoryFile(entry, file);
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.shutterCameraBtn.disabled = false;
  }
}

function validateBeforeSave() {
  if (!isVehicleReady()) {
    return "請先加入至少 1 張車輛照。";
  }
  if (!isBrandReady()) {
    return "請先選擇車輛品牌並輸入車輛型號。";
  }
  if (!state.accessoryEntries.length) {
    return "請至少加入 1 個配件或維修項目。";
  }
  const invalidEntry = state.accessoryEntries.find((entry) => !entry.itemId || !entry.photos.length);
  if (invalidEntry) {
    return "每個配件項目都需要分類並至少上傳 1 張相片。";
  }
  return "";
}

function resetForm() {
  clearAssets(state.vehiclePhotos);
  state.accessoryEntries.forEach((entry) => clearAssets(entry.photos));

  refs.vehicleInput.value = "";
  refs.vehicleLibraryInput.value = "";
  state.brandId = "";
  state.vehicleModel = "";
  state.vehiclePhotos = [];
  state.accessoryEntries = [createAccessoryEntry()];
  renderVehiclePreview();
  renderBrands();
  renderAccessoryList();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function collectPayload() {
  return {
    reference: createAutoReference(),
    captureDate: todayLocal(),
    notes: "",
    brandId: state.brandId,
    vehicleModel: state.vehicleModel,
    vehiclePhotos: state.vehiclePhotos,
    accessoryEntries: state.accessoryEntries.map((entry) => ({
      itemId: entry.itemId,
      notes: entry.notes || "",
      photos: entry.photos,
    })),
  };
}

async function handleSubmit(event) {
  event.preventDefault();
  const validationMessage = validateBeforeSave();
  if (validationMessage) {
    setStatus(validationMessage, "danger");
    return;
  }

  refs.saveSetBtn.disabled = true;
  setStatus("正在上傳至 Supabase...", "");

  try {
    const captureSet = await createCaptureSet(collectPayload());
    setStatus(`案件 ${captureSet.reference} 已儲存。`, "success");
    resetForm();
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.saveSetBtn.disabled = false;
  }
}

function bindEvents() {
  refs.vehicleInput.addEventListener("change", async () => {
    if (refs.vehicleInput.files?.length) {
      await handleVehicleUpload(refs.vehicleInput.files);
    }
  });

  refs.vehicleLibraryInput.addEventListener("change", async () => {
    if (refs.vehicleLibraryInput.files?.length) {
      await handleVehicleUpload(refs.vehicleLibraryInput.files);
    }
    refs.vehicleLibraryInput.value = "";
  });

  refs.vehicleZone.addEventListener("click", async (event) => {
    if (!isDirectCameraMode()) {
      return;
    }
    if (event.target.closest("button") || state.vehiclePhotos.length > 0) {
      return;
    }
    event.preventDefault();
    await openCameraOverlay({ kind: "vehicle" });
  });

  refs.addAccessoryBtn.addEventListener("click", () => {
    state.accessoryEntries.push(createAccessoryEntry());
    renderAccessoryList();
    setStatus("已新增一個配件項目。", "");
    window.requestAnimationFrame(() => {
      refs.accessoryList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
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
  refs.modelForm.addEventListener("submit", handleModelSubmit);
  refs.closeModelBtn.addEventListener("click", closeModelOverlay);
  refs.cancelModelBtn.addEventListener("click", closeModelOverlay);
  refs.modelOverlay.addEventListener("click", (event) => {
    if (event.target === refs.modelOverlay) {
      closeModelOverlay();
    }
  });

  window.addEventListener("beforeunload", () => {
    stopCameraStream();
    clearAssets(state.vehiclePhotos);
    state.accessoryEntries.forEach((entry) => clearAssets(entry.photos));
  });
}

async function init() {
  await requireAuthenticatedPage("../index.html");
  setStatus("正在載入品牌與配件分類...", "");
  state.accessoryEntries = [createAccessoryEntry()];
  renderVehiclePreview();
  renderAccessoryList();

  try {
    const [brands, serviceItems] = await Promise.all([fetchBrands(), fetchServiceItems()]);
    state.brands = brands;
    state.serviceItems = serviceItems;
    renderBrands();
    renderAccessoryList();
    setStatus("已連接 Supabase，可以開始拍照分類。", "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  }

  bindEvents();
}

init();
