# Contributing

感謝你想為本專案貢獻！請在提交 PR 或 Issue 前閱讀下列要點。

## 分支策略

- `main`：穩定的發佈分支
- `develop`（可選）：整合分支
- 功能分支：`feature/your-feature-name`
- Bug 修復：`fix/short-description`

## 提交準則

- 每次 commit 應聚焦單一變更
- Commit 訊息格式建議：`<type>(scope): short description`
  - 例：`feat(config): add weight template for MO region`
  - type 可為 `feat`, `fix`, `docs`, `chore`, `refactor`, `test`

## Pull Request（PR）

建立 PR 前請：

1. 將變更推到 feature 分支
2. 確保本地已執行並測試主要流程（開啟 index.html 或使用本地伺服器）
3. 更新 `CHANGELOG.md`（如為功能或重要修正）
4. 在 PR 描述中包含：變更摘要、測試步驟、關聯 Issue（如有）

PR 審核清單（維護者/審查者）：

- [ ] 變更描述清楚
- [ ] 無明顯錯誤或未處理的 console.log
- [ ] 文件（README/QUICK_START）已同步（如必要）
- [ ] 若涉及資料結構變更，已更新 `config.js` 範例與說明

## Issue 模板

請在建立 Issue 時包含可重現問題的步驟、期望結果與實際結果，並提供瀏覽器/環境資訊。

## 代碼風格

- 使用一致的縮排（2 或 4 spaces，專案內以原 style 為準）
- JavaScript 檔案請避免使用全域變數污染

## 版控與發佈

- 發佈前請更新 `CHANGELOG.md` 並標記新版本（tag）
- PR 合併後由發佈維護者或自動化 CI 發佈

若有任何疑問，歡迎在 Issue 中討論或直接開 PR。謝謝你的貢獻！
