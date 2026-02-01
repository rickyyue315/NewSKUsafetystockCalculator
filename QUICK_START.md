# Quick Start 快速開始

快速啟動與常見操作（已與 `README.md` 同步）。建議以靜態伺服器方式運行以完整支援匯出/匯入功能。

## 方法1：直接打開（最簡單）

在檔案總管或 Finder 中雙擊 `index.html` 即可，用本機瀏覽器開啟。這適合快速檢視 UI，但若要測試檔案匯入/下載，建議用靜態伺服器。

## 方法2：使用 Python 靜態伺服器（推薦）

```bash
# 在專案根目錄啟動（合適於 Windows/macOS/Linux）
python -m http.server 8000

# 開啟瀏覽器並訪問
http://localhost:8000
```

## 方法3：使用 Node.js http-server

```bash
# 若尚未安裝 http-server
npm install -g http-server

# 啟動伺服器（在專案根目錄）
http-server

# 開啟瀏覽器（預設 http://localhost:8080）
```

## 首次使用（快速流程）

1. 選擇或篩選店鋪（支援按 `Regional`, `Class`, `Size` 篩選）
2. 若需，對個別店鋪做 inline 編輯（點選可編輯欄位）
3. 點擊 `計算`（按鈕 id: `calculateBtn`）
4. 檢視結果，並可使用 `匯出 CSV` / `匯出 Excel` / 匯出設定（JSON）功能

## 常見任務

- 匯入配置：使用 UI 的 `匯入`（file input id: `importFile`）上傳 JSON 配置
- 店鋪批量匯入：使用 `stores-template.csv` 作為模板，再透過 UI 上載
- 編輯對照表或權重：請先修改 `config.js` 中的 `SAFETY_STOCK_MATRIX` 或 `WEIGHT_TEMPLATES`

## 故障排查

- 空白頁或控制台錯誤：確認 `index.html`, `app.js`, `config.js`, `styles.css` 在同一目錄並重新整理
- 計算結果為 0：確認已選店鋪、對照表 `SAFETY_STOCK_MATRIX` 中有對應值或是否有自訂 `customStoreStock`
- 匯出/下載問題：在瀏覽器允許下載並關閉彈窗阻擋

## 技術資訊

- 主要檔案：`index.html`, `app.js`, `config.js`, `styles.css`
- 主要變數/結構：`STORES_CONFIG`, `SAFETY_STOCK_MATRIX`, `WEIGHT_CONFIG`, `customStoreStock`
- 完全前端：所有計算與檔案操作在瀏覽器內執行

## 下一步

- 詳細操作與範例請見 [README.md](README.md)
- 如需我同步更新 `GUIDE.md` 或 `DEPLOYMENT.md`，請告訴我要加入的內容

最後更新：2026年2月1日
