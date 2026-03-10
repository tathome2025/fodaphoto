import { requireAuthenticatedPage } from "./supabase-browser.js";
import {
  PRESETS,
  buildFolderName,
  cloneAdjustments,
  createFilter,
  describeSupabaseError,
  fetchFilters,
  fetchPhotoDetail,
  getSignedPhotoUrl,
  renderAdjustedBlob,
  renderAdjustedCanvas,
  upsertCurrentPhotoEdit,
} from "./workbench.js";

const photoId = new URLSearchParams(window.location.search).get("photo");

const refs = {
  backLink: document.querySelector("#backLink"),
  detailCanvas: document.querySelector("#detailCanvas"),
  photoTitle: document.querySelector("#photoTitle"),
  photoSummary: document.querySelector("#photoSummary"),
  detailStatus: document.querySelector("#detailStatus"),
  presetGrid: document.querySelector("#presetGrid"),
  brightnessInput: document.querySelector("#brightnessInput"),
  contrastInput: document.querySelector("#contrastInput"),
  saturationInput: document.querySelector("#saturationInput"),
  temperatureInput: document.querySelector("#temperatureInput"),
  brightnessValue: document.querySelector("#brightnessValue"),
  contrastValue: document.querySelector("#contrastValue"),
  saturationValue: document.querySelector("#saturationValue"),
  temperatureValue: document.querySelector("#temperatureValue"),
  savePhotoBtn: document.querySelector("#savePhotoBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  filterNameInput: document.querySelector("#filterNameInput"),
  saveFilterBtn: document.querySelector("#saveFilterBtn"),
  detailFilterList: document.querySelector("#detailFilterList"),
  fileNameMeta: document.querySelector("#fileNameMeta"),
  kindMeta: document.querySelector("#kindMeta"),
  brandMeta: document.querySelector("#brandMeta"),
  setMeta: document.querySelector("#setMeta"),
  folderMeta: document.querySelector("#folderMeta"),
};

const state = {
  detail: null,
  filters: [],
  sourceUrl: "",
  appliedFilterId: "",
  adjustments: { brightness: 0, contrast: 0, saturation: 0, temperature: 0 },
};

function setStatus(message, type) {
  refs.detailStatus.textContent = message;
  refs.detailStatus.className = "status-text";
  if (type) {
    refs.detailStatus.classList.add(`is-${type}`);
  }
}

function syncMeta() {
  const detail = state.detail;
  refs.backLink.href = `./?date=${encodeURIComponent(detail.captureSet.captureDate)}`;
  refs.photoTitle.textContent = detail.photo.fileName;
  refs.photoSummary.textContent = `${detail.captureSet.brandName}${detail.captureSet.vehicleModel ? ` ${detail.captureSet.vehicleModel}` : ""} · ${detail.captureSet.reference} · ${detail.captureSet.captureDate}`;
  refs.fileNameMeta.textContent = detail.photo.fileName;
  refs.kindMeta.textContent = detail.photo.kind === "vehicle" ? "車輛照" : (detail.photo.itemName || detail.photo.itemId);
  refs.brandMeta.textContent = `${detail.captureSet.brandName}${detail.captureSet.vehicleModel ? ` ${detail.captureSet.vehicleModel}` : ""}`;
  refs.setMeta.textContent = detail.captureSet.reference;
  refs.folderMeta.textContent = buildFolderName(detail.captureSet);
}

function syncSliders() {
  refs.brightnessInput.value = String(state.adjustments.brightness);
  refs.contrastInput.value = String(state.adjustments.contrast);
  refs.saturationInput.value = String(state.adjustments.saturation);
  refs.temperatureInput.value = String(state.adjustments.temperature);
  refs.brightnessValue.textContent = state.adjustments.brightness;
  refs.contrastValue.textContent = state.adjustments.contrast;
  refs.saturationValue.textContent = state.adjustments.saturation;
  refs.temperatureValue.textContent = state.adjustments.temperature;
}

async function renderPreview() {
  try {
    await renderAdjustedCanvas(refs.detailCanvas, state.sourceUrl, state.adjustments);
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  }
}

function renderPresets() {
  refs.presetGrid.innerHTML = PRESETS.map((preset) => `
    <button class="choice-button" type="button" data-preset-id="${preset.id}">
      <strong>${preset.name}</strong>
      <span>快速套用預設調性</span>
    </button>
  `).join("");

  refs.presetGrid.querySelectorAll("[data-preset-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const preset = PRESETS.find((item) => item.id === button.dataset.presetId);
      if (!preset) {
        return;
      }
      state.adjustments = cloneAdjustments(preset.adjustments);
      state.appliedFilterId = "";
      syncSliders();
      await renderPreview();
      renderFilterList();
      setStatus(`已套用 ${preset.name} preset。`, "success");
    });
  });
}

function renderFilterList() {
  if (!state.filters.length) {
    refs.detailFilterList.innerHTML = `
      <div class="empty-state">
        <strong>暫時沒有已儲存 filter</strong>
        <p class="muted-copy">調好後可在上方輸入名稱並另存。</p>
      </div>
    `;
    return;
  }

  refs.detailFilterList.innerHTML = state.filters.map((filter) => `
    <button class="filter-card ${filter.id === state.appliedFilterId ? "is-selected" : ""}" type="button" data-filter-id="${filter.id}">
      <strong>${filter.name}</strong>
      <p>亮度 ${filter.adjustments.brightness} / 對比 ${filter.adjustments.contrast} / 飽和 ${filter.adjustments.saturation} / 色溫 ${filter.adjustments.temperature}</p>
    </button>
  `).join("");

  refs.detailFilterList.querySelectorAll("[data-filter-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const filter = state.filters.find((item) => item.id === button.dataset.filterId);
      if (!filter) {
        return;
      }
      state.adjustments = cloneAdjustments(filter.adjustments);
      state.appliedFilterId = filter.id;
      syncSliders();
      renderFilterList();
      await renderPreview();
      setStatus(`已套用 filter：${filter.name}。`, "success");
    });
  });
}

function bindSlider(input, key) {
  input.addEventListener("input", async () => {
    state.adjustments[key] = Number(input.value);
    state.appliedFilterId = "";
    syncSliders();
    renderFilterList();
    await renderPreview();
  });
}

async function savePhotoAdjustments() {
  refs.savePhotoBtn.disabled = true;
  try {
    await upsertCurrentPhotoEdit(state.detail.photo.id, state.adjustments, state.appliedFilterId || null);
    setStatus("調色結果已儲存。", "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.savePhotoBtn.disabled = false;
  }
}

async function exportCurrentPhoto() {
  refs.exportBtn.disabled = true;
  try {
    const blob = await renderAdjustedBlob(state.sourceUrl, state.adjustments, {
      mimeType: state.detail.photo.mimeType === "image/png" ? "image/png" : "image/jpeg",
      quality: 0.92,
    });
    const extension = state.detail.photo.mimeType === "image/png" ? "png" : "jpg";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${state.detail.photo.fileName.replace(/\.[^.]+$/, "")}-edited.${extension}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("已開始下載目前調色版本。", "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.exportBtn.disabled = false;
  }
}

async function saveNamedFilter() {
  const filterName = refs.filterNameInput.value.trim();
  if (!filterName) {
    setStatus("請先輸入 filter 名稱。", "danger");
    return;
  }

  refs.saveFilterBtn.disabled = true;
  try {
    const filter = await createFilter(filterName, state.adjustments);
    state.filters.unshift(filter);
    state.appliedFilterId = filter.id;
    await upsertCurrentPhotoEdit(state.detail.photo.id, state.adjustments, filter.id);
    renderFilterList();
    setStatus(`已另存 filter：${filter.name}。`, "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.saveFilterBtn.disabled = false;
  }
}

function bindEvents() {
  bindSlider(refs.brightnessInput, "brightness");
  bindSlider(refs.contrastInput, "contrast");
  bindSlider(refs.saturationInput, "saturation");
  bindSlider(refs.temperatureInput, "temperature");
  refs.savePhotoBtn.addEventListener("click", savePhotoAdjustments);
  refs.exportBtn.addEventListener("click", exportCurrentPhoto);
  refs.saveFilterBtn.addEventListener("click", saveNamedFilter);
}

async function init() {
  if (!photoId) {
    window.location.href = "./";
    return;
  }

  await requireAuthenticatedPage("../index.html");
  setStatus("讀取相片資料中...", "");

  try {
    const [detail, filters] = await Promise.all([fetchPhotoDetail(photoId), fetchFilters()]);
    state.detail = detail;
    state.filters = filters;
    state.adjustments = cloneAdjustments(detail.photo.adjustments);
    state.appliedFilterId = detail.photo.savedFilterId || "";
    state.sourceUrl = await getSignedPhotoUrl(detail.photo.storagePath);
    syncMeta();
    syncSliders();
    renderPresets();
    renderFilterList();
    bindEvents();
    await renderPreview();
    setStatus("可以開始進階調色。", "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  }
}

init();
