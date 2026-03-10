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
  vehicleZone: document.querySelector("#vehicleZone"),
  vehiclePreview: document.querySelector("#vehiclePreview"),
  brandGrid: document.querySelector("#brandGrid"),
  accessoryList: document.querySelector("#accessoryList"),
  addAccessoryBtn: document.querySelector("#addAccessoryBtn"),
  saveSetBtn: document.querySelector("#saveSetBtn"),
  captureStatus: document.querySelector("#captureStatus"),
};

const state = {
  brands: [],
  serviceItems: [],
  brandId: "",
  vehiclePhotos: [],
  accessoryEntries: [],
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
  refs.vehicleInput.disabled = state.vehiclePhotos.length > 0;
  if (!state.vehiclePhotos.length) {
    refs.vehiclePreview.innerHTML = `
      <div class="upload-prompt">
        <strong>按一下拍照或上傳車輛照</strong>
        <small>只可上傳一張車輛照。</small>
      </div>
    `;
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
    });
  });
}

function renderAccessoryPreview(entry) {
  if (!entry.photos.length) {
    return `
      <div class="upload-prompt">
        <strong>拍配件 / 維修相片</strong>
        <small>只可上傳一張相片。</small>
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

      <label class="upload-zone ${entry.photos.length ? "has-preview" : ""}" for="upload-${entry.id}">
        <input id="upload-${entry.id}" type="file" accept="image/*" capture="environment" ${entry.photos.length ? "disabled" : ""}>
        <div class="upload-zone-content">${renderAccessoryPreview(entry)}</div>
      </label>

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

  refs.accessoryList.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener("change", async () => {
      const entryId = input.id.replace("upload-", "");
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
        setStatus("處理配件相片中...", "");
        const prepared = await fileToDraftAsset(input.files[0]);
        entry.photos = [prepared];
        renderAccessoryList();
        setStatus("已加入配件相片。", "success");
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

async function handleVehicleUpload(files) {
  if (!files.length) {
    return;
  }

  if (state.vehiclePhotos.length > 0) {
    setStatus("車輛照只可上傳一張，如需更換請先移除。", "danger");
    refs.vehicleInput.value = "";
    return;
  }

  try {
    setStatus("處理車輛相片中...", "");
    const prepared = await fileToDraftAsset(files[0]);
    state.vehiclePhotos = [prepared];
    renderVehiclePreview();
    setStatus("已加入車輛照。", "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.vehicleInput.value = "";
  }
}

function validateBeforeSave() {
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

  refs.vehicleInput.value = "";
  state.brandId = "";
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

  refs.addAccessoryBtn.addEventListener("click", () => {
    state.accessoryEntries.push(createAccessoryEntry());
    renderAccessoryList();
    setStatus("已新增一個配件項目。", "");
    window.requestAnimationFrame(() => {
      refs.accessoryList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
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
