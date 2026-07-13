# 更新店鋪資料計劃

## 📋 概述
根據 `stores-template.csv` 更新網站店鋪資料及計算邏輯。
**狀態：✅ 已完成（2026-07-13）**

## 🔍 差異分析結果

### 店鋪變動（新增 2 間，總數 86 → 88 間）

| 變更 | Site | 店鋪 | 區域 | Class | Class2 | Size | OM | Type |
|------|------|------|------|-------|--------|----|----|------|
| ➕ 新增 | HBA7 | AIRSIDE | HK | C | C2 | XS | Hippo | M |
| ➕ 新增 | HC71 | 荃錦中心 | HK | C | C1 | L | Eva | L |

### Class / Class2 / Size 屬性更正（2 間店鋪）

| Site | 店鋪 | 修正項目 | 舊值 → 新值 |
|------|------|----------|-------------|
| HB97 | 新旺角文華 | Class2 | A2 → A1 |
| HD20 | 澳門銀河2 | Class / Class2 / Size | B / B1 / S → A / A3 / M |

### Class 變更（已在上一版本套用）

| Site | 店鋪 | 舊 Class → 新 Class |
|------|------|---------------------|
| HA40 | 新山頂 | D → C |
| HA45 | 合和商場 | D → C |
| HB87 | 西九高鐵站 | B → A |
| HB96 | 啟德 | D → C |
| HB98 | 星光行2 | B → A |
| HBA2 | 廣東道2 | B → A |
| HBA5 | 旺角中心 | B → C |
| HD16 | 澳門南灣中心 | C → B |

### Type 變更（已在上一版本套用）

| Site | 店鋪 | 舊 Type → 新 Type |
|------|------|-------------------|
| HA02 | 駱克 | M → T |
| HA32 | 皇室堡 | M → T |
| HA37 | 新信德 | M → T |
| HB66 | PopCorn | M → L |
| HB80 | 新世紀Moko | M → T |
| HB95 | 觀塘APM2 | M → L |
| HC19 | 錦薈坊 | M → L |
| HC49 | 形點 | M → L |

### OM 店鋪數量變化
- **Hippo**: 14 → 15 間（新增 HBA7 AIRSIDE）
- **Eva**: 12 → 13 間（新增 HC71 荃錦中心）
- 其他 OM 不變（Ivy 15 / Queenie 14 / Candy 13 / Violet 9 / Windy 9）

---

## 📝 實施步驟

### ✅ 步驟 1：更新 `config.js` 中 `STORES_CONFIG`
- ✅ 根據 CSV 資料更新所有 88 間店鋪的 Class、Class2、Type、OM 等屬性
- ✅ 新增 HBA7（AIRSIDE）到 Hippo 組
- ✅ 新增 HC71（荃錦中心）到 Eva 組
- ✅ 更正 HB97 Class2（A2 → A1）和 HD20 Class/Class2/Size（B/B1/S → A/A3/M）

### ✅ 步驟 2：CSV 匯入功能（`app.js` - `parseStoresCsv`）
- ✅ 已支援 `Class2` 和 `Type` 欄位的解析與驗證
- ✅ 已更新 CSV header 對應與預設索引

### ✅ 步驟 3：CSV 範本下載（`app.js` - `downloadStoresCsvTemplate`）
- ✅ 已包含 `Class 1, Class 2, Type` 欄位輸出
- ✅ 資料行包含所有 8 個欄位

### ✅ 步驟 4：localStorage 版本偵測
- ✅ 現有機制已能偵測店鋪數量及 Site 代號列表變更
- ✅ 現有商店數量（86 → 88）差異會觸發強制更新並全選

### ✅ 步驟 5：計算邏輯驗證
- ✅ Safety Stock 對照表以 Region → Class → Type → Size 四維查表
- ✅ 現有商店變動僅影響 HK 區域 C 級別店铺的 SS 分配
- ✅ 所有計算模式（mode1/mode2/mode3）已確認正常

### ✅ 步驟 6：更新 CSV 範本檔案
- ✅ `stores-template.csv` 已包含 88 間店鋪的最終資料

---

## ⚠️ 注意事項

1. **Class2 欄位**：目前不用於 Safety Stock 計算，僅為資料記錄。若未來需要用於計算，需另行設計。
2. **localStorage 相容性**：現有使用者瀏覽器中存有舊店鋪資料（86 間），系統會偵測到數量差異（88 間）並強制更新，使用者自訂的 SS 值可能需重新調整。
3. **新增店鋪影響**：HBA7 和 HC71 已加入對應 OM 團隊分配，其 Safety Stock 會按對照表自動計算。
4. **HD20 屬性變更**：澳門銀河2 由 B/B1/S 改為 A/A3/M，其 Safety Stock 查表結果會有所調整（MO 區域 A 級店鋪的 SS 較高）。
