# FODA工作流程

可直接部署的多頁 Vite 專案，已接入 Supabase：

- `/`
  - 登入與入口頁
- `/checkin/`
  - 建立車輛 Check-in 案件，拍車輛照、選品牌和輸入車型
- `/capture/`
  - 安裝維修保養流程，從已 Check-in 車輛中選車後追加服務資料
- `/records/`
  - 以日曆查看每日處理紀錄、負責帳號與相片
- `/edit/`
  - 桌面優先的日曆 / 列表 / 批量 filter / 批量下載
- `/edit/detail.html`
  - 單張相片進階調色與另存 filter
- `/api/health`
  - Vercel serverless 健康檢查
- `/api/ai/chat`
  - 後端代理 OpenAI Chat Completions，供日後 AI 功能使用

## 技術選型

- 前端：Vanilla JS + Vite 多頁專案
- 認證：Supabase Auth（Email / Password）
- 資料庫：Supabase Postgres
- 圖片儲存：Supabase Storage 私有 bucket
- 打包下載：瀏覽器端 JSZip

## 本機開發

需要 Node 20 或以上。

```bash
cd "/Users/TY/Downloads/fodaphoto-repo"
npm install
cp .env.example .env
npm run dev
```

如果你改完 `.env` 後想立即同步到靜態版設定檔，也可以單獨執行：

```bash
npm run sync-config
```

## 建置

```bash
npm run build
```

輸出目錄為：

- `dist/`

## 環境變數

見 `.env.example`

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_STORAGE_BUCKET`
- `VITE_APP_TIMEZONE`
- `OPENAI_API_KEY`（只放在 Vercel，不可放到前端）
- `OPENAI_MODEL`（可選，預設 `gpt-4o-mini`）

如果你只是直接用靜態伺服器開這個資料夾，而沒有經過 Vite build，則改填：

- `static/runtime-config.js`

現在也可以直接填 `.env`，再執行：

```bash
npm run sync-config
```

腳本會把 `.env` 轉成瀏覽器可讀的 `static/runtime-config.js`。

## GitHub Pages

已加入 workflow：

- `.github/workflows/garage-photo-workbench-pages.yml`

push 到 `main` 後，GitHub Actions 會自動建置並部署 `garage-photo-workbench/dist`。

你還需要在 GitHub repo settings 裡：

1. 開啟 `Pages`
2. Source 選 `GitHub Actions`
3. 加入 repository secrets：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_STORAGE_BUCKET`
   - `VITE_APP_TIMEZONE`

## Vercel 部署（含 AI API 準備）

專案已加入 `vercel.json` 與 `api/*` serverless routes。

- Build command：`npm run build:vercel`
- Output directory：`dist`
- Runtime：Node.js 20（for `api/**/*.js`）

部署詳細步驟見：

- `VERCEL_SETUP.md`

## Supabase

SQL schema：

- `supabase/schema.sql`

一步步設定說明：

- `SUPABASE_SETUP.md`

## 目前資料流程

1. 使用者登入後可先進入 `/checkin/` 建立車輛案件
2. `capture_set` 先記錄品牌、車型與車輛照
3. `/capture/` 從已 Check-in 車輛中選車，再追加安裝維修保養相片與項目
4. 原圖上傳到 `garage-originals` bucket
5. `photos` 表記錄車輛照與服務相片
6. `/edit/` 按日期讀取 `capture_sets` + `photos`
7. 單張進階調色會把參數存進 `photo_edits`
8. 命名 filter 會存進 `filters`

## 目前限制

- 批量打包下載仍在瀏覽器端執行，大量高畫質相片會較慢
- 品牌 / 服務項目目前由前台用戶直接新增到共用資料庫
- `updated_at` 目前未加 trigger，自動更新邏輯留待下一步
