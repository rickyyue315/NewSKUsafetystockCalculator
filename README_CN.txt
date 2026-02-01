## 🎉 Safety Stock 計算器（繁體中文簡要）

這個檔案為項目快速說明，內容已與 `README.md` 同步。主要提醒：

- 本專案為純前端應用，無伺服器端邏輯；
- 主要業務資料與參數集中於 `config.js`（優先在該檔調整店鋪或對照表）；
- 可直接打開 `index.html` 或以靜態伺服器啟動（例如 `python -m http.server`）。

### 立即開始（快速指引）

1. 在瀏覽器中打開 [index.html](index.html)；或在專案根目錄啟動靜態伺服器：

```bash
python -m http.server 8000
```

2. 訪問 `http://localhost:8000`，操作流程：
	- 選擇店鋪 → 調整參數（或使用權重產生矩陣）→ 點擊「計算」→ 匯出結果

### 重要檔案

- `config.js`：門店清單 `STORES_CONFIG`、對照表 `SAFETY_STOCK_MATRIX`、權重 `WEIGHT_CONFIG` 與 `WEIGHT_TEMPLATES`；
- `app.js`：應用邏輯、主題、inline edit、匯出/匯入、localStorage 儲存；
- `stores-template.csv`：店鋪批量匯入模板；
- `README.md`：完整說明（已同步更新）。

### 小提示

- 若需調整對照表或權重，編輯 `config.js` 中的 `SAFETY_STOCK_MATRIX` 或 `WEIGHT_TEMPLATES`；
- 若要修改計算公式，搜尋 `calculateSafetyStockWithWeights` 或在 `app.js` 擴充計算流程；
- 設定與自訂值會保存在 localStorage，可匯出 JSON 做備份。

最後更新：2026年2月1日

---

如需把此文件改成更完整的中文使用手冊或翻譯成簡體，告訴我要包含哪些章節。
