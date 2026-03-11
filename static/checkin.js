import { requireAuthenticatedPage } from "./supabase-browser.js";
import {
  createBrand,
  createCheckInSet,
  describeSupabaseError,
  fetchBrands,
  fetchRecentVehicleModels,
  fileToDraftAsset,
  rememberVehicleModel,
  revokeDraftAsset,
  todayLocal,
} from "./workbench.js";

const refs = {
  checkInForm: document.querySelector("#checkInForm"),
  vehicleInput: document.querySelector("#vehicleInput"),
  vehicleLibraryInput: document.querySelector("#vehicleLibraryInput"),
  vehicleZone: document.querySelector("#vehicleZone"),
  vehiclePreview: document.querySelector("#vehiclePreview"),
  brandGrid: document.querySelector("#brandGrid"),
  vehicleModelSummary: document.querySelector("#vehicleModelSummary"),
  customBrandInput: document.querySelector("#customBrandInput"),
  addBrandBtn: document.querySelector("#addBrandBtn"),
  saveCheckInBtn: document.querySelector("#saveCheckInBtn"),
  checkInStatus: document.querySelector("#checkInStatus"),
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
  brandId: "",
  vehicleModel: "",
  vehiclePhotos: [],
  cameraStream: null,
  pendingBrandId: "",
  recentModelsByBrand: new Map(),
  loadingRecentBrandId: "",
};

function normalizeText(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function mergeBrand(nextBrand) {
  state.brands = [...state.brands.filter((brand) => brand.id !== nextBrand.id), nextBrand]
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return left.name.localeCompare(right.name, "zh-Hant");
    });
}

function setStatus(message, type) {
  refs.checkInStatus.textContent = message;
  refs.checkInStatus.className = "status-text";
  if (type) {
    refs.checkInStatus.classList.add(`is-${type}`);
  }
}

function createReference() {
  const dateStamp = todayLocal().replace(/-/g, "");
  const timeStamp = `${Date.now()}`.slice(-6);
  return `CHK-${dateStamp}-${timeStamp}`;
}

function getBrandById(brandId) {
  return state.brands.find((brand) => brand.id === brandId) || null;
}

function upsertRecentModelCache(brandId, model, lastUsedAt = new Date().toISOString()) {
  const normalized = normalizeText(model);
  if (!brandId || !normalized) {
    return [];
  }

  const next = [
    { brandId, model: normalized, lastUsedAt },
    ...getRecentModelsForBrand(brandId).filter((item) => item.model.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, 20);

  state.recentModelsByBrand.set(brandId, next);
  return next;
}

function getRecentModelsForBrand(brandId) {
  return state.recentModelsByBrand.get(brandId) || [];
}

async function loadRecentModelsForBrand(brandId, options = {}) {
  if (!brandId) {
    return [];
  }

  if (!options.force && state.recentModelsByBrand.has(brandId)) {
    return getRecentModelsForBrand(brandId);
  }

  state.loadingRecentBrandId = brandId;
  renderRecentModelList(brandId);
  try {
    const items = await fetchRecentVehicleModels(brandId, 20);
    state.recentModelsByBrand.set(brandId, items);
    return items;
  } finally {
    if (state.loadingRecentBrandId === brandId) {
      state.loadingRecentBrandId = "";
    }
    if (!refs.modelOverlay.hidden && state.pendingBrandId === brandId) {
      renderRecentModelList(brandId);
    }
  }
}

function isDirectCameraMode() {
  return Boolean(
    window.matchMedia?.("(pointer: coarse)").matches
    && navigator.mediaDevices?.getUserMedia
  );
}

function getVehiclePromptText() {
  return isDirectCameraMode()
    ? "按一下拍車輛照"
    : "按一下拍照或上傳車輛照";
}

function renderUploadActions() {
  if (!isDirectCameraMode()) {
    return "";
  }

  return `
    <div class="upload-action-row">
      <button class="primary-button upload-action-btn" type="button" data-open-vehicle-camera>拍照</button>
      <button class="secondary-button upload-action-btn" type="button" data-open-vehicle-library>上傳相片</button>
    </div>
  `;
}

function getPreviewRatio(photo) {
  if (!photo?.width || !photo?.height) {
    return "4 / 3";
  }
  return `${photo.width} / ${photo.height}`;
}

function renderUploadCover(photo) {
  return `
    <figure class="upload-cover">
      <div class="upload-cover-frame" style="aspect-ratio: ${getPreviewRatio(photo)};">
        <img src="${photo.previewUrl}" alt="車輛照">
      </div>
      <figcaption class="upload-cover-footer">
        <span>${photo.fileName}</span>
        <button class="tiny-button" type="button" data-remove-vehicle="${photo.localId}">移除</button>
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
        ${renderUploadActions()}
      </div>
    `;

    refs.vehiclePreview.querySelector("[data-open-vehicle-camera]")?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await openCameraOverlay();
    });

    refs.vehiclePreview.querySelector("[data-open-vehicle-library]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      refs.vehicleLibraryInput.click();
    });
    return;
  }

  refs.vehiclePreview.innerHTML = state.vehiclePhotos.map((photo) => renderUploadCover(photo)).join("");
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
  refs.vehicleModelSummary.textContent = hasModel
    ? `已選車型：${brand?.name || state.brandId} · ${state.vehicleModel}`
    : "";
  refs.vehicleModelSummary.className = hasModel ? "status-text is-success" : "status-text";
}

function renderRecentModelList(brandId) {
  if (state.loadingRecentBrandId === brandId) {
    refs.recentModelList.innerHTML = `
      <div class="empty-state">
        <strong>正在載入共用型號資料</strong>
        <p class="muted-copy">稍候即可選擇這個品牌最近使用過的車型。</p>
      </div>
    `;
    return;
  }

  const items = getRecentModelsForBrand(brandId);
  if (!items.length) {
    refs.recentModelList.innerHTML = `
      <div class="empty-state">
        <strong>這個品牌暫時沒有共用型號紀錄</strong>
        <p class="muted-copy">輸入一次後，之後所有用戶都可直接選用。</p>
      </div>
    `;
    return;
  }

  refs.recentModelList.innerHTML = items.map((item) => `
    <button class="choice-button" type="button" data-recent-model="${item.model}">
      <strong>${item.model}</strong>
      <span>此品牌最近輸入過</span>
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

async function openModelOverlay(brandId) {
  state.pendingBrandId = brandId;
  const brand = getBrandById(brandId);
  refs.modelOverlayBrand.textContent = brand?.name || brandId;
  refs.vehicleModelInput.value = state.brandId === brandId ? state.vehicleModel : "";
  renderRecentModelList(brandId);
  refs.modelOverlay.hidden = false;
  document.body.classList.add("model-open");

  try {
    await loadRecentModelsForBrand(brandId, { force: true });
  } catch (_error) {
    setStatus(`未能讀取 ${brand?.name || brandId} 的共用型號資料。`, "danger");
  }

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

async function handleModelSubmit(event) {
  event.preventDefault();
  const model = normalizeText(refs.vehicleModelInput.value);
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
  upsertRecentModelCache(state.brandId, state.vehicleModel);
  renderBrands();
  closeModelOverlay();

  try {
    const saved = await rememberVehicleModel(state.brandId, state.vehicleModel);
    if (saved) {
      upsertRecentModelCache(state.brandId, saved.model, saved.lastUsedAt);
    }
    setStatus(`已選擇 ${getBrandById(state.brandId)?.name || state.brandId} · ${state.vehicleModel}`, "success");
  } catch (_error) {
    setStatus(`已選擇 ${getBrandById(state.brandId)?.name || state.brandId} · ${state.vehicleModel}，但未能同步共用型號資料。`, "danger");
  }
}

function renderBrands() {
  refs.brandGrid.innerHTML = state.brands.map((brand) => `
    <button class="choice-button ${state.brandId === brand.id ? "is-selected" : ""}" type="button" data-brand-id="${brand.id}">
      <strong>${brand.name}</strong>
      <span>${state.brandId === brand.id && state.vehicleModel ? state.vehicleModel : "選擇品牌並輸入車型"}</span>
    </button>
  `).join("");

  refs.brandGrid.querySelectorAll("[data-brand-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openModelOverlay(button.dataset.brandId);
    });
  });

  renderVehicleModelSummary();
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
    state.vehiclePhotos = [await fileToDraftAsset(file)];
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
  await stopCameraStream();
}

async function openCameraOverlay() {
  if (!isDirectCameraMode()) {
    return;
  }

  refs.cameraTitle.textContent = "拍車輛照";
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

function buildCapturedFile(blob) {
  const stamp = Date.now();
  if (typeof File === "function") {
    return new File([blob], `vehicle-${stamp}.jpg`, {
      type: "image/jpeg",
      lastModified: stamp,
    });
  }
  blob.name = `vehicle-${stamp}.jpg`;
  return blob;
}

async function handleCameraCapture() {
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
    await closeCameraOverlay();
    await applyVehicleFile(buildCapturedFile(blob));
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.shutterCameraBtn.disabled = false;
  }
}

function validateBeforeSave() {
  if (!state.vehiclePhotos.length) {
    return "請先加入車輛照。";
  }
  if (!state.brandId || !state.vehicleModel) {
    return "請先選擇品牌並輸入車型。";
  }
  return "";
}

function resetForm() {
  state.vehiclePhotos.forEach((asset) => revokeDraftAsset(asset));
  state.vehiclePhotos = [];
  state.brandId = "";
  state.vehicleModel = "";
  refs.vehicleInput.value = "";
  refs.vehicleLibraryInput.value = "";
  refs.customBrandInput.value = "";
  renderVehiclePreview();
  renderBrands();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleCreateBrand() {
  const nextName = normalizeText(refs.customBrandInput.value);
  if (!nextName) {
    setStatus("請先輸入未有的車品牌。", "danger");
    refs.customBrandInput.focus();
    return;
  }

  refs.addBrandBtn.disabled = true;
  try {
    const created = await createBrand(nextName);
    mergeBrand(created);
    refs.customBrandInput.value = "";
    renderBrands();
    await openModelOverlay(created.id);
    setStatus(`已加入品牌「${created.name}」，請繼續輸入車型。`, "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.addBrandBtn.disabled = false;
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const validationMessage = validateBeforeSave();
  if (validationMessage) {
    setStatus(validationMessage, "danger");
    return;
  }

  refs.saveCheckInBtn.disabled = true;
  setStatus("正在建立 Check-in 案件...", "");

  try {
    const created = await createCheckInSet({
      reference: createReference(),
      captureDate: todayLocal(),
      notes: "",
      brandId: state.brandId,
      vehicleModel: state.vehicleModel,
      vehiclePhotos: state.vehiclePhotos,
    });
    resetForm();
    setStatus(`Check-in 完成，案件 ${created.reference} 已建立。`, "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.saveCheckInBtn.disabled = false;
  }
}

function bindEvents() {
  refs.vehicleInput.addEventListener("change", async () => {
    if (refs.vehicleInput.files?.length) {
      await applyVehicleFile(refs.vehicleInput.files[0]);
    }
  });

  refs.vehicleLibraryInput.addEventListener("change", async () => {
    if (refs.vehicleLibraryInput.files?.length) {
      await applyVehicleFile(refs.vehicleLibraryInput.files[0]);
    }
    refs.vehicleLibraryInput.value = "";
  });

  refs.vehicleZone.addEventListener("click", async (event) => {
    if (!isDirectCameraMode() || event.target.closest("button") || state.vehiclePhotos.length > 0) {
      return;
    }
    event.preventDefault();
    await openCameraOverlay();
  });

  refs.addBrandBtn.addEventListener("click", handleCreateBrand);
  refs.customBrandInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    await handleCreateBrand();
  });
  refs.checkInForm.addEventListener("submit", handleSubmit);
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
    state.vehiclePhotos.forEach((asset) => revokeDraftAsset(asset));
  });
}

async function init() {
  await requireAuthenticatedPage("../index.html");
  renderVehiclePreview();
  setStatus("正在載入品牌資料...", "");

  try {
    state.brands = await fetchBrands();
    renderBrands();
    setStatus("已連接 Supabase，可以開始 Check-in。", "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  }

  bindEvents();
}

init();
