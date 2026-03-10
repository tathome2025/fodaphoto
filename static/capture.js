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
  captureDateInput: document.querySelector("#captureDateInput"),
  referenceInput: document.querySelector("#referenceInput"),
  notesInput: document.querySelector("#notesInput"),
  vehicleInput: document.querySelector("#vehicleInput"),
  vehiclePreview: document.querySelector("#vehiclePreview"),
  brandGrid: document.querySelector("#brandGrid"),
  accessoryList: document.querySelector("#accessoryList"),
  addAccessoryBtn: document.querySelector("#addAccessoryBtn"),
  saveSetBtn: document.querySelector("#saveSetBtn"),
  saveAndEditBtn: document.querySelector("#saveAndEditBtn"),
  captureStatus: document.querySelector("#captureStatus"),
  progressVehicle: document.querySelector("#progressVehicle"),
  progressBrand: document.querySelector("#progressBrand"),
  progressAccessory: document.querySelector("#progressAccessory"),
};

const state = {
  brands: [],
  serviceItems: [],
  brandId: "",
  vehiclePhotos: [],
  accessoryEntries: [],
  submitMode: "stay",
};

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
  return Boolean(state.brandId);
}

function isAccessoryReady() {
  return state.accessoryEntries.length > 0 && state.accessoryEntries.every((entry) => entry.itemId && entry.photos.length > 0);
}

function renderProgress() {
  const vehicleReady = isVehicleReady();
  const brandReady = isBrandReady();
  const accessoryReady = isAccessoryReady();

  refs.progressVehicle.classList.toggle("is-active", !vehicleReady);
  refs.progressVehicle.classList.toggle("is-done", vehicleReady);
  refs.progressBrand.classList.toggle("is-active", vehicleReady && !brandReady);
  refs.progressBrand.classList.toggle("is-done", brandReady);
  refs.progressAccessory.classList.toggle("is-active", vehicleReady && brandReady && !accessoryReady);
  refs.progressAccessory.classList.toggle("is-done", accessoryReady);
}

function clearAssets(list) {
  list.forEach((asset) => revokeDraftAsset(asset));
}

function renderVehiclePreview() {
  if (!state.vehiclePhotos.length) {
    refs.vehiclePreview.innerHTML = `
      <div class="empty-state">
        <strong>尚未加入車輛照</strong>
        <p class="muted-copy">先拍或上傳車輛全景，之後才好對應配件項目。</p>
      </div>
    `;
    return;
  }

  refs.vehiclePreview.innerHTML = state.vehiclePhotos.map((photo, index) => `
    <figure class="preview-thumb">
      <img src="${photo.previewUrl}" alt="車輛照 ${index + 1}">
      <footer>
        <span>${photo.fileName}</span>
        <button class="tiny-button" type="button" data-remove-vehicle="${photo.localId}">移除</button>
      </footer>
    </figure>
  `).join("");

  refs.vehiclePreview.querySelectorAll("[data-remove-vehicle]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = state.vehiclePhotos.findIndex((photo) => photo.localId === button.dataset.removeVehicle);
      if (index === -1) {
        return;
      }
      revokeDraftAsset(state.vehiclePhotos[index]);
      state.vehiclePhotos.splice(index, 1);
      renderVehiclePreview();
      renderProgress();
    });
  });
}

function renderBrands() {
  refs.brandGrid.innerHTML = state.brands.map((brand) => `
    <button class="choice-button ${state.brandId === brand.id ? "is-selected" : ""}" type="button" data-brand-id="${brand.id}">
      <strong>${brand.name}</strong>
      <span>此案件車輛品牌</span>
    </button>
  `).join("");

  refs.brandGrid.querySelectorAll("[data-brand-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.brandId = button.dataset.brandId;
      renderBrands();
      renderProgress();
    });
  });
}

function renderAccessoryPreviews(entry) {
  if (!entry.photos.length) {
    return `
      <div class="empty-state">
        <strong>未加入配件相片</strong>
        <p class="muted-copy">可連拍多張，同一項目會一起存入同一案件。</p>
      </div>
    `;
  }

  return entry.photos.map((photo) => `
    <figure class="preview-thumb">
      <img src="${photo.previewUrl}" alt="${photo.fileName}">
      <footer>
        <span>${photo.fileName}</span>
        <button class="tiny-button" type="button" data-remove-accessory-photo="${entry.id}:${photo.localId}">移除</button>
      </footer>
    </figure>
  `).join("");
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
    renderProgress();
    return;
  }

  refs.accessoryList.innerHTML = state.accessoryEntries.map((entry, index) => `
    <article class="accessory-card">
      <div class="accessory-head">
        <div>
          <h3>配件 / 維修 ${String(index + 1).padStart(2, "0")}</h3>
          <p class="accessory-subcopy">同一項目可放多張相片，例如拆裝前後、細節位。</p>
        </div>
        <button class="tiny-button" type="button" data-remove-entry="${entry.id}">移除</button>
      </div>

      <label class="upload-zone" for="upload-${entry.id}">
        <input id="upload-${entry.id}" type="file" accept="image/*" capture="environment" multiple>
        <strong>拍配件 / 維修相片</strong>
        <small>手機會直接打開相機，也可從相簿選多張。</small>
      </label>

      <div class="preview-grid">${renderAccessoryPreviews(entry)}</div>

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
    button.addEventListener("click", () => {
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

  refs.accessoryList.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener("change", async () => {
      const entryId = input.id.replace("upload-", "");
      const entry = state.accessoryEntries.find((record) => record.id === entryId);
      if (!entry || !input.files?.length) {
        return;
      }

      try {
        setStatus("處理配件相片中...", "");
        const prepared = await Promise.all([...input.files].map((file) => fileToDraftAsset(file)));
        entry.photos.push(...prepared);
        renderAccessoryList();
        renderProgress();
        setStatus(`已加入 ${prepared.length} 張配件相片。`, "success");
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

  renderProgress();
}

async function handleVehicleUpload(files) {
  if (!files.length) {
    return;
  }

  try {
    setStatus("處理車輛相片中...", "");
    const prepared = await Promise.all([...files].map((file) => fileToDraftAsset(file)));
    state.vehiclePhotos.push(...prepared);
    renderVehiclePreview();
    renderProgress();
    setStatus(`已加入 ${prepared.length} 張車輛相片。`, "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.vehicleInput.value = "";
  }
}

function validateBeforeSave() {
  if (!refs.referenceInput.value.trim()) {
    return "請先輸入案件編號或車牌。";
  }
  if (!isVehicleReady()) {
    return "請先加入至少 1 張車輛照。";
  }
  if (!isBrandReady()) {
    return "請先選擇車輛品牌。";
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

  refs.referenceInput.value = "";
  refs.notesInput.value = "";
  refs.captureDateInput.value = todayLocal();
  refs.vehicleInput.value = "";
  state.brandId = "";
  state.vehiclePhotos = [];
  state.accessoryEntries = [createAccessoryEntry()];
  renderVehiclePreview();
  renderBrands();
  renderAccessoryList();
  renderProgress();
}

function collectPayload() {
  return {
    reference: refs.referenceInput.value.trim(),
    captureDate: refs.captureDateInput.value || todayLocal(),
    notes: refs.notesInput.value.trim(),
    brandId: state.brandId,
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
  refs.saveAndEditBtn.disabled = true;
  setStatus("正在上傳至 Supabase...", "");

  try {
    const captureSet = await createCaptureSet(collectPayload());
    setStatus(`案件 ${captureSet.reference} 已儲存。`, "success");
    if (state.submitMode === "edit") {
      window.location.href = `../edit/?date=${encodeURIComponent(captureSet.captureDate)}`;
      return;
    }
    resetForm();
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.saveSetBtn.disabled = false;
    refs.saveAndEditBtn.disabled = false;
  }
}

function bindEvents() {
  refs.captureDateInput.value = todayLocal();
  refs.vehicleInput.addEventListener("change", async () => {
    if (refs.vehicleInput.files?.length) {
      await handleVehicleUpload(refs.vehicleInput.files);
    }
  });

  refs.addAccessoryBtn.addEventListener("click", () => {
    state.accessoryEntries.push(createAccessoryEntry());
    renderAccessoryList();
    setStatus("已新增一個配件項目。", "");
    window.requestAnimationFrame(() => {
      refs.accessoryList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  refs.saveSetBtn.addEventListener("click", () => {
    state.submitMode = "stay";
  });
  refs.saveAndEditBtn.addEventListener("click", () => {
    state.submitMode = "edit";
  });
  refs.captureForm.addEventListener("submit", handleSubmit);

  window.addEventListener("beforeunload", () => {
    clearAssets(state.vehiclePhotos);
    state.accessoryEntries.forEach((entry) => clearAssets(entry.photos));
  });
}

async function init() {
  await requireAuthenticatedPage("../index.html");
  setStatus("正在載入品牌與配件分類...", "");
  refs.captureDateInput.value = todayLocal();
  state.accessoryEntries = [createAccessoryEntry()];
  renderVehiclePreview();
  renderAccessoryList();
  renderProgress();

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
