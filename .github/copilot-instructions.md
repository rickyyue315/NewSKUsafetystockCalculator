
## 專案快速導覽（給 AI 編碼代理的指引）

### Project Overview / 專案概述

**Single-page, pure front-end Safety Stock Calculator** (Vanilla JS, no backend, no build step)

此專案為單頁、純前端的 Safety Stock 計算器（Vanilla JS，無後端，無建置步驟）。主要目標是讓開發者和 AI agents 快速理解檔案責任、資料流與常用操作，便於修 bug、加功能或自動化改寫。

**Core Purpose**: Calculate safety stock for 85+ retail stores based on configurable matrices, weights, and per-store customizations. All state persists in `localStorage`.

---

### Local Development / 執行方式

```bash
# Recommended: Static server (better for file import/export)
python -m http.server 8000
# or
npx http-server

# Visit: http://localhost:8000
```

Alternative: Open [index.html](../index.html) directly in browser (limited file operations).

---

### File Structure / 主要檔案

**Core Application Files**:
- [app.js](../app.js) (4000+ lines): `SafetyStockCalculator` class — all UI logic, events, calculations, exports
  - Key methods: `calculate()`, `renderStores()`, `exportToCSV()`, `importConfiguration()`
  - State: `this.stores`, `this.selectedStores`, `this.customStoreStock`, `this.matrixDraft`
- [config.js](../config.js) (800+ lines): **Single source of truth** for business data
  - `STORES_CONFIG.stores` — 85 store definitions
  - `SAFETY_STOCK_MATRIX[region][class][size]` — lookup table
  - `WEIGHT_CONFIG`, `WEIGHT_TEMPLATES` — calculation parameters
  - `AVAILABLE_THEMES` — theme color definitions
- [advanced.js](../advanced.js) (364 lines): Optional advanced calculators
  - ABC analysis, seasonality, alternative formulas (not currently used in main flow)

**UI & Data**:
- [index.html](../index.html): DOM structure, element IDs referenced in `app.js`
- [styles.css](../styles.css): All styling, CSS variables for theming
- [stores-template.csv](../stores-template.csv): Template for batch store import

**Documentation**:
- [README.md](../README.md), [QUICK_START.md](../QUICK_START.md): User guides
- [DEPLOYMENT.md](../DEPLOYMENT.md): GitHub Pages / Zeabur deployment steps

**Principle**: Edit `config.js` for data changes; edit `app.js` for behavior changes.

---

### Data Structures / 核心資料結構

**Store Object** (from `STORES_CONFIG.stores`):
```javascript
{
  Site: "HA02",        // Unique ID (key for customStoreStock)
  Shop: "駱克",        // Display name
  Regional: "HK",      // HK | MO
  Class: "B",          // A, B, C, D (流量/performance tier)
  Size: "S",           // XL, L, M, S, XS (floor space)
  OM: "Ivy",           // Operating Manager name
  Type: "M"            // T (Tourist), M (Mixed), L (Local)
}
```

**Safety Stock Calculation Priority** (highest to lowest):
1. `customStoreStock[Site]` — per-store override (editable inline in UI)
2. `SAFETY_STOCK_MATRIX[region][class][size]` — base lookup table
3. Calculated from `WEIGHT_CONFIG` if matrix empty

**State Management Keys**:
- `customStoreStock`: `{ "HA02": 15, "HB10": 20 }` — per-store overrides
- `customSafetyStock`: `{ "HK-A-L": 18 }` — matrix cell overrides (not commonly used)
- `matrixDraft`: editing buffer for matrix changes before applying
- `safetyStockMatrix`: the currently applied matrix

**LocalStorage Keys**:
- `safetyStockTheme` — current theme key
- `safetyStockSelectedStores` — array of selected Site IDs
- `safetyStockCustomStock` — `customStoreStock` object
- Others: filters, matrix customizations

⚠ **Constraint**: Changing field names (`Site`, `Regional`, etc.) requires updates in both `config.js` data and `app.js` rendering/calculation logic.

---

### Common Change Patterns / 常見變更點

**Update Safety Stock Matrix**:
1. Edit `SAFETY_STOCK_MATRIX` in [config.js](../config.js) directly, OR
2. Use weight-based generation:
   ```javascript
   // In config.js
   const newWeights = { ...WEIGHT_CONFIG, baseValue: 3 };
   const matrix = generateMatrixWithWeights(newWeights);
   ```

**Add/Modify Stores**:
1. Edit `STORES_CONFIG.stores` array in [config.js](../config.js)
2. Maintain structure: `{ Site, Shop, Regional, Class, Size, OM, Type }`
3. `Site` must be unique (used as key for overrides)

**Add New Theme**:
1. Add entry to `AVAILABLE_THEMES` in [config.js](../config.js)
2. Define all color properties (see existing themes as template)
3. Theme auto-appears in UI selector

**Add UI Feature**:
1. Add HTML elements in [index.html](../index.html) with unique `id`
2. Bind event in `app.js` → `setupEventListeners()`
3. Implement handler method in `SafetyStockCalculator` class
4. Update `renderStores()` or relevant render method if displaying dynamic data

---

### Key DOM Elements / UI 與 DOM 關鍵 ID

**Store Management**:
- `#storesContainer` — left panel: store list with inline editing
- `#storesPreview` — selected stores summary panel
- `#selectAllBtn`, `#deselectAllBtn`, `#invertSelectionBtn` — batch selection
- `#clearFiltersBtn` — reset all filters

**Matrix & Calculation**:
- `#matrixContainer` — displays current matrix
- `#editMatrixBtn`, `#saveMatrixBtn`, `#cancelMatrixBtn` — matrix editor controls
- `#applyMatrixBtn` — apply draft matrix to selected stores
- `#calculateBtn` — trigger calculation for selected stores

**Import/Export**:
- `#importFile` — JSON config import file input
- `#exportBtn`, `#exportExcelBtn`, `#exportExcelWithFormulasBtn` — export results
- `#exportConfigBtn` — export all settings as JSON
- `#storesCsvFile`, `#uploadStoresBtn`, `#downloadStoresTemplateBtn` — store CSV operations

**Theme & Admin**:
- `#themeToggleBtn`, `#themePanel`, `#themeList` — theme switcher
- `#adminPassword`, `#verifyPasswordBtn`, `#lockManagementBtn` — management area access

**OM Panel**:
- `#closeOmPanel` — close Operating Manager store grouping panel

💡 **Tip**: Search `getElementById('xxx')` in [app.js](../app.js) to find event handlers.

---

### Application Flow / 執行流程

**Initialization** (`app.js` → `init()`):
1. Load stores from `STORES_CONFIG` → `this.stores`
2. Load matrix from `SAFETY_STOCK_MATRIX` → `this.safetyStockMatrix`
3. Build `matrixDraft` from applied matrix
4. Load theme from localStorage, apply CSS variables
5. Setup event listeners for all UI interactions
6. Restore state from localStorage (selections, custom values)
7. Render stores list and matrix display

**Calculation Flow** (when user clicks Calculate):
1. `calculate()` iterates `this.selectedStores`
2. For each store, lookup safety stock:
   - Check `this.customStoreStock[store.Site]` first (inline edits)
   - Fallback to `this.safetyStockMatrix[region][class][size]`
   - Apply Type weight if enabled: `value * WEIGHT_CONFIG.type[store.Type]`
3. Store results in `this.results` array
4. Calculate summaries by Type
5. Render results table and charts

**Matrix Editing Flow**:
1. Click Edit Matrix → populate `matrixDraft` from `safetyStockMatrix`
2. User edits cells → changes stored in `matrixDraft` (not applied yet)
3. Click Save → `matrixDraft` persisted to localStorage (still not applied)
4. Click Apply → `matrixDraft` copied to `safetyStockMatrix`, recalculate affected stores
5. Cancel → discard `matrixDraft`, reload from `safetyStockMatrix`

⚠ **No backend**: All operations are client-side. Data persists only in `localStorage`.

---

### Calculation Logic / 計算邏輯

**Weight-Based Calculation** (in [config.js](../config.js)):
```javascript
// Formula: baseValue + (classWeight × sizeWeight × typeWeight × regionFactor)
calculateSafetyStockWithWeights(region, category, size, type, weights)
```

**Weight Templates**: `WEIGHT_TEMPLATES` provides presets (`default`, `balanced`, `conservative`, `aggressive`)

**Generate Entire Matrix**:
```javascript
// Uses Type="M" (Mixed) as baseline for matrix generation
generateMatrixWithWeights(WEIGHT_CONFIG)
```

**Lookup Helper**:
```javascript
// Returns value from matrix with fallback logic
getSafetyStockValue(region, category, size)
```

**Type Adjustment**: When Type weight enabled, final value = `matrix_value * WEIGHT_CONFIG.type[store.Type]`
- `T` (Tourist): 1.2x multiplier
- `M` (Mixed): 1.0x (baseline)
- `L` (Local): 0.9x

---

### Debugging & Testing / 偵錯與測試要點

**Browser DevTools** (F12 → Console):
- All errors logged to console
- State inspection: `window.calculator` exposes instance (if debugging enabled)

**Key Methods to Inspect**:
- `calculate()` — main calculation logic, check `this.results`
- `getSafetyStockForStore(store)` — per-store lookup, shows priority: custom → matrix → weight
- `exportToCSV()`, `exportToExcel()` — export generation
- `importConfiguration(e)` — JSON config parsing
- `saveMatrixDraft()`, `applyMatrixToStores()` — matrix editing workflow

**Common Issues**:
- **Calculation returns 0**: Check `SAFETY_STOCK_MATRIX` has values for store's region/class/size
- **Custom values not saving**: Verify `localStorage` not disabled, check browser console for quota errors
- **Matrix edits not applied**: User must click "Apply" after "Save" (two-step process)
- **Import fails**: JSON must match schema (see `exportConfiguration()` output for valid structure)

**Testing Workflow** (no automated tests):
1. Open browser DevTools
2. Manually test feature with various inputs
3. Check console for errors
4. Inspect `localStorage` for persistence
5. Test edge cases (empty selections, missing data, etc.)

---

### Project-Specific Conventions / 程式風格與約束

**Code Organization**:
- Single-file pattern: Most logic in `app.js` (4000+ lines)
- Configuration centralized: All business data in `config.js`
- No build step: Vanilla JS, no transpilation or bundling
- No dependencies: All libraries (SheetJS, etc.) loaded via CDN in HTML

**Naming Conventions**:
- Store fields: PascalCase (`Site`, `Regional`, `Class`, `Size`, `OM`, `Type`)
- State properties: camelCase (`customStoreStock`, `selectedStores`)
- Constants: UPPER_SNAKE_CASE (`SAFETY_STOCK_MATRIX`, `WEIGHT_CONFIG`)
- DOM IDs: camelCase with descriptive suffixes (`calculateBtn`, `storesContainer`)

**State Management Pattern**:
- Instance properties: Current app state (`this.stores`, `this.selectedStores`)
- LocalStorage: Persistent user customizations (theme, selections, custom values)
- Draft pattern: `matrixDraft` holds uncommitted changes before applying

**Constraints**:
- Changing data structure fields requires coordinated updates in:
  1. `config.js` — data definitions
  2. `app.js` — rendering, lookup, and calculation logic
  3. CSV import/export — column mapping
- No modularization: Adding imports/exports would require build setup

---

### Advanced Features / 進階功能

**From [advanced.js](../advanced.js)** (optional, not integrated):
- `calculateBasicSafetyStock()` — statistical formula: `Z * σ * √L`
- `calculateABCSafetyStock()` — ABC analysis-based adjustments
- `calculateSeasonalityFactor()` — seasonal demand patterns
- Integration: Import functions and call from `app.js` if needed

**Theme System**:
- Defined in `AVAILABLE_THEMES` (config.js)
- Applied via CSS variables on `:root`
- Switchable at runtime, persisted to localStorage
- All color customizations use CSS var references

**OM Grouping**:
- Stores grouped by Operating Manager (`OM` field)
- Separate panel shows stores per manager
- Useful for team-based planning

**Inline Editing**:
- Click store row cells to edit safety stock
- Changes saved to `customStoreStock[store.Site]`
- Overrides matrix values in calculations
- Reset button clears all custom values

---

### Refactoring Suggestions / 重構建議（供 AI 使用）

**Recommended Splits** (while maintaining no-build-step):
1. **Modularize `app.js`**:
   - `store-management.js` — filtering, selection, rendering stores
   - `matrix.js` — matrix CRUD, weight calculations
   - `export.js` — CSV, Excel, JSON generation
   - `ui.js` — theme, modals, generic UI helpers
   - `calculations.js` — core safety stock logic
   - Keep as ES6 modules with `<script type="module">`

2. **Extract testable functions** from `config.js`:
   ```javascript
   // Already pure functions, can add unit tests:
   - calculateSafetyStockWithWeights()
   - generateMatrixWithWeights()
   - getSafetyStockValue()
   ```

3. **Add minimal testing**:
   - Use `<script type="module">` for Jest or Mocha
   - Test calculation logic without DOM dependencies
   - Mock localStorage with polyfill

4. **Data-driven UI**:
   - Move filter configurations to `config.js`
   - Make column definitions declarative
   - Reduce hardcoded DOM manipulation

5. **Progressive Enhancement**:
   - Add TypeScript type definitions (`.d.ts` files)
   - Use JSDoc comments for inline type hints
   - Consider Web Components for encapsulation

**Migration Strategy**:
1. Extract one module at a time
2. Test in isolation before integration
3. Use feature flags for gradual rollout
4. Maintain backward compatibility with localStorage schema

---

### Integration & Dependencies / 整合要點

**External Libraries** (loaded from CDN):
- SheetJS (xlsx.full.min.js) — Excel export generation
- No package manager — all deps loaded via `<script>` tags in HTML

**Browser APIs Used**:
- `localStorage` — persistent storage (quota: ~5-10MB)
- `FileReader` — CSV/JSON import
- `Blob`, `URL.createObjectURL()` — file downloads
- `console` — logging (no external logging service)

**No Server APIs**: Fully offline-capable after initial load

**Deployment Targets**:
- GitHub Pages (static hosting)
- Zeabur (documented in [DEPLOYMENT.md](../DEPLOYMENT.md))
- Any static file server (nginx, Apache, CDN)

---

### Quick Reference / 快速參考

**Find Handlers**: Search `addEventListener` in [app.js](../app.js) → `setupEventListeners()`

**Modify Matrix**: Edit [config.js](../config.js) → `SAFETY_STOCK_MATRIX` OR generate with `generateMatrixWithWeights()`

**Add Store**: Edit [config.js](../config.js) → `STORES_CONFIG.stores` array

**Debug Calculation**: Set breakpoint in `calculate()` method, inspect `this.selectedStores` and `this.results`

**Trace localStorage**: DevTools → Application → Local Storage → `file://` or hostname

**Test Export**: Click export, check browser Downloads folder, open with Excel/text editor

---

如果需要我把以上轉為更詳細的英文技術文件、或把 `SafetyStockCalculator` 拆模組的具體步驟寫成 PR 指引，告訴我想要哪一部分擴充。
If you want a fully expanded English version or a step-by-step refactor PR (module breakdown, tests and migration steps), tell me which area to expand.

