import { requireAuthorizedPage } from "./supabase-browser.js";
import {
  dateKeyFromTimestamp,
  deleteLibraryPhotos,
  describeSupabaseError,
  fetchAllLibraryPhotos,
  formatDateHeading,
  formatDateTime,
  getSignedPhotoUrl,
  PHOTO_MISSING_PLACEHOLDER_URL,
  shouldUseMissingPhotoPlaceholder,
} from "./workbench.js";

const state = {
  photos: [],
  groups: [],
  selectedPhotoIds: new Set(),
};

let thumbnailObserver = null;

const refs = {
  currentUserEmail: document.querySelector("#currentUserEmail"),
  galleryMeta: document.querySelector("#galleryMeta"),
  galleryCountChip: document.querySelector("#galleryCountChip"),
  gallerySelectedChip: document.querySelector("#gallerySelectedChip"),
  deleteSelectedBtn: document.querySelector("#deleteSelectedBtn"),
  galleryStatus: document.querySelector("#galleryStatus"),
  galleryDateList: document.querySelector("#galleryDateList"),
  galleryLightbox: document.querySelector("#galleryLightbox"),
  galleryLightboxClose: document.querySelector("#galleryLightboxClose"),
  galleryLightboxImage: document.querySelector("#galleryLightboxImage"),
  galleryLightboxTitle: document.querySelector("#galleryLightboxTitle"),
  galleryLightboxSubtitle: document.querySelector("#galleryLightboxSubtitle"),
  galleryLightboxOperator: document.querySelector("#galleryLightboxOperator"),
};

function syncCurrentUser(user) {
  if (refs.currentUserEmail) {
    refs.currentUserEmail.textContent = user?.email || user?.phone || user?.id || "-";
  }
}

function setStatus(message, type) {
  refs.galleryStatus.textContent = message;
  refs.galleryStatus.className = "status-text";
  if (type) {
    refs.galleryStatus.classList.add(`is-${type}`);
  }
}

function selectedCount() {
  return state.selectedPhotoIds.size;
}

function syncSelectionSummary() {
  const count = selectedCount();
  if (refs.gallerySelectedChip) {
    refs.gallerySelectedChip.textContent = count ? `已選 ${count} 張` : "未選取相片";
  }
  if (refs.deleteSelectedBtn) {
    refs.deleteSelectedBtn.disabled = count === 0;
  }
}

function photoVehicleLabel(photo) {
  const brandName = photo.captureSet?.brandName || "未關聯品牌";
  const vehicleModel = photo.captureSet?.vehicleModel ? ` ${photo.captureSet.vehicleModel}` : "";
  return `${brandName}${vehicleModel}`;
}

function photoWorkLabel(photo) {
  if (photo.kind === "vehicle") {
    return "Check-in 車輛照";
  }
  if (photo.kind === "order_sheet") {
    return "Order Sheet 工作單";
  }
  return photo.itemLabel || "未分類工序";
}

function groupPhotosByDate(photos) {
  const groups = [];
  const groupMap = new Map();

  photos.forEach((photo) => {
    const dateKey = dateKeyFromTimestamp(photo.createdAt);
    if (!groupMap.has(dateKey)) {
      const section = { dateKey, photos: [] };
      groupMap.set(dateKey, section);
      groups.push(section);
    }
    groupMap.get(dateKey).photos.push(photo);
  });

  return groups;
}

function renderGalleryCard(photo) {
  const captureReference = photo.captureSet?.reference || "未關聯案件";
  const checked = state.selectedPhotoIds.has(photo.id);
  return `
    <article class="gallery-photo-card ${checked ? "is-selected" : ""}">
      <label class="gallery-photo-select">
        <input type="checkbox" data-select-photo="${photo.id}" ${checked ? "checked" : ""}>
        <span>選取</span>
      </label>
      <button class="gallery-photo-button" type="button" data-photo-id="${photo.id}" aria-label="查看 ${photo.fileName}">
        <div class="gallery-photo-frame" data-photo-path="${photo.storagePath}">
          <img alt="${photo.fileName}">
        </div>
        <div class="gallery-photo-caption">
          <strong>${photoVehicleLabel(photo)}</strong>
          <span>${photoWorkLabel(photo)}</span>
          <span>${captureReference} · ${formatDateTime(photo.createdAt)}</span>
          <span>${photo.createdByLabel || "未記錄上傳帳號"}</span>
        </div>
      </button>
    </article>
  `;
}

function renderGallery() {
  refs.galleryCountChip.textContent = `${state.photos.length} 張相片`;
  syncSelectionSummary();
  refs.galleryMeta.textContent = state.photos.length
    ? `全部相片按上傳日期分段，最新日期與最新相片排在最上方。現時共有 ${state.groups.length} 個上傳日期分組。`
    : "目前未有任何相片紀錄。";

  if (!state.groups.length) {
    refs.galleryDateList.innerHTML = `
      <div class="empty-state">
        <strong>目前未有相片紀錄</strong>
        <p class="muted-copy">當車輛完成 Check-in 或安裝維修保養拍攝後，這裡就會顯示所有相片。</p>
      </div>
    `;
    return;
  }

  refs.galleryDateList.innerHTML = state.groups.map((group) => `
    <section class="gallery-date-group">
      <div class="gallery-date-head">
        <div>
          <p class="eyebrow">Upload Date</p>
          <h2>${formatDateHeading(group.dateKey)}</h2>
          <p class="muted-copy">${group.photos.length} 張相片</p>
        </div>
        <div class="gallery-date-actions">
          <span class="filter-chip">${group.dateKey}</span>
          <label class="gallery-date-select">
            <input
              type="checkbox"
              data-select-date="${group.dateKey}"
              ${group.photos.every((photo) => state.selectedPhotoIds.has(photo.id)) ? "checked" : ""}
            >
            <span>全選當日</span>
          </label>
        </div>
      </div>
      <div class="gallery-date-divider"></div>
      <div class="gallery-photo-grid">
        ${group.photos.map((photo) => renderGalleryCard(photo)).join("")}
      </div>
    </section>
  `).join("");
}

function getPhotosForDate(dateKey) {
  return state.groups.find((group) => group.dateKey === dateKey)?.photos || [];
}

function syncSelectionForDate(dateKey, shouldSelect) {
  getPhotosForDate(dateKey).forEach((photo) => {
    if (shouldSelect) {
      state.selectedPhotoIds.add(photo.id);
      return;
    }
    state.selectedPhotoIds.delete(photo.id);
  });
  renderGallery();
  void hydrateThumbnails();
}

async function deletePhotosByIds(photoIds) {
  const targets = state.photos.filter((photo) => photoIds.includes(photo.id));
  if (!targets.length) {
    setStatus("請先選取相片。", "danger");
    return;
  }

  const count = targets.length;
  const confirmText = count === 1
    ? "確定刪除這 1 張相片？刪除後不可還原。"
    : `確定刪除這 ${count} 張相片？刪除後不可還原。`;

  if (!window.confirm(confirmText)) {
    return;
  }

  if (refs.deleteSelectedBtn) {
    refs.deleteSelectedBtn.disabled = true;
  }
  setStatus(`正在刪除 ${count} 張相片...`, "");

  try {
    const deletedCount = await deleteLibraryPhotos(targets);
    const deletedIdSet = new Set(targets.map((photo) => photo.id));
    state.photos = state.photos.filter((photo) => !deletedIdSet.has(photo.id));
    deletedIdSet.forEach((photoId) => state.selectedPhotoIds.delete(photoId));
    state.groups = groupPhotosByDate(state.photos);
    renderGallery();
    await hydrateThumbnails();
    closeLightbox();
    setStatus(`已刪除 ${deletedCount} 張相片。`, "success");
  } catch (error) {
    syncSelectionSummary();
    setStatus(describeSupabaseError(error), "danger");
  }
}

async function hydrateThumbnails() {
  const frames = [...refs.galleryDateList.querySelectorAll("[data-photo-path]")];
  if (!frames.length) {
    return;
  }

  if (thumbnailObserver) {
    thumbnailObserver.disconnect();
  }

  if ("IntersectionObserver" in window) {
    thumbnailObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        thumbnailObserver.unobserve(entry.target);
        void loadThumbnail(entry.target);
      });
    }, {
      rootMargin: "320px 0px",
      threshold: 0.01,
    });

    frames.forEach((frame) => {
      thumbnailObserver.observe(frame);
    });
    return;
  }

  for (const frame of frames) {
    // Older browsers fallback to a slow sequential load instead of flooding storage.
    // eslint-disable-next-line no-await-in-loop
    await loadThumbnail(frame);
  }
}

async function loadThumbnail(frame) {
  if (!frame || frame.dataset.thumbState === "loading" || frame.dataset.thumbState === "done") {
    return;
  }

  const image = frame.querySelector("img");
  if (!image) {
    return;
  }

  frame.dataset.thumbState = "loading";
  try {
    image.src = await getSignedPhotoUrl(frame.dataset.photoPath, {
      width: 360,
      height: 360,
    });
    frame.dataset.thumbState = "done";
  } catch (error) {
    if (shouldUseMissingPhotoPlaceholder(error)) {
      image.src = PHOTO_MISSING_PLACEHOLDER_URL;
      frame.dataset.thumbState = "done";
      return;
    }
    frame.dataset.thumbState = "error";
    frame.classList.add("is-error");
  }
}

function closeLightbox() {
  refs.galleryLightbox.hidden = true;
  refs.galleryLightboxImage.removeAttribute("src");
  document.body.classList.remove("model-open");
}

async function openLightbox(photoId) {
  const photo = state.photos.find((entry) => entry.id === photoId);
  if (!photo) {
    return;
  }

  refs.galleryLightbox.hidden = false;
  document.body.classList.add("model-open");
  refs.galleryLightboxTitle.textContent = `${photoVehicleLabel(photo)} · ${photoWorkLabel(photo)}`;
  refs.galleryLightboxSubtitle.textContent = `${photo.captureSet?.reference || "未關聯案件"} · ${formatDateTime(photo.createdAt)}`;
  refs.galleryLightboxOperator.textContent = `上傳帳號：${photo.createdByLabel || "未記錄"}`;
  refs.galleryLightboxImage.removeAttribute("src");

  try {
    refs.galleryLightboxImage.src = await getSignedPhotoUrl(photo.storagePath, {
      width: 1600,
      height: 1600,
    });
  } catch (error) {
    if (shouldUseMissingPhotoPlaceholder(error)) {
      refs.galleryLightboxImage.src = PHOTO_MISSING_PLACEHOLDER_URL;
      refs.galleryLightboxTitle.textContent = `${photoVehicleLabel(photo)} · 圖片已刪除`;
      refs.galleryLightboxSubtitle.textContent = "原始圖片不存在，現以替代圖顯示。";
      refs.galleryLightboxOperator.textContent = `上傳帳號：${photo.createdByLabel || "未記錄"}`;
      return;
    }
    refs.galleryLightboxTitle.textContent = "圖片讀取失敗";
    refs.galleryLightboxSubtitle.textContent = describeSupabaseError(error);
    refs.galleryLightboxOperator.textContent = photo.storagePath;
  }
}

function bindEvents() {
  refs.galleryDateList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-photo-id]");
    if (!button) {
      return;
    }
    await openLightbox(button.dataset.photoId);
  });

  refs.galleryDateList.addEventListener("change", (event) => {
    const dateCheckbox = event.target.closest("[data-select-date]");
    if (dateCheckbox) {
      syncSelectionForDate(dateCheckbox.dataset.selectDate, dateCheckbox.checked);
      return;
    }

    const checkbox = event.target.closest("[data-select-photo]");
    if (!checkbox) {
      return;
    }

    if (checkbox.checked) {
      state.selectedPhotoIds.add(checkbox.dataset.selectPhoto);
    } else {
      state.selectedPhotoIds.delete(checkbox.dataset.selectPhoto);
    }
    syncSelectionSummary();
    checkbox.closest(".gallery-photo-card")?.classList.toggle("is-selected", checkbox.checked);
  });

  refs.galleryLightboxClose.addEventListener("click", closeLightbox);
  refs.galleryLightbox.addEventListener("click", (event) => {
    if (event.target === refs.galleryLightbox) {
      closeLightbox();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !refs.galleryLightbox.hidden) {
      closeLightbox();
    }
  });
  refs.deleteSelectedBtn.addEventListener("click", async () => {
    await deletePhotosByIds([...state.selectedPhotoIds]);
  });
}

async function init() {
  const user = await requireAuthorizedPage(["superadmin", "supreadmin"], "../index.html");
  syncCurrentUser(user);
  setStatus("正在載入全部圖片...", "");

  try {
    state.photos = await fetchAllLibraryPhotos();
    state.groups = groupPhotosByDate(state.photos);
    renderGallery();
    await hydrateThumbnails();
    setStatus(state.photos.length ? "已載入全部圖片庫。" : "目前未有相片資料。", state.photos.length ? "success" : "");
  } catch (error) {
    refs.galleryDateList.innerHTML = `
      <div class="empty-state">
        <strong>讀取圖片庫失敗</strong>
        <p class="muted-copy">${describeSupabaseError(error)}</p>
      </div>
    `;
    setStatus(describeSupabaseError(error), "danger");
  }

  bindEvents();
}

init();
