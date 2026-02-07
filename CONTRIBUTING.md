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

## GitHub 模板與流程提示

本專案包含 GitHub 模板：`.github/PULL_REQUEST_TEMPLATE.md`、`.github/ISSUE_TEMPLATE/`。在建立 PR 或 Issue 時，GitHub 會自動套用對應模板，請依模板填寫測試步驟、相關 Issue 與變更描述，會加速審查流程。

最後更新：2026年2月8日

## 安全與密碼管理（重要）

請勿在任何公開檔案或提交（commit）中硬編碼密碼、API 金鑰或其他敏感憑證。以下為安全管理建議：

- 永遠不要將密碼放入 `config.js`、`app.js` 或任何會被版本控制的檔案中。
- 本地開發：可使用 `.env` 檔案來存放開發環境變數，並在 `.gitignore` 中排除該檔案；設定檔案權限（例如 `chmod 600 .env`）。
- CI/CD：在 GitHub Actions 等 CI 中使用 Repository Secrets（Settings → Secrets）來存放敏感資料，工作流程中透過 `${{ secrets.NAME }}` 讀取；不要在日誌中列印 secrets。
- 生產環境：使用專業的秘密管理解決方案（例如 GitHub Secrets、Azure Key Vault、AWS Secrets Manager、HashiCorp Vault、Zeabur secrets），並限制存取權限與啟用輪替（rotation）。
- 純前端應用限制：前端程式碼可被用戶端檢視，請避免在前端暴露任何管理密碼。若需要保護管理操作，應透過後端服務或受保護的 API 層來驗證並產生短期令牌（token）。
- 審計與輪替：定期輪替憑證、啟用最小權限原則（least privilege）並啟用多因素驗證（MFA）於管理帳號。

若需要協助將硬編碼密碼改為安全的讀取方式（例如改為從 CI secrets / 環境變數讀取或改用後端 auth），我可以幫你進行程式範例更改與 workflow 範例。
