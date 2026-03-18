# Vercel 部署指引（含 AI API）

## 1. 先確認專案內容

此專案已包含：

- `vercel.json`
- `api/health.js`
- `api/ai/chat.js`
- `package.json` 的 `build:vercel` script

## 2. 在 Vercel 匯入 GitHub 專案

1. 到 Vercel Dashboard 建立新專案（Import Git Repository）
2. 選擇 `tathome2025/fodaphoto`
3. Framework Preset 可用 `Vite` 或 `Other`（都可）

## 3. Build 設定

專案已在 `vercel.json` 固定：

- Build Command：`npm run build:vercel`
- Output Directory：`dist`
- Functions：`api/**/*.js`（runtime 由 Vercel 自動處理）

通常可不用手動再改。

## 4. Environment Variables（最重要）

在 Vercel Project Settings > Environment Variables 新增：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_STORAGE_BUCKET`
- `VITE_APP_TIMEZONE`
- `OPENAI_API_KEY`（只放在 Vercel，不能寫到前端）
- `OPENAI_MODEL`（可選，建議先 `gpt-4o-mini`）

建議先在 `Preview` + `Production` 都設定。

## 5. Deploy 後驗證

部署成功後測試：

- `GET /api/health`
  - 應回傳 `{ ok: true, ... }`
- `POST /api/ai/chat`
  - Header：`Content-Type: application/json`
  - Body 範例：

```json
{
  "messages": [
    { "role": "system", "content": "你是維修工場助手。" },
    { "role": "user", "content": "請列出今日工作重點。" }
  ]
}
```

若缺少 `OPENAI_API_KEY`，API 會回傳 500 並提示缺少環境變數。

## 6. 前端呼叫方式（之後接 AI）

前端請直接呼叫同網域路徑：

- `fetch("/api/ai/chat", { method: "POST", ... })`

不要在前端直接使用 OpenAI API Key。

## 7. 常見問題

- 部署成功但頁面 404：
  - 先確認是否用 Vercel 網址（不是 GitHub Pages 網址）
- API 回 `Invalid JWT`：
  - 這是 Supabase token / session 問題，與 Vercel runtime 本身無關
- `Edge Function returned non-2xx`：
  - 先看 Vercel Function Logs，再看 Supabase Edge Function logs，分開排查
