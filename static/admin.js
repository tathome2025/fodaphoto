import { requireAuthorizedPage, getSession } from "./supabase-browser.js";

const refs = {
  currentUserEmail: document.querySelector("#currentUserEmail"),
  startThumbBtn: document.querySelector("#startThumbBtn"),
  thumbStatus: document.querySelector("#thumbStatus"),
  thumbProgress: document.querySelector("#thumbProgress"),
  thumbProgressText: document.querySelector("#thumbProgressText"),
  thumbProgressFill: document.querySelector("#thumbProgressFill"),
  thumbProgressDetail: document.querySelector("#thumbProgressDetail"),
  thumbResult: document.querySelector("#thumbResult"),
  thumbCreated: document.querySelector("#thumbCreated"),
  thumbSkipped: document.querySelector("#thumbSkipped"),
  thumbFailed: document.querySelector("#thumbFailed"),
  thumbResultMsg: document.querySelector("#thumbResultMsg"),
};

function setStatus(msg, type = "") {
  refs.thumbStatus.textContent = msg;
  refs.thumbStatus.className = "status-text" + (type ? ` is-${type}` : "");
}

async function runGenerateThumbs() {
  const session = await getSession();
  if (!session?.access_token) {
    setStatus("無法取得登入 token，請重新登入。", "danger");
    return;
  }

  refs.startThumbBtn.disabled = true;
  refs.thumbResult.hidden = true;
  refs.thumbProgress.hidden = false;
  setStatus("");

  let offset = 0;
  let total = 0;
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let done = false;

  const apiBase = window.location.origin;

  while (!done) {
    refs.thumbProgressText.textContent = total
      ? `處理中：${Math.min(offset, total)} / ${total} 張`
      : "處理中…";
    refs.thumbProgressFill.style.width = total
      ? `${Math.round((offset / total) * 100)}%`
      : "0%";

    let result;
    try {
      const resp = await fetch(`${apiBase}/api/admin/generate-thumbs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ offset, limit: 5 }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      result = await resp.json();
    } catch (err) {
      setStatus(`API 錯誤：${err.message}`, "danger");
      refs.startThumbBtn.disabled = false;
      return;
    }

    total = result.total;
    offset = result.nextOffset;
    done = result.done;
    totalCreated += result.created;
    totalSkipped += result.skipped;
    totalFailed += result.failed;

    refs.thumbProgressDetail.textContent =
      `本批：✅ ${result.created} 新增　⏭️ ${result.skipped} 跳過　❌ ${result.failed} 失敗`;
  }

  // Done
  refs.thumbProgressFill.style.width = "100%";
  refs.thumbProgressText.textContent = `完成！共處理 ${total} 張相片`;
  refs.thumbProgressDetail.textContent = "";

  refs.thumbCreated.textContent = totalCreated;
  refs.thumbSkipped.textContent = totalSkipped;
  refs.thumbFailed.textContent = totalFailed;
  refs.thumbResultMsg.textContent = totalFailed
    ? `完成，但有 ${totalFailed} 張失敗，可再次執行重試。`
    : "所有縮圖已成功生成。";
  refs.thumbResult.hidden = false;

  refs.startThumbBtn.disabled = false;
  refs.startThumbBtn.textContent = "再次執行";
}

async function init() {
  const user = await requireAuthorizedPage(["superadmin", "supreadmin"], "../index.html");
  refs.currentUserEmail.textContent = user?.email || user?.id || "-";
  setStatus("就緒。按下按鈕開始為所有舊相片生成縮圖。");
  refs.startThumbBtn.addEventListener("click", runGenerateThumbs);
}

init();
