import { requireAuthorizedPage } from "./supabase-browser.js";
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
  orderSheetInput: document.querySelector("#orderSheetInput"),
  orderSheetZone: document.querySelector("#orderSheetZone"),
  orderSheetPreview: document.querySelector("#orderSheetPreview"),
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
  currentUserEmail: document.querySelector("#currentUserEmail"),
};

const state = {
  brands: [],
  brandId: "",
  vehicleModel: "",
  vehiclePhotos: [],
  orderSheetPhotos: [],
  cameraStream: null,
  cameraTarget: "vehicle",
  pendingBrandId: "",
  recentModelsByBrand: new Map(),
  loadingRecentBrandId: "",
};

const CAMERA_OUTPUT_SIZE = 2000;

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

function syncCurrentUser(user) {
  if (refs.currentUserEmail) {
    refs.currentUserEmail.textContent = user?.email || user?.phone || user?.id || "-";
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

function getUploadPromptText(target) {
  const labels = {
    vehicle: "車輛照",
    orderSheet: "Order Sheet 工作單",
  };
  if (target === "orderSheet") {
    return `按一下拍${labels[target] || "相片"}`;
  }
  return isDirectCameraMode()
    ? `按一下拍${labels[target] || "相片"}`
    : `按一下拍照或上傳${labels[target] || "相片"}`;
}

function renderUploadActions(target) {
  if (target === "orderSheet") {
    return `
      <div class="upload-action-row">
        <button class="primary-button upload-action-btn" type="button" data-open-camera="${target}">拍照（只限拍照）</button>
      </div>
    `;
  }

  if (!isDirectCameraMode()) {
    return "";
  }

  return `
    <div class="upload-action-row">
      <button class="primary-button upload-action-btn" type="button" data-open-camera="${target}">拍照（開啟相機）</button>
      <button class="secondary-button upload-action-btn" type="button" data-open-library="${target}">上傳相片（從相簿）</button>
    </div>
  `;
}

function getPreviewRatio(photo) {
  if (!photo?.width || !photo?.height) {
    return "1 / 1";
  }
  return `${photo.width} / ${photo.height}`;
}

function renderUploadCover(photo, target) {
  const altText = target === "orderSheet" ? "Order Sheet 工作單" : "車輛照";
  return `
    <figure class="upload-cover">
      <div class="upload-cover-frame" style="aspect-ratio: ${getPreviewRatio(photo)};">
        <img src="${photo.previewUrl}" alt="${altText}">
      </div>
      <figcaption class="upload-cover-footer">
        <span>${photo.fileName}</span>
        <button class="tiny-button" type="button" data-remove-upload="${target}:${photo.localId}">移除</button>
      </figcaption>
    </figure>
  `;
}

function getUploadTargetState(target) {
  return target === "orderSheet" ? state.orderSheetPhotos : state.vehiclePhotos;
}

function getUploadTargetRefs(target) {
  return target === "orderSheet"
    ? {
        zone: refs.orderSheetZone,
        input: refs.orderSheetInput,
        preview: refs.orderSheetPreview,
      }
    : {
        zone: refs.vehicleZone,
        input: refs.vehicleInput,
        libraryInput: refs.vehicleLibraryInput,
        preview: refs.vehiclePreview,
      };
}

function clearUploadTarget(target) {
  if (target === "orderSheet") {
    state.orderSheetPhotos.forEach((asset) => revokeDraftAsset(asset));
    state.orderSheetPhotos = [];
    refs.orderSheetInput.value = "";
    return;
  }

  state.vehiclePhotos.forEach((asset) => revokeDraftAsset(asset));
  state.vehiclePhotos = [];
  refs.vehicleInput.value = "";
  refs.vehicleLibraryInput.value = "";
}

function renderUploadTarget(target) {
  const targetState = getUploadTargetState(target);
  const targetRefs = getUploadTargetRefs(target);
  const labels = {
    vehicle: "車輛照",
    orderSheet: "Order Sheet 工作單",
  };
  targetRefs.zone.classList.toggle("has-preview", targetState.length > 0);
  targetRefs.input.disabled = target === "orderSheet"
    ? true
    : (targetState.length > 0 || isDirectCameraMode());

  if (!targetState.length) {
    targetRefs.preview.innerHTML = `
      <div class="upload-prompt">
        <strong>${getUploadPromptText(target)}</strong>
        <small>${target === "orderSheet" ? "只可拍照，不可上傳。" : `只可上傳一張${labels[target] || "相片"}。`}</small>
        ${renderUploadActions(target)}
      </div>
    `;

    targetRefs.preview.querySelector("[data-open-camera]")?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await openCameraOverlay(target);
    });

    if (target === "vehicle") {
      targetRefs.preview.querySelector("[data-open-library]")?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        targetRefs.libraryInput.click();
      });
    }
    return;
  }

  targetRefs.preview.innerHTML = targetState.map((photo) => renderUploadCover(photo, target)).join("");
  targetRefs.preview.querySelectorAll("[data-remove-upload]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const [slot, localId] = `${button.dataset.removeUpload || ""}`.split(":");
      const photos = getUploadTargetState(slot);
      const index = photos.findIndex((photo) => photo.localId === localId);
      if (index === -1) {
        return;
      }
      revokeDraftAsset(photos[index]);
      photos.splice(index, 1);
      renderUploadTarget(slot);
    });
  });
}

function renderVehiclePreview() {
  renderUploadTarget("vehicle");
}

function renderOrderSheetPreview() {
  renderUploadTarget("orderSheet");
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

async function applyUploadFile(target, file, options = {}) {
  if (!file) {
    return;
  }

  const targetState = getUploadTargetState(target);
  const targetRefs = getUploadTargetRefs(target);
  const labels = {
    vehicle: "車輛照",
    orderSheet: "Order Sheet 工作單",
  };

  if (targetState.length > 0) {
    setStatus(`${labels[target] || "相片"}只可上傳一張，如需更換請先移除。`, "danger");
    targetRefs.input.value = "";
    return;
  }

  try {
    setStatus(`處理${labels[target] || "相片"}中...`, "");
    const draft = await fileToDraftAsset(file, {
      targetSize: options.targetSize || undefined,
    });
    if (target === "orderSheet") {
      state.orderSheetPhotos = [draft];
      renderOrderSheetPreview();
    } else {
      state.vehiclePhotos = [draft];
      renderVehiclePreview();
    }
    setStatus(`已加入${labels[target] || "相片"}。`, "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    targetRefs.input.value = "";
  }
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
  await applyUploadFile(target, file, { targetSize: CAMERA_OUTPUT_SIZE });
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
  await stopCameraStream();
}

async function openCameraOverlay(target = "vehicle") {
  if (!isDirectCameraMode() && target !== "orderSheet") {
    return;
  }

  if (!supportsImageCapture()) {
    await captureUsingNativeCamera(target);
    return;
  }

  state.cameraTarget = target;
  refs.cameraTitle.textContent = target === "orderSheet" ? "拍 Order Sheet 工作單" : "拍車輛照";
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
  const prefix = state.cameraTarget === "orderSheet" ? "order-sheet" : "vehicle";
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
  refs.shutterCameraBtn.disabled = true;
  try {
    const blob = await captureHighResBlobFromTrack();
    if (!blob) {
      await closeCameraOverlay();
      await captureUsingNativeCamera(state.cameraTarget);
      return;
    }
    await closeCameraOverlay();
    await applyUploadFile(state.cameraTarget, buildCapturedFile(blob), { targetSize: CAMERA_OUTPUT_SIZE });
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
  if (!state.orderSheetPhotos.length) {
    return "請先加入 Order Sheet 工作單。";
  }
  return "";
}

function resetForm() {
  clearUploadTarget("vehicle");
  clearUploadTarget("orderSheet");
  state.brandId = "";
  state.vehicleModel = "";
  refs.customBrandInput.value = "";
  renderVehiclePreview();
  renderOrderSheetPreview();
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
      orderSheetPhotos: state.orderSheetPhotos,
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
      await applyUploadFile("vehicle", refs.vehicleInput.files[0]);
    }
  });

  refs.vehicleLibraryInput.addEventListener("change", async () => {
    if (refs.vehicleLibraryInput.files?.length) {
      await applyUploadFile("vehicle", refs.vehicleLibraryInput.files[0]);
    }
    refs.vehicleLibraryInput.value = "";
  });

  refs.vehicleZone.addEventListener("click", async (event) => {
    if (!isDirectCameraMode() || event.target.closest("button") || state.vehiclePhotos.length > 0) {
      return;
    }
    event.preventDefault();
    await openCameraOverlay("vehicle");
  });

  refs.orderSheetZone.addEventListener("click", async (event) => {
    if (event.target.closest("button") || state.orderSheetPhotos.length > 0) {
      return;
    }
    event.preventDefault();
    await openCameraOverlay("orderSheet");
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
    state.orderSheetPhotos.forEach((asset) => revokeDraftAsset(asset));
  });
}

async function init() {
  const user = await requireAuthorizedPage(["staff", "admin", "superadmin", "supreadmin"], "../index.html");
  syncCurrentUser(user);
  renderVehiclePreview();
  renderOrderSheetPreview();
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
