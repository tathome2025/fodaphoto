import { requireAuthenticatedPage } from "./supabase-browser.js";
import {
  applyFilterToDate,
  buildFolderName,
  countPhotosInSet,
  dedupeFilters,
  describeSupabaseError,
  fetchCaptureSetsByDate,
  fetchDatesWithUploads,
  fetchFilters,
  flattenPhotosForSet,
  formatDateHeading,
  formatMonthHeading,
  getMonthMatrix,
  getSignedPhotoUrl,
  hasAdjustments,
  renderAdjustedBlob,
  renderAdjustedDataUrl,
  sanitizeFileName,
} from "./workbench.js";

const dateQuery = new URLSearchParams(window.location.search).get("date");

const state = {
  selectedDate: dateQuery || null,
  currentMonth: null,
  selectedFilterId: "",
  filters: [],
  captureSets: [],
  uploadMap: {},
};

const refs = {
  monthLabel: document.querySelector("#monthLabel"),
  calendarGrid: document.querySelector("#calendarGrid"),
  selectedDateTitle: document.querySelector("#selectedDateTitle"),
  selectedDateMeta: document.querySelector("#selectedDateMeta"),
  setList: document.querySelector("#setList"),
  filterList: document.querySelector("#filterList"),
  applyDayFilterBtn: document.querySelector("#applyDayFilterBtn"),
  downloadDayBtn: document.querySelector("#downloadDayBtn"),
  selectedFilterChip: document.querySelector("#selectedFilterChip"),
  editStatus: document.querySelector("#editStatus"),
  prevMonthBtn: document.querySelector("#prevMonthBtn"),
  nextMonthBtn: document.querySelector("#nextMonthBtn"),
};

function setStatus(message, type) {
  refs.editStatus.textContent = message;
  refs.editStatus.className = "status-text";
  if (type) {
    refs.editStatus.classList.add(`is-${type}`);
  }
}

function selectedDateStats(captureSets) {
  const setCount = captureSets.length;
  const photoCount = captureSets.reduce((sum, captureSet) => sum + countPhotosInSet(captureSet), 0);
  return `${setCount} 組案件，${photoCount} 張相片`;
}

async function buildDisplayImage(photo, mode) {
  const signedUrl = await getSignedPhotoUrl(photo.storagePath, mode === "thumb" ? { width: 720, height: 540 } : undefined);
  if (!hasAdjustments(photo.adjustments)) {
    return signedUrl;
  }

  return renderAdjustedDataUrl(signedUrl, photo.adjustments, mode === "thumb"
    ? { width: 720, height: 540, mimeType: "image/jpeg", quality: 0.86 }
    : { mimeType: photo.mimeType === "image/png" ? "image/png" : "image/jpeg", quality: 0.9 });
}

function renderCalendar() {
  refs.monthLabel.textContent = formatMonthHeading(state.currentMonth);
  const matrix = getMonthMatrix(state.currentMonth.getFullYear(), state.currentMonth.getMonth());
  refs.calendarGrid.innerHTML = matrix.map((cell) => {
    if (!cell) {
      return `<div class="calendar-day is-empty"></div>`;
    }
    const dateText = `${cell.getFullYear()}-${`${cell.getMonth() + 1}`.padStart(2, "0")}-${`${cell.getDate()}`.padStart(2, "0")}`;
    const count = state.uploadMap[dateText] || 0;
    const className = [
      "calendar-day",
      count ? "has-data" : "",
      state.selectedDate === dateText ? "is-selected" : "",
    ].filter(Boolean).join(" ");

    return `
      <button class="${className}" type="button" data-calendar-date="${dateText}">
        <span>${cell.getDate()}</span>
        ${count ? `<span class="calendar-dot" title="${count} 張相片"></span>` : `<span></span>`}
      </button>
    `;
  }).join("");

  refs.calendarGrid.querySelectorAll("[data-calendar-date]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedDate = button.dataset.calendarDate;
      await renderCurrentDate();
      renderCalendar();
      syncUrl();
    });
  });
}

function renderFilters() {
  if (!state.filters.find((filter) => filter.id === state.selectedFilterId)) {
    state.selectedFilterId = state.filters[0]?.id || "";
  }

  const currentFilter = state.filters.find((filter) => filter.id === state.selectedFilterId);
  refs.selectedFilterChip.textContent = currentFilter
    ? `批量 filter：${currentFilter.name}`
    : "尚未有已儲存 filter";

  if (!state.filters.length) {
    refs.filterList.innerHTML = `
      <div class="empty-state">
        <strong>暫時沒有已儲存 filter</strong>
        <p class="muted-copy">先進入任一張相片的進階調色頁，另存一個命名 filter。</p>
      </div>
    `;
    return;
  }

  refs.filterList.innerHTML = state.filters.map((filter) => `
    <button class="filter-card ${filter.id === state.selectedFilterId ? "is-selected" : ""}" type="button" data-filter-id="${filter.id}">
      <strong>${filter.name}</strong>
      <p>亮度 ${filter.adjustments.brightness} / 對比 ${filter.adjustments.contrast} / 飽和 ${filter.adjustments.saturation} / 色溫 ${filter.adjustments.temperature}</p>
    </button>
  `).join("");

  refs.filterList.querySelectorAll("[data-filter-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFilterId = button.dataset.filterId;
      renderFilters();
    });
  });
}

async function hydrateCards() {
  const cards = [...refs.setList.querySelectorAll("[data-photo-id]")];
  await Promise.all(cards.map(async (card) => {
    const photoId = card.dataset.photoId;
    const image = card.querySelector("img");
    const photo = state.captureSets
      .flatMap((captureSet) => flattenPhotosForSet(captureSet))
      .find((entry) => entry.photo.id === photoId)?.photo;

    if (!photo || !image) {
      return;
    }

    try {
      image.src = await buildDisplayImage(photo, "thumb");
    } catch (error) {
      card.querySelector(".photo-body p").textContent = describeSupabaseError(error);
    }
  }));
}

async function renderCurrentDate() {
  refs.selectedDateTitle.textContent = formatDateHeading(state.selectedDate);
  try {
    state.captureSets = await fetchCaptureSetsByDate(state.selectedDate);
  } catch (error) {
    state.captureSets = [];
    refs.setList.innerHTML = `
      <div class="empty-state">
        <strong>讀取失敗</strong>
        <p class="muted-copy">${describeSupabaseError(error)}</p>
      </div>
    `;
    setStatus(describeSupabaseError(error), "danger");
    return;
  }

  refs.selectedDateMeta.textContent = selectedDateStats(state.captureSets);

  if (!state.captureSets.length) {
    refs.setList.innerHTML = `
      <div class="empty-state">
        <strong>這一天沒有相片</strong>
        <p class="muted-copy">回到拍照分類頁面建立新案件，日曆便會自動出現標記。</p>
      </div>
    `;
    return;
  }

  refs.setList.innerHTML = state.captureSets.map((captureSet) => {
    const folderName = buildFolderName(captureSet);
    const cards = flattenPhotosForSet(captureSet).map(({ photo, kindLabel, itemName, itemNames }) => {
      const filterName = state.filters.find((filter) => filter.id === photo.savedFilterId)?.name || (photo.savedFilterId ? "已套用 filter" : "未套用 filter");
      const itemChips = (itemNames || [])
        .map((name) => `<span class="meta-chip">${name}</span>`)
        .join("");
      return `
        <article class="photo-card" data-photo-id="${photo.id}">
          <img alt="${photo.fileName}">
          <div class="photo-body">
            <div class="chip-row">
              <span class="meta-chip">${kindLabel}</span>
              ${itemChips || (itemName ? `<span class="meta-chip">${itemName}</span>` : "")}
              <span class="meta-chip">${filterName}</span>
            </div>
            <strong>${photo.fileName}</strong>
            <p>${captureSet.notes || "未填整組備註"}</p>
          </div>
          <div class="photo-actions">
            <a class="secondary-button" href="./detail.html?photo=${encodeURIComponent(photo.id)}">進階調色</a>
          </div>
        </article>
      `;
    }).join("");

    return `
      <section class="set-card">
        <div class="set-head">
          <div>
            <h2>${captureSet.brandName}${captureSet.vehicleModel ? ` ${captureSet.vehicleModel}` : ""} · ${captureSet.reference}</h2>
            <p>${captureSet.notes || "未填整組備註"}</p>
          </div>
          <div class="chip-row">
            <span class="meta-chip">${captureSet.captureDate}</span>
            <span class="meta-chip">${folderName}</span>
          </div>
        </div>
        <div class="photo-stack">${cards}</div>
      </section>
    `;
  }).join("");

  await hydrateCards();
}

async function reloadFilters() {
  state.filters = dedupeFilters(await fetchFilters());
  renderFilters();
}

async function applySelectedFilter() {
  if (!state.selectedFilterId) {
    setStatus("請先選擇一個已儲存 filter。", "danger");
    return;
  }

  refs.applyDayFilterBtn.disabled = true;
  setStatus("正在為當天相片套用 filter...", "");

  try {
    const count = await applyFilterToDate(state.selectedDate, state.selectedFilterId);
    setStatus(`已為 ${count} 張相片套用 filter。`, "success");
    await renderCurrentDate();
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.applyDayFilterBtn.disabled = false;
  }
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadDayArchive() {
  if (!state.captureSets.length) {
    setStatus("這一天沒有可下載的相片。", "danger");
    return;
  }

  refs.downloadDayBtn.disabled = true;
  setStatus("正在打包當天相片...", "");

  try {
    const zip = new window.JSZip();

    for (const captureSet of state.captureSets) {
      const folder = zip.folder(sanitizeFileName(buildFolderName(captureSet)));
      let index = 1;

      for (const { photo, itemName, itemNames } of flattenPhotosForSet(captureSet)) {
        const sourceUrl = await getSignedPhotoUrl(photo.storagePath);
        const blob = await renderAdjustedBlob(sourceUrl, photo.adjustments, {
          mimeType: photo.mimeType === "image/png" ? "image/png" : "image/jpeg",
          quality: 0.92,
        });
        const extension = photo.mimeType === "image/png" ? "png" : "jpg";
        const itemLabel = (itemNames || []).join("+") || itemName || photo.itemId;
        const fileName = photo.kind === "vehicle"
          ? `vehicle-${index}.${extension}`
          : `accessory-${sanitizeFileName(itemLabel || `item-${index}`)}-${index}.${extension}`;
        folder.file(fileName, blob);
        index += 1;
      }
    }

    const archive = await zip.generateAsync({ type: "blob" });
    downloadBlob(archive, `garage-photos-${state.selectedDate}.zip`);
    setStatus("下載壓縮包已開始。", "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    refs.downloadDayBtn.disabled = false;
  }
}

async function loadMonth(date) {
  state.currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  try {
    state.uploadMap = await fetchDatesWithUploads(state.currentMonth.getFullYear(), state.currentMonth.getMonth());
    renderCalendar();
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  }
}

function syncUrl() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("date", state.selectedDate);
  window.history.replaceState({}, "", nextUrl);
}

function bindEvents() {
  refs.applyDayFilterBtn.addEventListener("click", applySelectedFilter);
  refs.downloadDayBtn.addEventListener("click", downloadDayArchive);
  refs.prevMonthBtn.addEventListener("click", async () => {
    const next = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
    await loadMonth(next);
  });
  refs.nextMonthBtn.addEventListener("click", async () => {
    const next = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
    await loadMonth(next);
  });
}

async function init() {
  await requireAuthenticatedPage("../index.html");

  const seedDate = state.selectedDate ? new Date(`${state.selectedDate}T00:00:00`) : new Date();
  if (!state.selectedDate) {
    state.selectedDate = `${seedDate.getFullYear()}-${String(seedDate.getMonth() + 1).padStart(2, "0")}-${String(seedDate.getDate()).padStart(2, "0")}`;
  }

  bindEvents();
  setStatus("讀取日曆與 filter 中...", "");

  try {
    await reloadFilters();
    await loadMonth(seedDate);
    await renderCurrentDate();
    setStatus("已連接 Supabase。", "success");
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  }
}

init();
