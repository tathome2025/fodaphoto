# Supabase 一步步設定

以下流程是按這個專案目前的實作寫的。

## 1. 建立 Supabase Project

1. 到 Supabase Dashboard 建立新 project
2. 記下兩個值：
   - `Project URL`
   - `Publishable key`

它們稍後會放進 `.env` 或 GitHub Secrets。

## 2. 執行 SQL Schema

1. 打開 Supabase Dashboard
2. 進入 `SQL Editor`
3. 新增一個 query
4. 把 [schema.sql](/Users/motorsportsfoda/Desktop/test project/garage-photo-workbench/supabase/schema.sql) 全部貼上
5. 按 `Run`

這一步會建立：

- `brands`
- `service_items`
- `capture_sets`
- `photos`
- `filters`
- `photo_edits`
- `garage-originals` storage bucket
- 所有 RLS policy

## 3. 建立第一個登入帳號

最簡單做法：

1. 進入 `Authentication`
2. 打開 `Users`
3. 按 `Add user`
4. 輸入 Email 和 Password
5. 建立完成後，用這組帳號登入本專案首頁

這樣不需要另外做公開註冊。

## 4. 檢查 Storage Bucket

1. 進入 `Storage`
2. 應該會看到 `garage-originals`
3. Bucket 應是 `Private`

如果不是 private，改回 private。這個專案是靠 signed URL 和 storage RLS 讀圖。

## 5. 本機 `.env`

在專案根目錄 `garage-photo-workbench/` 建立 `.env`：

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_STORAGE_BUCKET=garage-originals
VITE_APP_TIMEZONE=Asia/Hong_Kong
```

參考樣板：

- [.env.example](/Users/motorsportsfoda/Desktop/test project/garage-photo-workbench/.env.example)

如果你不是用 `npm run dev` / `vite build`，而是直接用靜態伺服器打開這個資料夾，請改填：

- [static/runtime-config.js](/Users/motorsportsfoda/Desktop/test project/garage-photo-workbench/static/runtime-config.js)

現在也可直接執行：

```bash
npm run sync-config
```

它會把 `.env` 或目前 shell 的環境變數同步到：

- [static/runtime-config.js](/Users/motorsportsfoda/Desktop/test project/garage-photo-workbench/static/runtime-config.js)

## 6. 本機測試

```bash
cd "/Users/motorsportsfoda/Desktop/test project/garage-photo-workbench"
npm install
npm run dev
```

測試順序：

1. 開首頁登入
2. 去 `/capture/` 建立一組案件
3. 去 Supabase `Table Editor` 檢查：
   - `capture_sets`
   - `photos`
4. 去 Supabase `Storage` 檢查是否已有圖片
5. 去 `/edit/` 看該日期是否出現
6. 進入單張 detail 頁另存一個 filter
7. 回 `/edit/` 測試批量套 filter 和下載 zip

## 7. GitHub Secrets

如果你用 GitHub Pages workflow 部署，去 repo 的 `Settings -> Secrets and variables -> Actions` 加入：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_STORAGE_BUCKET`
- `VITE_APP_TIMEZONE`

建議值：

- `VITE_SUPABASE_STORAGE_BUCKET=garage-originals`
- `VITE_APP_TIMEZONE=Asia/Hong_Kong`

## 8. 開啟 GitHub Pages

1. GitHub repo -> `Settings`
2. `Pages`
3. Source 選 `GitHub Actions`
4. push 到 `main`
5. 等 workflow：
   - [.github/workflows/garage-photo-workbench-pages.yml](/Users/motorsportsfoda/Desktop/test project/.github/workflows/garage-photo-workbench-pages.yml)

## 8.1 Deploy Edge Function

如果你要使用 `superadmin` 的「用戶管理」頁，還要另外部署這個 Supabase Edge Function：

```bash
supabase functions deploy user-admin
```

部署前請先確保你已經：

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

這個 function 會使用 Supabase 內建的：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

來安全地執行：

- 列出用戶
- 建立用戶
- 更新群組
- 刪除用戶

## 9. 上線後第一輪檢查

部署完成後，實際驗證：

1. 首頁能登入
2. `/capture/` 可上傳並成功寫入 DB + Storage
3. `/edit/` 日曆能看到有資料的日期
4. detail 頁可儲存 filter
5. 批量下載 zip 能產生正確 folder 名稱

## 10. 常見錯誤對照

- `尚未設定 Supabase URL 或 Publishable Key`
  - `.env` 或 GitHub Secrets 未填好
- 登入成功但上傳失敗
  - 通常是 `schema.sql` 未完整執行，或 storage policy 未建立
- brands / service items 讀不到
  - `schema.sql` 未跑成功，seed data 未寫入
- 圖片讀不到
  - bucket 不是 private / signed URL 出錯 / storage policy 未建立

## 11. 下一步建議

如果這版跑通，下一步最值得補的是：

1. `updated_at` trigger
2. 後台管理品牌與配件分類
3. 用 Edge Function 做 server-side zip 與批量輸出
4. 更完整的 Lightroom 式調色控制
