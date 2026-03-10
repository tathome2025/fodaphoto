# Garage Photo Workbench

可直接部署的多頁 Vite 專案，已接入 Supabase：

- `/`
  - 登入與入口頁
- `/capture/`
  - 手機優先的拍照分類流程
- `/edit/`
  - 桌面優先的日曆 / 列表 / 批量 filter / 批量下載
- `/edit/detail.html`
  - 單張相片進階調色與另存 filter

## 技術選型

- 前端：Vanilla JS + Vite 多頁專案
- 認證：Supabase Auth（Email / Password）
- 資料庫：Supabase Postgres
- 圖片儲存：Supabase Storage 私有 bucket
- 打包下載：瀏覽器端 JSZip

## 本機開發

需要 Node 20 或以上。

```bash
cd "/Users/motorsportsfoda/Desktop/test project/garage-photo-workbench"
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

見 [.env.example](/Users/motorsportsfoda/Desktop/test project/garage-photo-workbench/.env.example)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_STORAGE_BUCKET`
- `VITE_APP_TIMEZONE`

如果你只是直接用靜態伺服器開這個資料夾，而沒有經過 Vite build，則改填：

- [static/runtime-config.js](/Users/motorsportsfoda/Desktop/test project/garage-photo-workbench/static/runtime-config.js)

現在也可以直接填 `.env`，再執行：

```bash
npm run sync-config
```

腳本會把 `.env` 轉成瀏覽器可讀的 `static/runtime-config.js`。

## GitHub Pages

已加入 workflow：

- [.github/workflows/garage-photo-workbench-pages.yml](/Users/motorsportsfoda/Desktop/test project/.github/workflows/garage-photo-workbench-pages.yml)

push 到 `main` 後，GitHub Actions 會自動建置並部署 `garage-photo-workbench/dist`。

你還需要在 GitHub repo settings 裡：

1. 開啟 `Pages`
2. Source 選 `GitHub Actions`
3. 加入 repository secrets：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_STORAGE_BUCKET`
   - `VITE_APP_TIMEZONE`

## Supabase

SQL schema：

- [supabase/schema.sql](/Users/motorsportsfoda/Desktop/test project/garage-photo-workbench/supabase/schema.sql)

一步步設定說明：

- [SUPABASE_SETUP.md](/Users/motorsportsfoda/Desktop/test project/garage-photo-workbench/SUPABASE_SETUP.md)

## 目前資料流程

1. 使用者登入後進入 `/capture/`
2. 建立一個 `capture_set`
3. 原圖上傳到 `garage-originals` bucket
4. `photos` 表記錄每張車輛照與配件照
5. `/edit/` 按日期讀取 `capture_sets` + `photos`
6. 單張進階調色會把參數存進 `photo_edits`
7. 命名 filter 會存進 `filters`

## 目前限制

- 批量打包下載仍在瀏覽器端執行，大量高畫質相片會較慢
- 暫未做後台管理品牌 / 配件分類
- `updated_at` 目前未加 trigger，自動更新邏輯留待下一步
