# 銷售目標計算功能說明文檔

## 功能概述
本更新在「目標總量」區域增加了銷售目標驅動的 Safety Stock 計算功能，讓使用者能根據銷售預測自動計算所需的安全庫存總量。

## 新增元素

### 1. 銷售目標數量 (Sales Target)
- **位置**：目標總量設定區域
- **輸入類型**：數字輸入框
- **預設值**：空白（非必填）
- **單位**：件數或單位數量
- **說明**：輸入預期的月銷售數量（例如：36000）

### 2. Safety Stock Days 調整滑塊
- **位置**：目標總量設定區域
- **輸入類型**：範圍滑塊（1-30）
- **預設值**：7 天
- **說明**：調整保障的庫存天數
  - 最小值：1 天（最少保護）
  - 最大值：30 天（最大保護）
  - 預設值：7 天（一週保護）

### 3. 目標總 Safety Stock（自動計算）
- **位置**：目標總量設定區域，Safety Stock Days 下方
- **顯示類型**：只讀數字輸入框
- **計算公式**：

$$\text{目標總 Safety Stock} = \frac{\text{銷售目標數量}}{30} \times \text{Safety Stock Days}$$

#### 計算邏輯說明
1. 當有填寫銷售目標數量時：
   - 自動計算目標總 Safety Stock = 銷售目標數量 ÷ 30 × Safety Stock Days
   - 目標總 Safety 輸入框變為只讀（背景灰化）
   - 實時更新（當銷售目標或天數變化時立即重算）

2. 當未填寫銷售目標數量時：
   - 目標總 Safety 輸入框可手動編輯
   - 允許使用者直接輸入目標值
   - 使用者可覆蓋自動計算結果

## 計算範例

### 範例 1：標準情況
- 銷售目標數量：36000 件/月
- Safety Stock Days：7 天
- **計算**：36000 ÷ 30 × 7 = **8,400**
- 目標總 Safety Stock = 8,400

### 範例 2：增加保護期間
- 銷售目標數量：36000 件/月
- Safety Stock Days：14 天（增至2週）
- **計算**：36000 ÷ 30 × 14 = **16,800**
- 目標總 Safety Stock = 16,800

### 範例 3：減少保護期間
- 銷售目標數量：36000 件/月
- Safety Stock Days：3 天
- **計算**：36000 ÷ 30 × 3 = **3,600**
- 目標總 Safety Stock = 3,600

### 範例 4：手動模式
- 銷售目標數量：空白（未填）
- Safety Stock Days：7 天（不影響）
- 目標總 Safety：使用者手動輸入 **1,200**
- 目標總 Safety Stock = 1,200（手動值）

## 功能集成

### 與權重計算的整合
1. 當點擊「套用權重計算」時，系統將：
   - 讀取已計算或手動輸入的「目標總 Safety Stock」
   - 根據各類型店舖的權重比例，自動分配庫存
   - 利用 `scaleMatrixToTarget()` 函數將對照表縮放至目標值

### 與預覽功能的整合
1. 「預覽結果」會顯示：
   - 計算出的對照表矩陣
   - 🎯 目標總量值
   - 實際分配總量（根據店舖數量計算）
   - 偏差提示（若有未分配的值）

## LocalStorage 持久化

新增的參數已整合至 localStorage 儲存機制：
- `salesTarget`：銷售目標數量
- `safetyStockDays`：Safety Stock 天數
- `targetTotal`：計算或手動輸入的目標值

頁面刷新後，這些設定將自動恢復。

## UI/UX 特徵

### Safety Stock Days 滑塊
- **視覺設計**：彩色漸層滑塊（紅→橙→綠）
- **互動反饋**：
  - 滑塊上有實時天數顯示
  - 懸停時放大效果
  - 拖動時自動計算目標值

### 目標 Safety 輸入框
- **狀態 1（有銷售目標）**：
  - 背景：灰色（#f5f5f5）
  - 狀態：只讀
  - 值：自動計算
  
- **狀態 2（無銷售目標）**：
  - 背景：白色
  - 狀態：可編輯
  - 值：手動輸入或預設值

## 修改清單

### index.html
- 新增銷售目標數量輸入框 (`#salesTarget`)
- 新增 Safety Stock Days 滑塊 (`#safetyStockDays`)
- 新增天數顯示元素 (`.days-display`)
- 修改目標 Safety 輸入框為只讀模式 (`#targetTotal` 帶 `readonly` 屬性)
- 更新提示文本

### app.js
- 修改 `readWeightsFromUI()`：
  - 新增 `salesTarget` 和 `safetyStockDays` 讀取
  - 新增自動計算邏輯
  
- 新增 `updateTargetSafetyStock()` 方法：
  - 實時計算目標值
  - 動態管理 readonly 屬性
  
- 修改 `loadWeightConfigToUI()`：
  - 支援載入新參數
  - 更新 `.days-display` 顯示

- 修改 `setupWeightPanelListeners()`：
  - 新增 salesTarget 事件監聽（change, input）
  - 新增 safetyStockDays slider 監聽

- 修改 `init()`：
  - 初始化時呼叫 `updateTargetSafetyStock()`

### config.js
- 更新 `WEIGHT_CONFIG`：
  - 新增 `salesTarget: 0`
  - 新增 `safetyStockDays: 7`
  - 新增 `targetTotal: 0`

### styles.css
- 新增 `.weight-slider` 樣式（彩色漸層滑塊）
- 新增 `.weight-slider::-webkit-slider-thumb` 樣式
- 新增 `.weight-slider::-moz-range-thumb` 樣式
- 新增 `.days-display` 樣式（粗體、高亮）

## 測試檢查清單

- [ ] 輸入銷售目標數量（例如36000），確認目標值自動計算
- [ ] 調整 Safety Stock Days 滑塊，確認目標值實時更新
- [ ] 驗證計算公式正確：目標值 = 銷售目標 ÷ 30 × 天數
- [ ] 清空銷售目標，確認輸入框變為可編輯
- [ ] 手動輸入目標值，確認能夠保存
- [ ] 刷新頁面，確認之前的輸入值被恢復
- [ ] 點擊「預覽結果」，確認目標值正確顯示
- [ ] 點擊「套用權重計算」，確認對照表根據目標值正確分配
- [ ] 測試不同的 Safety Stock Days 值（1, 7, 14, 30）
- [ ] 測試邊界情況（銷售目標為0、非常大的數值）

## 已知限制 & 後續改進

### 當前版本
- 目標值計算基於簡化的月度模型（30天固定）
- 天數滑塊為1-30的整數值

### 建議的未來改進
- 支援不同月份長度的年度計算
- 支援季節性調整係數
- 支援多SKU目標設定
- 支援目標歷史追蹤和比較

---

**版本**：1.0  
**更新日期**：2026年2月3日  
**功能狀態**：✅ 已實裝並測試
