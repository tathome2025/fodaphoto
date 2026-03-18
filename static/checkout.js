import { requireAuthenticatedPage } from "./supabase-browser.js";
import {
  describeSupabaseError,
  fetchRecentCheckInSets,
  getSignedPhotoUrl,
  markCaptureSetServiceCompleted,
} from "./workbench.js";

const refs = {
  currentUserEmail: document.querySelector("#currentUserEmail"),
  checkoutVehicleList: document.querySelector("#checkoutVehicleList"),
  checkoutBtn: document.querySelector("#checkoutBtn"),
  checkoutStatus: document.querySelector("#checkoutStatus"),
};

const state = {
  checkInSets: [],
  selectedCaptureSetId: "",
  vehicleThumbUrls: new Map(),
};

function syncCurrentUser(user) {
  if (refs.currentUserEmail) {
    refs.currentUserEmail.textContent = user?.email || user?.phone || user?.id || "-";
  }
}

function setStatus(message, type) {
  refs.checkoutStatus.textContent = message;
  refs.checkoutStatus.className = "status-text";
  if (type) {
    refs.checkoutStatus.classList.add(`is-${type}`);
  }
}

function getSelectedCaptureSet() {
  return state.checkInSets.find((captureSet) => captureSet.id === state.selectedCaptureSetId) || null;
}

function renderCheckoutButton() {
  refs.checkoutBtn.disabled = !getSelectedCaptureSet();
}

function renderVehicleList() {
  if (!state.checkInSets.length) {
    refs.checkoutVehicleList.innerHTML = `
      <div class="empty-state">
        <strong>暫時未有可 Check out 車輛</strong>
        <p class="muted-copy">所有已 Check-in 車輛都已完成，或暫時未建立新案件。</p>
      </div>
    `;
    renderCheckoutButton();
    return;
  }

  refs.checkoutVehicleList.innerHTML = state.checkInSets.map((captureSet) => {
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

  refs.checkoutVehicleList.querySelectorAll("[data-select-capture-set]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCaptureSetId = button.dataset.selectCaptureSet;
      renderVehicleList();
      setStatus("已選擇車輛，可按下 Check out。", "");
    });
  });

  renderCheckoutButton();
}

async function hydrateVehicleThumbs() {
  const pendingSets = state.checkInSets.filter((captureSet) =>
    captureSet.vehiclePhotos[0]?.storagePath
    && !state.vehicleThumbUrls.has(captureSet.id)
  );

  if (!pendingSets.length) {
    return;
  }

  await Promise.all(pendingSets.map(async (captureSet) => {
    try {
      const thumbUrl = await getSignedPhotoUrl(captureSet.vehiclePhotos[0].storagePath, {
        width: 360,
        height: 270,
      });
      state.vehicleThumbUrls.set(captureSet.id, thumbUrl);
    } catch (_error) {
      state.vehicleThumbUrls.set(captureSet.id, "");
    }
  }));

  renderVehicleList();
}

async function loadCheckInSets() {
  state.checkInSets = await fetchRecentCheckInSets(48);
  if (!state.checkInSets.some((captureSet) => captureSet.id === state.selectedCaptureSetId)) {
    state.selectedCaptureSetId = "";
  }
  renderVehicleList();
  await hydrateVehicleThumbs();
}

async function handleCheckout() {
  const selected = getSelectedCaptureSet();
  if (!selected) {
    setStatus("請先選擇一台要 Check out 的車輛。", "danger");
    return;
  }

  refs.checkoutBtn.disabled = true;
  setStatus("正在完成 Check out...", "");

  try {
    const result = await markCaptureSetServiceCompleted(selected.id);
    state.selectedCaptureSetId = "";
    await loadCheckInSets();
    setStatus(`案件 ${result.reference || selected.id} 已 Check out，之後不再出現在安裝維修保養及 Check out 頁。`, "success");
    document.querySelector(".capture-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  } finally {
    renderCheckoutButton();
  }
}

function bindEvents() {
  refs.checkoutBtn.addEventListener("click", handleCheckout);
}

async function init() {
  const user = await requireAuthenticatedPage("../index.html");
  syncCurrentUser(user);
  setStatus("正在載入已 Check-in 車輛...", "");

  try {
    await loadCheckInSets();
    setStatus(
      state.checkInSets.length
        ? "已連接 Supabase，請選擇一台車並執行 Check out。"
        : "已連接 Supabase，但暫時未有可 Check out 車輛。",
      state.checkInSets.length ? "success" : ""
    );
  } catch (error) {
    setStatus(describeSupabaseError(error), "danger");
  }

  bindEvents();
}

init();
