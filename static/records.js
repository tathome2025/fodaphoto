import { requireAuthenticatedPage } from "./supabase-browser.js";
import {
  describeSupabaseError,
  fetchActivityDates,
  fetchCaptureSetsByActivityDate,
  formatDateHeading,
  formatDateTime,
  formatMonthHeading,
  getMonthMatrix,
  getSignedPhotoUrl,
  todayLocal,
} from "./workbench.js";

const state = {
  selectedDate: new URLSearchParams(window.location.search).get("date") || todayLocal(),
  currentMonth: null,
  uploadMap: {},
  captureSets: [],
};

const refs = {
  monthLabel: document.querySelector("#monthLabel"),
  calendarGrid: document.querySelector("#calendarGrid"),
  selectedDateTitle: document.querySelector("#selectedDateTitle"),
  selectedDateMeta: document.querySelector("#selectedDateMeta"),
  selectedDateChip: document.querySelector("#selectedDateChip"),
  recordsStatus: document.querySelector("#recordsStatus"),
  recordList: document.querySelector("#recordList"),
  prevMonthBtn: document.querySelector("#prevMonthBtn"),
  nextMonthBtn: document.querySelector("#nextMonthBtn"),
};

function setStatus(message, type) {
  refs.recordsStatus.textContent = message;
  refs.recordsStatus.className = "status-text";
  if (type) {
    refs.recordsStatus.classList.add(`is-${type}`);
  }
}

function selectedDateStats(captureSets) {
  return `${captureSets.length} 台車輛於當日有操作紀錄`;
}

function syncUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("date", state.selectedDate);
  window.history.replaceState({}, "", url);
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
        ${count ? `<span class="calendar-dot" title="${count} 台車有紀錄"></span>` : `<span></span>`}
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

async function hydratePhotoCards() {
  const cards = [...refs.recordList.querySelectorAll("[data-photo-path]")];
  await Promise.all(cards.map(async (card) => {
    const image = card.querySelector("img");
    if (!image) {
      return;
    }
    try {
      image.src = await getSignedPhotoUrl(card.dataset.photoPath, {
        width: 720,
        height: 540,
      });
    } catch (error) {
      card.querySelector(".record-photo-caption")?.replaceChildren(document.createTextNode(describeSupabaseError(error)));
    }
  }));
}

function renderPhotoCard(photo, label) {
  return `
    <article class="record-photo-card" data-photo-path="${photo.storagePath}">
      <div class="record-photo-frame">
        <img alt="${photo.fileName}">
      </div>
      <div class="record-photo-caption">
        <strong>${label}</strong>
        <span>${photo.fileName}</span>
        <span>${photo.createdByLabel || "未記錄"} · ${formatDateTime(photo.createdAt)}</span>
      </div>
    </article>
  `;
}

async function renderCurrentDate() {
  refs.selectedDateTitle.textContent = formatDateHeading(state.selectedDate);
  refs.selectedDateChip.textContent = state.selectedDate;

  try {
    state.captureSets = await fetchCaptureSetsByActivityDate(state.selectedDate);
  } catch (error) {
    state.captureSets = [];
    refs.recordList.innerHTML = `
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
    refs.recordList.innerHTML = `
      <div class="empty-state">
        <strong>這一天未有處理紀錄</strong>
        <p class="muted-copy">可回到 Check-in 或安裝維修保養頁建立新紀錄。</p>
      </div>
    `;
    setStatus("這一天暫時未有車輛處理紀錄。", "");
    return;
  }

  refs.recordList.innerHTML = state.captureSets.map((captureSet) => {
    const checkInBlock = captureSet.activityOnDate.hasCheckIn
      ? `
        <section class="activity-block">
          <div class="activity-head">
            <div>
              <h3>Check-in</h3>
              <p>${captureSet.createdByLabel || "未記錄"} 於 ${formatDateTime(captureSet.createdAt)} 建立案件</p>
            </div>
            <div class="chip-row">
              <span class="meta-chip">${captureSet.reference}</span>
              <span class="meta-chip">${captureSet.captureDate}</span>
            </div>
          </div>
          <div class="record-photo-grid">
            ${(captureSet.vehiclePhotos || []).map((photo) => renderPhotoCard(photo, "車輛照")).join("")}
          </div>
        </section>
      `
      : "";

    const serviceBlocks = captureSet.activityOnDate.serviceEntries.map((entry, index) => {
      const photo = entry.photos[0];
      return `
        <section class="activity-block">
          <div class="activity-head">
            <div>
              <h3>工序 ${String(index + 1).padStart(2, "0")} · ${entry.itemLabel || "未分類"}</h3>
              <p>${photo?.createdByLabel || "未記錄"} 於 ${photo?.createdAt ? formatDateTime(photo.createdAt) : "-"} 輸入</p>
            </div>
            <div class="chip-row">
              ${(entry.itemNames || []).map((name) => `<span class="meta-chip">${name}</span>`).join("")}
            </div>
          </div>
          <p class="activity-note">${entry.notes || "未填工序備註"}</p>
          <div class="record-photo-grid">
            ${(entry.photos || []).map((itemPhoto) => renderPhotoCard(itemPhoto, entry.itemLabel || "工序照片")).join("")}
          </div>
        </section>
      `;
    }).join("");

    return `
      <article class="record-vehicle-card">
        <div class="set-head">
          <div>
            <h2>${captureSet.brandName}${captureSet.vehicleModel ? ` ${captureSet.vehicleModel}` : ""} · ${captureSet.reference}</h2>
            <p>${captureSet.notes || "未填整組備註"}</p>
          </div>
          <div class="chip-row">
            <span class="meta-chip">Check-in：${captureSet.createdByLabel || "未記錄"}</span>
            <span class="meta-chip">${captureSet.captureDate}</span>
          </div>
        </div>
        <div class="activity-stack">
          ${checkInBlock}
          ${serviceBlocks || `
            <div class="empty-state compact">
              <strong>當日只有 Check-in 或沒有新增工序</strong>
              <p class="muted-copy">這台車於當日沒有額外安裝、維修或保養輸入。</p>
            </div>
          `}
        </div>
      </article>
    `;
  }).join("");

  await hydratePhotoCards();
  setStatus("已載入當日處理紀錄。", "success");
}

async function reloadCalendarMonth() {
  state.uploadMap = await fetchActivityDates(state.currentMonth.getFullYear(), state.currentMonth.getMonth());
  renderCalendar();
}

function bindEvents() {
  refs.prevMonthBtn.addEventListener("click", async () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
    await reloadCalendarMonth();
  });

  refs.nextMonthBtn.addEventListener("click", async () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
    await reloadCalendarMonth();
  });
}

async function init() {
  await requireAuthenticatedPage("../index.html");
  const [year, month] = state.selectedDate.split("-").map(Number);
  state.currentMonth = new Date(year, month - 1, 1);
  setStatus("正在載入處理紀錄...", "");

  try {
    await reloadCalendarMonth();
    await renderCurrentDate();
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  }

  bindEvents();
}

init();
