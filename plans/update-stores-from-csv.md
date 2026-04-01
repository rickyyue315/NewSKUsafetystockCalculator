# 更新店鋪資料計劃

## 📋 概述
根據 `stores-template.csv` 更新網站店鋪資料及計算邏輯。

## 🔍 差異分析結果

### 店鋪變動（1增1減，總數維持 86 間）

| 變更 | Site | 店鋪 | 區域 | Class | Size | OM | Type |
|------|------|------|------|-------|------|----|------|
| ➕ 新增 | HC70 | 青衣2 | HK | C | L | Candy | L |
| ➖ 移除 | HB56 | 旺角160 | HK | B | M | Eva | T |

### Class 變更（8 間店鋪）

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

### Type 變更（8 間店鋪）

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

### 新欄位：Class 2
CSV 新增了 `Class 2` 子分類欄位（A1, A2, A3, B1, B2, C1, C2, D1），目前系統中不存在。

### OM 店鋪數量變化
- **Candy**: 13 → 14 間（新增 HC70 青衣2）
- **Eva**: 13 → 12 間（移除 HB56 旺角160）
- 其他 OM 不變

---

## 📝 實施步驟

### 步驟 1：更新 `config.js` 中 `STORES_CONFIG`
- 根據 CSV 資料更新所有 86 間店鋪的 Class、Type、OM 等屬性
- 新增 HC70（青衣2）到 Candy 組
- 移除 HB56（旺角160）從 Eva 組
- 更新所有 Class 和 Type 變更
- 新增 `Class2` 欄位到每間店鋪物件

### 步驟 2：更新 CSV 匯入功能（`app.js` - `parseStoresCsv`）
- 在 `headerAliases` 中新增 `Class2` 和 `Type` 的別名映射
- 更新 `fixedIndex` 以包含新欄位的預設索引
- 在解析邏輯中讀取 `Class2` 和 `Type` 值
- 更新 CSV 驗證邏輯

### 步驟 3：更新 CSV 範本下載（`app.js` - `downloadStoresCsvTemplate`）
- 更新 header 行加入 `Class1,Class2,Type` 欄位
- 更新資料行輸出包含新欄位

### 步驟 4：確認 localStorage 版本偵測
- 現有邏輯已通過店鋪數量比對偵測變更
- 店鋪數量維持 86 間不變，需加入更精細的版本偵測機制
- 建議加入資料版本號或檢查具體店鋪屬性變更

### 步驟 5：驗證計算邏輯
- Safety Stock 計算使用 `Region → Class → Type → Size` 四維查表
- Class 和 Type 變更會直接影響查表結果
- 確認 `SAFETY_STOCK_MATRIX` 對照表不需調整
- 確認所有計算模式（mode1/mode2/mode3）正常運作

### 步驟 6：更新 CSV 範本檔案
- 用新的 CSV 內容替換 `stores-template.csv`

---

## ⚠️ 注意事項

1. **Class2 欄位**：目前不用於 Safety Stock 計算，僅為資料記錄。若未來需要用於計算，需另行設計。
2. **localStorage 相容性**：現有使用者的瀏覽器中存有舊店鋪資料，需確保版本偵測能正確觸發更新。
3. **HB56 移除**：若有使用者自訂了 HB56 的 Safety Stock 值，更新後該自訂值將失效。
4. **Class 變更影響**：8 間店鋪的 Class 變更會直接改變其 Safety Stock 查表結果。
