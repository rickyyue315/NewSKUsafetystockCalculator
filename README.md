# Safety Stock 計算器 🏪📊

一個純前端（無後端）的 Safety Stock 計算工具。以 `config.js` 為單一真實來源（店鋪清單、對照表與權重），在瀏覽器中執行所有計算、匯入/匯出與設定存取（localStorage）。

**重點更新**：本 README 已同步 `app.js` / `config.js` 的目前命名與邏輯（例如：`STORES_CONFIG`、`SAFETY_STOCK_MATRIX`、`WEIGHT_CONFIG`、`generateMatrixWithWeights()` 等）。

## 主要功能

- 店鋪管理：多條件篩選、全選/反選、逐店編輯 Safety Stock 值（inline edit）
- Safety Stock 對照表：由 `SAFETY_STOCK_MATRIX` 提供，並支援用權重產生（`generateMatrixWithWeights`）
- 權重模板：`WEIGHT_TEMPLATES` 與 `WEIGHT_CONFIG` 支援快速重算矩陣
- 主題系統：多種配色主題與主題面板（在 UI 中切換並保存至 localStorage）
- 匯出/匯入：CSV、Excel（前端產生）與 JSON 設定匯入/匯出
- 本地儲存：使用 localStorage 保存使用者自訂值與設定
- 個別店鋪編輯：支援對單一店鋪的 Safety Stock 值進行獨立編輯
- OM 管理：支援按營運經理（OM）分組查看和管理店鋪
- 權重計算：支援基於多維度權重的 Safety Stock 計算

## 快速開始（開發 / 本地測試）

1. 下載或複製此專案到本地。
2. 直接在瀏覽器中打開 [index.html](index.html)，或啟動靜態伺服器（推薦）：

```bash
# 在專案根目錄啟動（Python)
python -m http.server 8000

# 或用 Node 開啟（若已安裝 http-server）
npx http-server
```

開啟後訪問 `http://localhost:8000`。

## 關鍵檔案與說明

- `index.html` — 主頁面與 UI 骨架
- `styles.css` — 樣式
- `app.js` — 應用程式邏輯（`SafetyStockCalculator` 類別、事件綁定、DOM 操作、匯出/匯入處理）
- `config.js` — 主要業務資料與參數（`STORES_CONFIG`, `SAFETY_STOCK_MATRIX`, `WEIGHT_CONFIG`, `WEIGHT_TEMPLATES`, 主題定義）
- `stores-template.csv` — 店鋪 CSV 模板（供批量匯入）

如需擴充或修改業務資料，請優先編輯 `config.js`。

## 核心資料結構

- 店鋪物件：`{ Site, Shop, Regional, Class, Size, OM }`（來源：`STORES_CONFIG.stores`）
- Safety Stock 查表：`SAFETY_STOCK_MATRIX[region][class][size]`
- 個別店鋪覆寫：`customStoreStock`（key = `Site`）

## 常用函式（程式內）

- `getSafetyStockValue(region, category, size)` — 從 `SAFETY_STOCK_MATRIX` 讀值
- `calculateSafetyStockWithWeights(region, category, size, weights)` — 根據權重計算單一值
- `generateMatrixWithWeights(weights)` — 使用權重產生整張對照表
- `getStoreTypeCode(region, category, size)` — 產生店鋪類型代碼
- `getStoreTypeSummary()` — 獲取店鋪類型摘要

## 使用流程（UI）

1. 選擇店鋪或使用篩選條件
2. 若需，對單店進行 inline 編輯（點店鋪的可編輯欄位）
3. 點擊 `計算`（`#calculateBtn`）生成結果
4. 匯出：`CSV`、`Excel` 或匯出設定（JSON）

## 匯入 / 匯出

- 匯入配置：使用 UI 的匯入按鈕（`#importFile`）上傳 JSON 設定
- 店鋪批量匯入：使用 `stores-template.csv` 作為模板
- 匯出：按 `匯出` 按鈕導出目前結果為 CSV 或 Excel

## 權重計算功能

本工具支援基於多維度權重的 Safety Stock 計算：

- **分類權重**：A/B/C/D 級別店鋪的不同權重
- **面積權重**：XS/S/M/L/XL 面積的不同權重
- **區域權重**：香港/澳門區域的不同權重
- **基礎值**：權重計算的基準值
- **模板系統**：預設、平衡、保守、積極等多種權重模板

權重計算公式：`Safety Stock = baseValue + (classWeight × sizeWeight × regionFactor)`

## 主題系統

提供多種配色主題供選擇：

- **莎莎粉**：品牌主題（預設）
- **企業標準**：專業藍綠色系
- **深色模式**：護眼深色主題
- **暖色調**：溫暖橙紅配色
- **高對比度**：無障礙設計
- **優雅紫**：紫色系主題
- **極簡白**：純淨簡約配色

## 個別店鋪編輯

支援對單一店鋪的 Safety Stock 值進行獨立編輯：

- 點擊店鋪列表中的 Safety Stock 值即可直接編輯
- 編輯後的值會覆蓋對照表的預設值
- 值會保存到 localStorage 以供下次使用

## OM 管理

支援按營運經理（OM）分組管理店鋪：

- 可查看特定 OM 負責的所有店鋪
- 提供 OM 層級的統計和分析
- 支援按 OM 分組的彙總報表

## 開發注意事項

- 業務資料（店鋪、對照表、權重）集中在 `config.js`。優先修改此檔以避免 UI 與邏輯不同步。
- 所有狀態存於前端（記憶體或 localStorage），此專案不含後端。
- 若要修改計算邏輯，請搜尋 `calculateSafetyStockWithWeights` 或在 `app.js` 中擴充計算流程。

## 版本與變更

- v1.0 (2026-01-31) — 初始上線
- v1.1 (2026-02-02) — 新增權重計算、主題系統、個別店鋪編輯、OM管理等功能

最後更新：2026年2月2日

## 授權

MIT License — 見 LICENSE

---

若要我同時建立一段更完整的「變更紀錄摘要」或更新 `QUICK_START.md`，告訴我要包含的細節。謝謝！

## 貢獻與 GitHub 指導

歡迎貢獻此專案！請先閱讀專案根目錄的 `CONTRIBUTING.md`，其中包含：

- 分支策略與命名規則（feature/*, fix/*, hotfix/*）
- Pull Request（PR）準備清單與範例描述
- Issue 分類與標籤建議
- 代碼風格與提交訊息建議（簡短前綴 + 描述）

本專案也包含 GitHub 模板：`.github/PULL_REQUEST_TEMPLATE.md`、`.github/ISSUE_TEMPLATE/`，請在建立 PR / Issue 時使用以加速審閱。
