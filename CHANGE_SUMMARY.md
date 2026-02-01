# 變更摘要（Summary of Changes）

更新日期：2026-02-01

本次變更重點：

- 同步文件到目前程式邏輯：更新 `README.md`、`README_CN.txt` 與 `QUICK_START.md`，內容已反映 `app.js` 與 `config.js` 中的命名、函式與執行流程。
- README 中補充並標示關鍵變數與函式：`STORES_CONFIG`、`SAFETY_STOCK_MATRIX`、`WEIGHT_CONFIG`、`generateMatrixWithWeights()`、`calculateSafetyStockWithWeights()`、`customStoreStock`。
- QUICK_START.md 已簡化啟動步驟，推薦使用靜態伺服器（`python -m http.server` / `http-server`），並標示關鍵 UI 元素的 id（如 `calculateBtn`, `importFile`）。
- README_CN.txt 已精簡為快速指引並與主 README 保持一致。

建議的下一步：

1. 若需要，將 `GUIDE.md` 與 `DEPLOYMENT.md` 中的詳細部署與開發流程同步更新，加入範例命令與 troubleshooting 範例。
2. 若欲釋出新版本，請在 `CHANGELOG.md` 中附上本次摘要並標註版本號。

若你要我自動將本摘要合併到 `CHANGELOG.md` 或產生一個 PR 描述，我可以幫你完成。