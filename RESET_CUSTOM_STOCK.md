# 🔄 重設自訂 Safety Stock 值功能説明

## 功能概述

新增了「重設自訂值」功能按鍵，允許使用者快速重設已選定店鋪的自訂 Safety Stock 數值，並恢復為對照表中的預設值。

## 使用步驟

### 1. 選擇要重設的店鋪
在「選擇店鋪」區域，使用以下方式選擇店鋪：
- **全選**：選擇所有店鋪
- **取消全選**：取消所有選擇
- **反向選擇**：反轉當前選擇
- **篩選按鈕**：按區域、舖類、貨場面積、店鋪組別等篩選後選擇

### 2. 點擊「🔄 重設自訂值」按鍵
- 位置：店鋪選擇區域的最右邊（在「取消篩選」按鍵之後）
- 顏色：橙色（warning 風格）
- 圖標：🔄 重設自訂值

### 3. 確認重設
- 系統會顯示確認對話框，列出要重設的店鋪清單
- 用户點擊「確定」後，系統會：
  - 清除這些店鋪的自訂 Safety Stock 值
  - 恢復使用對照表（Safety Stock Matrix）中的預設值
  - 自動保存到 localStorage
  - 重新渲染店鋪清單以顯示更新

### 4. 完成
系統會顯示成功訊息，確認已重設的店鋪數量。

## 技術實現細節

### 前端 HTML （index.html）
```html
<button id="resetCustomStockBtn" class="btn btn-warning" 
        title="重設所有店鋪的自訂 Safety Stock 值">
    🔄 重設自訂值
</button>
```

### JavaScript 函數 （app.js）

#### 1. 事件綁定 (setupEventListeners)
```javascript
document.getElementById('resetCustomStockBtn')?.addEventListener('click', 
    () => this.resetCustomStoreStock());
```

#### 2. 重設函數 (resetCustomStoreStock)
```javascript
resetCustomStoreStock() {
    // 檢查是否有選擇店鋪
    if (this.selectedStores.length === 0) {
        alert('⚠️ 請先選擇要重設的店鋪');
        return;
    }

    // 建立店鋪清單並顯示確認訊息
    const storeNames = this.selectedStores
        .map(idx => this.stores[idx])
        .map(s => `${s.Site} ${s.Shop}`)
        .join('\n');

    const confirmMsg = `確認要重設以下 ${this.selectedStores.length} 間店鋪的自訂 Safety Stock 值？\n\n${storeNames}\n\n系統將恢復使用對照表中的數值。`;

    if (!confirm(confirmMsg)) {
        return;
    }

    // 清除選中店鋪的自訂值
    this.selectedStores.forEach(idx => {
        const store = this.stores[idx];
        delete this.customStoreStock[store.Site];
    });

    // 保存到 localStorage 並重新渲染
    this.saveToLocalStorage();
    this.renderStores();
    
    alert(`✅ 已成功重設 ${this.selectedStores.length} 間店鋪的自訂值`);
}
```

## 資料結構說明

- **customStoreStock**：存儲個別店鋪的自訂 Safety Stock 值
  - 鍵：店鋪代碼 (e.g., "HA02")
  - 值：自訂的 Safety Stock 數值

- **SAFETY_STOCK_MATRIX**：對照表，包含所有區域、舖類和貨場面積的預設值

重設操作時，刪除 `customStoreStock` 中的條目，使系統自動從 `SAFETY_STOCK_MATRIX` 中取值。

## 使用場景

1. **大量批改錯誤**：當多間店鋪的自訂值輸入有誤，可快速重設後重新輸入
2. **回復原始設定**：需要放棄所有自訂修改，恢復為對照表的標準值
3. **清理測試數據**：開發/測試階段快速清除臨時修改

## 安全機制

- **確認對話框**：防止誤操作，顯示即將重設的店鋪清單
- **已選擇驗證**：未選擇任何店鋪時無法執行重設
- **自動保存**：重設後自動保存到 localStorage
- **即時反饋**：完成後顯示成功訊息

## 相關功能

其他相關的店鋪選擇和管理功能：
- 全選 / 取消全選 / 反向選擇
- 按多個條件篩選（區域、舖類、貨場面積等）
- 點擊店鋪名稱旁的 Safety Stock 數值可進行內聯編輯
- 個別編輯與批量重設相配合

---

**最後修改**：2026年2月7日  
**版本**：v1.0
