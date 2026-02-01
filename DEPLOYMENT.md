# Safety Stock 計算器 - 部署指南

## GitHub 部署

### 第一步：準備 GitHub 倉庫

#### 創建新倉庫
1. 登錄 GitHub
2. 點擊右上角 `+` → `New repository`
3. 倉庫名稱：`safety-stock-calculator`
4. 描述：`A modern web-based Safety Stock calculator for multi-store inventory management`
5. 選擇 `Public`（方便分享）
6. 點擊 `Create repository`

#### 初始化本地 Git

```bash
# 進入項目目錄
cd "c:\Users\BestO\Dropbox\SASA\AI\Sep2025_App\New SKU Safety Stock Calculator"

# 初始化 git
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: Complete Safety Stock Calculator v1.0"

# 添加遠程倉庫（替換 USERNAME）
git remote add origin https://github.com/USERNAME/safety-stock-calculator.git

# 設置主分支
git branch -M main

# 推送到 GitHub
git push -u origin main
```

### 第二步：啟用 GitHub Pages（可選）

#### 方法1：自動部署
1. 進入 GitHub 倉庫設置
2. 找到「Pages」選項
3. 在「Build and deployment」中選擇：
   - Source: `Deploy from a branch`
   - Branch: `main` `/root`
4. 保存

#### 方法2：自定義域名
1. 點擊「Pages」
2. 在「Custom domain」輸入你的域名
3. 在你的域名提供商配置 CNAME 記錄

#### 訪問應用
部署後可通過以下URL訪問：
- `https://USERNAME.github.io/safety-stock-calculator/`

### 第三步：版本控制最佳實踐

#### 日常工作流程
```bash
# 創建新分支進行開發
git checkout -b feature/new-feature

# 做出更改並提交
git add .
git commit -m "描述你的更改"

# 推送到 GitHub
git push origin feature/new-feature

# 在 GitHub 上創建 Pull Request (PR)
# 等待審核後合並到 main 分支
```

#### 發佈新版本
```bash
# 確保所有更改已提交
git status

# 標記新版本
git tag v1.1.0
git push origin v1.1.0

# 更新 CHANGELOG.md
# 更新 package.json 中的版本號
```

---

## 本地部署

### 方法1：直接打開（最簡單）
```bash
# Windows
explorer index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

### 方法2：使用 Python 伺服器
```bash
cd /path/to/safety-stock-calculator

# Python 3.x
python -m http.server 8000

# 訪問 http://localhost:8000
```

### 方法3：使用 Node.js
```bash
cd /path/to/safety-stock-calculator

# 全局安裝 http-server
npm install -g http-server

# 啟動伺服器
http-server

# 訪問 http://localhost:8080
```

---

## 環境配置

### 配置店鋪名單

編輯 `config.js` 中的 `STORES_CONFIG`：

```javascript
const STORES_CONFIG = {
    stores: [
        { name: "店鋪名", "size": "M", "level": "A" },
        // 添加更多店鋪
    ]
};
```

### 配置計算參數

編輯 `config.js` 中的 `SAFETY_STOCK_PARAMETERS`：

```javascript
const SAFETY_STOCK_PARAMETERS = {
    parameters: [
        {
            id: "lead_time",
            name: "前置時間",
            value: 14,  // 調整預設值
            // 其他配置
        },
        // 添加或修改參數
    ]
};
```

---

## 自動化部署

### 使用 GitHub Actions（持續集成）

創建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: .
```

### 使用 Netlify（持續部署）

1. 登錄 Netlify
2. 點擊「New site from Git」
3. 連接 GitHub 倉庫
4. 選擇 `main` 分支
5. 自動部署每次推送

**Netlify URL**：`https://your-app.netlify.app`

---

## 安全檢查清單

部署前請檢查：

- [ ] 移除敏感信息（API 密鑰等）
- [ ] 測試所有功能
- [ ] 驗證 JSON 格式正確
- [ ] 檢查 CSV 導出功能
- [ ] 測試不同瀏覽器兼容性
- [ ] 清理代碼和移除調試語句
- [ ] 更新版本號
- [ ] 更新 CHANGELOG.md
- [ ] 測試配置導入/導出

---

## 性能優化

### 文件大小
```
index.html    ~ 5 KB
styles.css    ~ 15 KB
app.js        ~ 20 KB
config.js     ~ 3 KB
advanced.js   ~ 10 KB
總計：       ~ 53 KB
```

### 優化建議

1. **壓縮 CSS/JS**
   ```bash
   # 使用 UglifyJS 或 Terser
   terser app.js -o app.min.js
   ```

2. **使用 CDN**
   - 如果添加了第三方庫，使用 CDN 加速

3. **緩存策略**
   - 設置適當的 HTTP 緩存頭

---

## 備份和恢復

### 備份計劃

每週備份：
```bash
# 創建備份目錄
mkdir backups

# 備份整個項目
cp -r . backups/backup-$(date +%Y%m%d).bak

# 備份到雲盤（Dropbox/OneDrive）
```

### 恢復程序

```bash
# 從備份恢復
cp -r backups/backup-20260131.bak/* .

# 如果使用 Git
git revert <commit-hash>
```

---

## 故障排除

### 問題1：頁面無法加載

**檢查清單：**
- [ ] 確保所有文件在同一目錄
- [ ] 檢查文件名大小寫是否正確
- [ ] 清除瀏覽器緩存（Ctrl+F5）
- [ ] 檢查瀏覽器控制台錯誤（F12）

### 問題2：計算結果不正確

**調試步驟：**
1. 打開瀏覽器開發者工具（F12）
2. 進入 Console 標籤
3. 查看是否有 JavaScript 錯誤
4. 檢查計算參數是否正確

### 問題3：無法導出文件

**常見原因：**
- 瀏覽器禁用了下載
- 彈出窗口被攔截
- 磁盤空間不足

**解決方案：**
- 檢查瀏覽器設置
- 允許彈出窗口
- 關閉彈出攔截器

---

## 監控和維護

### 定期檢查

每月檢查項目：
- [ ] 測試所有功能
- [ ] 檢查是否有新的瀏覽器兼容性問題
- [ ] 更新店鋪名單
- [ ] 備份數據

### 更新計劃

**安全更新**：立即應用
**功能更新**：計劃集中發佈（如月底）
**文檔更新**：與代碼更新同步

---

## 擴展功能建議

### 短期（1-3月）
- [ ] 添加圖表可視化
- [ ] 實現深色主題
- [ ] 多語言支持

### 中期（3-6月）
- [ ] 數據持久化到云端
- [ ] 用戶帳戶系統
- [ ] 團隊協作功能

### 長期（6-12月）
- [ ] 移動應用版本
- [ ] 預測分析功能
- [ ] 與 ERP 系統集成

---

## 聯繫和支持

### 獲得幫助

1. 查看文檔
   - README.md
   - QUICK_START.md
   - GUIDE.md

2. 提交 Issue
   - 在 GitHub 上提交
   - 說明問題和復現步驟

3. 提交 PR
   - 開源貢獻歡迎！
   - 按照代碼風格進行修改

---

## 許可證

MIT License - 可自由使用、修改和分發

---

## 版本歷史

**v1.0.0** (2026-01-31)
- 首個完整發佈版本
- 包含所有核心功能

---

**祝部署順利！** 🚀

最後更新：2026年1月31日
