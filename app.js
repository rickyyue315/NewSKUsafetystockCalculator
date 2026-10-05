// ==================== 主應用程序 ====================
// Safety Stock Calculator - 根據 Excel 對照表重新設計

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 需特別關注店鋪：資料來源為 stores-template.csv 的「需特別關注」欄位（config.js 的 SpecialAttention）
function isSpecialAttentionStore(store) {
    return !!(store && store.SpecialAttention);
}

class SafetyStockCalculator {
    constructor() {
        this.stores = [];
        this.selectedStores = [];
        this.safetyStockMatrix = {};
        this.results = [];
        this.summaryResults = []; // 按店鋪類型彙總的結果
        this.activeFilters = {
            region: [],
            category: [],
            size: [],
            type: [],
            storeGroup: [],
            manager: [],
            specialStore: []
        };
        this.customSafetyStock = {}; // 使用者自訂的 Safety Stock 值
        this.customStoreStock = {}; // 個別店鋪的自訂 Safety Stock 值 (key: store.Site)
        this.customSafetyStockMode2 = {}; // 模式2：Class+Size
        this.customSafetyStockMode3 = {}; // 模式3：Class+Type
        this.currentTheme = DEFAULT_THEME; // 當前主題
        this.weightConfig = JSON.parse(JSON.stringify(WEIGHT_CONFIG)); // 權重配置
        this.matrixDraft = {}; // 模式1對照表草稿（Class+Type+Size）
        this.matrixDraftMode2 = {}; // 模式2對照表草稿（Class+Size）
        this.matrixDraftMode3 = {}; // 模式3對照表草稿（Class+Type）
        this.calculationMode = 'mode1';
        this.storeMap = new Map();
        this._adminVerified = false;
        // 一屏 + 免確認：自動生效開關與防抖計時器
        this.autoCalc = true;
        this._weightDebounce = null;
        this._pendingWeightApply = false;
        this._calcDebounce = null;
        this._eventsBound = false;
        this._matrixEditBound = false;
        
        this.init();
    }

    // 初始化應用
    init() {
        this.renderAppVersion();
        this.loadStoresFromConfig();
        this.loadSafetyStockMatrix();
        this.renderOmFilterButtons();
        this.matrixDraft = this.buildMatrixDraftFromApplied();
        this.matrixDraftMode2 = this.buildMatrixDraftMode2();
        this.matrixDraftMode3 = this.buildMatrixDraftMode3();
        this.initTheme(); // 初始化主題
        this.initFontSize(); // 初始化文字大小
        this.setupEventListeners();
        this.setupModeSwitcher();
        this.setupInlineEditListeners();
        this.renderStores();
        this.renderSafetyStockMatrix();
        this.loadFromLocalStorage();
        // 初始化目標安全庫存顯示
        setTimeout(() => this.updateTargetSafetyStock(), 100);
        // 初始化分頁切換與快速報表
        this.initTabNavigation();
        // 一屏優化：預設自動預覽一次 + 綁定駕駛艙 + 對照表直接編輯
        setTimeout(() => {
            try { this.previewWeights({ silent: true }); } catch (e) {}
            try { this.updateCockpitBar(); } catch (e) {}
            if (this.selectedStores.length > 0 && this.autoCalc) {
                try { this.calculate({ silent: true }); } catch (e) {}
                try { this.updateCockpitBar(); } catch (e) {}
            }
        }, 300);
    }

    // 頁尾版本號：單一來源為 config.js 的 APP_VERSION / APP_BUILD_DATE
    renderAppVersion() {
        try {
            const version = (typeof APP_VERSION !== 'undefined' && APP_VERSION) ? APP_VERSION : 'v1.3.4';
            const buildDate = (typeof APP_BUILD_DATE !== 'undefined' && APP_BUILD_DATE) ? APP_BUILD_DATE : '2026-10-05';
            const versionEl = document.getElementById('appVersion');
            const dateEl = document.getElementById('appBuildDate');
            if (versionEl) versionEl.textContent = version;
            if (dateEl) dateEl.textContent = buildDate;
        } catch (e) { /* 頁尾版本顯示失敗不影響主流程 */ }
    }

    // ==================== 模式切換 ====================

    setupModeSwitcher() {
        const switcher = document.getElementById('modeSwitcher');
        if (!switcher) return;

        switcher.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.setCalculationMode(mode);
            });
        });

        this.updateModeSwitcherUI();
        this.updateModeDescriptions();
    }

    setCalculationMode(mode, options = {}) {
        const allowed = ['mode1', 'mode2', 'mode3'];
        if (!allowed.includes(mode)) return;

        this.calculationMode = mode;
        this.updateModeSwitcherUI();
        this.updateModeDescriptions();

        if (options.render !== false) {
            this.renderSafetyStockMatrix();
            this.renderStores();
            this.updateStoresPreview();
            this.updateStoreCount();
            this.refreshQuickReportForMode();
            try { this.previewWeights({ silent: true }); } catch (e) {}
            try { this.updateCockpitBar(); } catch (e) {}
        }

        if (options.recalculate !== false && this.summaryResults.length > 0) {
            this.calculate({ silent: true });
        }

        if (options.persist !== false) {
            this.saveToLocalStorage();
        }
    }

    refreshQuickReportForMode() {
        this.updateQuickReportModeUI();

        const quickPanel = document.getElementById('tab-quickReport');
        const quickBody = document.getElementById('qrTableBody');
        if (!quickPanel || !quickBody) return;

        if (quickPanel.classList.contains('active') || quickBody.children.length > 0) {
            this.renderQuickReport();
        }
    }

    updateModeSwitcherUI() {
        const switcher = document.getElementById('modeSwitcher');
        if (!switcher) return;

        switcher.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.calculationMode);
        });
    }

    updateModeDescriptions() {
        const mode = this.calculationMode;
        const modeHint = document.getElementById('modeHint');
        const matrixHint = document.getElementById('matrixHint');
        const formulaCode = document.getElementById('formulaCode');
        const formulaNote = document.getElementById('formulaNote');
        const formulaSizeDesc = document.getElementById('formulaSizeDesc');
        const formulaTypeDesc = document.getElementById('formulaTypeDesc');
        const weightTypeHint = document.getElementById('weightTypeHint');
        const weightSizeHint = document.getElementById('weightSizeHint');
        const templateModeHint = document.getElementById('templateModeHint');

        if (modeHint) {
            modeHint.textContent = mode === 'mode2'
                ? '模式 2：級別 / 面積（Type 固定為 M）'
                : mode === 'mode3'
                    ? '模式 3：級別 / 類別（Size 固定為 M）'
                    : '模式 1：級別 / 類別 / 面積';
        }

        if (matrixHint) {
            matrixHint.textContent = mode === 'mode2'
                ? '此對照表根據區域、舖類和貨場面積決定每間店舖的 Safety Stock（Type 固定為 M）'
                : mode === 'mode3'
                    ? '此對照表根據區域、舖類和店舖類型決定每間店舖的 Safety Stock（Size 固定為 M）'
                    : '此對照表根據區域、舖類和貨場面積決定每間店舖的 Safety Stock 數量';
        }

        if (formulaCode) {
            formulaCode.textContent = mode === 'mode2'
                ? 'Safety Stock = 基礎值 + (Class權重 × Size權重 × 區域係數)'
                : mode === 'mode3'
                    ? 'Safety Stock = 基礎值 + (Class權重 × Type權重 × 區域係數)'
                    : 'Safety Stock = 基礎值 + (Class權重 × Size權重 × Type權重 × 區域係數)';
        }

        if (formulaNote) {
            formulaNote.textContent = mode === 'mode2'
                ? '模式 2：Type 固定為 M（不參與計算）'
                : mode === 'mode3'
                    ? '模式 3：Size 固定為 M（不參與計算）'
                    : '模式 1：Class / Size / Type 全部參與';
        }

        if (formulaSizeDesc) {
            formulaSizeDesc.textContent = mode === 'mode3'
                ? '模式 3 中 Size 固定為 M（不參與計算）'
                : '根據貨場面積 (XL/L/M/S/XS) 設定的權重係數';
        }

        if (formulaTypeDesc) {
            formulaTypeDesc.textContent = mode === 'mode2'
                ? '模式 2 中 Type 固定為 M（不參與計算）'
                : '根據店舖類型 (T-遊客區/M-混合型/L-本地客源) 設定的權重係數，用於調整不同客源特性的庫存需求';
        }

        if (weightTypeHint) {
            if (mode === 'mode2') {
                weightTypeHint.textContent = '模式 2：Type 固定為 M（此欄位不參與計算）';
                weightTypeHint.style.display = '';
            } else {
                weightTypeHint.style.display = 'none';
            }
        }

        if (weightSizeHint) {
            if (mode === 'mode3') {
                weightSizeHint.textContent = '模式 3：Size 固定為 M（此欄位不參與計算）';
                weightSizeHint.style.display = '';
            } else {
                weightSizeHint.style.display = 'none';
            }
        }

        if (templateModeHint) {
            templateModeHint.textContent = mode === 'mode2'
                ? '模式 2：模板會將 Type 權重對齊為 M'
                : mode === 'mode3'
                    ? '模式 3：模板會將 Size 權重對齊為 M'
                    : '模板會依目前模式套用';
        }
    }

    // ==================== 主題管理功能 ====================
    
    initTheme() {
        // 從 localStorage 加載保存的主題
        const savedTheme = localStorage.getItem('safetyStockTheme');
        if (savedTheme && AVAILABLE_THEMES[savedTheme]) {
            this.currentTheme = savedTheme;
        }
        // 應用主題
        this.applyTheme(this.currentTheme);
        // 渲染主題選擇器
        this.renderThemeSelector();
        // 設置主題面板事件
        this.setupThemeEvents();
    }
    
    applyTheme(themeKey) {
        const theme = AVAILABLE_THEMES[themeKey];
        if (!theme) return;

        const root = document.documentElement;
        const colors = theme.colors;

        // 應用所有顏色變數
        root.style.setProperty('--color-primary', colors.primary);
        root.style.setProperty('--color-primary-light', colors.primaryLight);
        root.style.setProperty('--color-primary-dark', colors.primaryDark);
        root.style.setProperty('--color-secondary', colors.secondary);
        root.style.setProperty('--color-accent', colors.accent);

        root.style.setProperty('--color-body-bg', colors.bodyBg);
        root.style.setProperty('--color-container-bg', colors.containerBg);
        root.style.setProperty('--color-section-bg', colors.sectionBg);
        root.style.setProperty('--color-header-bg', colors.headerBg);
        root.style.setProperty('--color-footer-bg', colors.footerBg);

        root.style.setProperty('--color-text-primary', colors.textPrimary);
        root.style.setProperty('--color-text-secondary', colors.textSecondary);
        root.style.setProperty('--color-text-muted', colors.textMuted);
        root.style.setProperty('--color-text-light', colors.textLight);

        root.style.setProperty('--color-border-light', colors.borderLight);
        root.style.setProperty('--color-border-medium', colors.borderMedium);

        root.style.setProperty('--color-region-hk', colors.regionHk);
        root.style.setProperty('--color-region-mo', colors.regionMo);

        root.style.setProperty('--color-category-a', colors.categoryA);
        root.style.setProperty('--color-category-b', colors.categoryB);
        root.style.setProperty('--color-category-c', colors.categoryC);
        root.style.setProperty('--color-category-d', colors.categoryD);

        root.style.setProperty('--color-success', colors.success);
        root.style.setProperty('--color-warning', colors.warning);
        root.style.setProperty('--color-danger', colors.danger);
        root.style.setProperty('--color-info', colors.info);
        root.style.setProperty('--color-highlight', colors.highlight);

        root.style.setProperty('--color-table-header-bg', colors.tableHeaderBg);
        root.style.setProperty('--color-table-header-text', colors.tableHeaderText);
        root.style.setProperty('--color-table-row-even', colors.tableRowEven);
        root.style.setProperty('--color-table-row-hover', colors.tableRowHover);
        root.style.setProperty('--color-table-total-bg', colors.tableTotalBg);
        root.style.setProperty('--color-table-carry-bg', colors.tableCarryBg);

        root.style.setProperty('--color-btn-primary-bg', colors.btnPrimaryBg);
        root.style.setProperty('--color-btn-primary-hover', colors.btnPrimaryHover);
        root.style.setProperty('--color-btn-secondary-bg', colors.btnSecondaryBg);
        root.style.setProperty('--color-btn-success-bg', colors.btnSuccessBg);
        root.style.setProperty('--color-btn-warning-bg', colors.btnWarningBg);
        root.style.setProperty('--color-btn-danger-bg', colors.btnDangerBg);
        root.style.setProperty('--color-btn-info-bg', colors.btnInfoBg);

        root.style.setProperty('--color-scrollbar-track', colors.scrollbarTrack);
        root.style.setProperty('--color-scrollbar-thumb', colors.scrollbarThumb);
        root.style.setProperty('--color-scrollbar-thumb-hover', colors.scrollbarThumbHover);

        // 標記當前主題，供 CSS 深色模式覆寫規則使用
        root.setAttribute('data-theme', themeKey);
        if (document.body) document.body.setAttribute('data-theme', themeKey);

        this.currentTheme = themeKey;
        this.updateThemeSelectorUI();
    }

    renderThemeSelector() {
        const themeList = document.getElementById('themeList');
        if (!themeList) return;

        const themeIcons = {
            sasa: '💄',
            minimal: '◻️',
            dark: '🌙'
        };

        let html = '';
        Object.keys(AVAILABLE_THEMES).forEach(key => {
            const theme = AVAILABLE_THEMES[key];
            const isDefault = key === DEFAULT_THEME;
            const badge = isDefault ? '<span style="color: var(--color-success); margin-left: 4px;">✓</span>' : '';
            html += `
                <div class="theme-option ${key === this.currentTheme ? 'active' : ''}" data-theme="${key}">
                    <div class="theme-preview theme-${key}">${themeIcons[key] || '🎨'}</div>
                    <div class="theme-info">
                        <div class="theme-name">${theme.name}${badge}</div>
                        <div class="theme-desc">${theme.description}</div>
                    </div>
                </div>
            `;
        });

        themeList.innerHTML = html;

        // 添加點擊事件
        themeList.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                const themeKey = option.dataset.theme;
                this.switchTheme(themeKey);
            });
        });
    }

    setupThemeEvents() {
        const toggleBtn = document.getElementById('themeToggleBtn');
        const themePanel = document.getElementById('themePanel');

        if (!toggleBtn || !themePanel) return;

        // 切換面板顯示
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            themePanel.classList.toggle('active');
        });

        // 點擊外部關閉面板
        document.addEventListener('click', (e) => {
            if (!themePanel.contains(e.target) && !toggleBtn.contains(e.target)) {
                themePanel.classList.remove('active');
            }
        });

        // 阻止面板內部點擊冒泡
        themePanel.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    switchTheme(themeKey) {
        if (!AVAILABLE_THEMES[themeKey]) return;

        this.applyTheme(themeKey);
        try {
            localStorage.setItem('safetyStockTheme', themeKey);
        } catch (err) {
            console.warn('無法保存主題設定:', err);
        }

        // 顯示提示
        const themeName = AVAILABLE_THEMES[themeKey].name;
        this.showToast(`已切換到「${themeName}」配色方案`);
    }

    updateThemeSelectorUI() {
        // 更新主題選項的高亮狀態
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.toggle('active', option.dataset.theme === this.currentTheme);
        });
    }

    // ==================== 文字大小調整 ====================
    // 只縮放字體：改 :root --font-scale，body 字級用 calc 跟隨；
    // 版面尺寸全用 px/em 間距，不受影響。偏好存 localStorage。
    initFontSize() {
        let scale = 1;
        try {
            const saved = parseFloat(localStorage.getItem('safetyStockFontScale'));
            if (!isNaN(saved)) scale = Math.min(1.4, Math.max(0.8, saved));
        } catch (e) {}
        this.fontScale = Math.round(scale * 10) / 10;
        this.applyFontScale();

        const decBtn = document.getElementById('fontDecreaseBtn');
        const incBtn = document.getElementById('fontIncreaseBtn');
        const label = document.getElementById('fontScaleLabel');
        if (decBtn) decBtn.addEventListener('click', (e) => { e.stopPropagation(); this.changeFontScale(-0.1); });
        if (incBtn) incBtn.addEventListener('click', (e) => { e.stopPropagation(); this.changeFontScale(0.1); });
        if (label) label.addEventListener('click', (e) => { e.stopPropagation(); this.setFontScale(1); });
    }

    applyFontScale() {
        try {
            document.documentElement.style.setProperty('--font-scale', String(this.fontScale));
        } catch (e) {}
        const label = document.getElementById('fontScaleLabel');
        if (label) label.textContent = Math.round(this.fontScale * 100) + '%';
    }

    changeFontScale(delta) {
        this.setFontScale((this.fontScale || 1) + delta);
    }

    setFontScale(scale) {
        this.fontScale = Math.round(Math.min(1.4, Math.max(0.8, scale)) * 10) / 10;
        try {
            localStorage.setItem('safetyStockFontScale', String(this.fontScale));
        } catch (e) {}
        this.applyFontScale();
    }

    showToast(message) {
        // 創建提示元素
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--color-primary);
            color: var(--color-text-light);
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            box-shadow: var(--shadow-container);
            z-index: 10000;
            animation: slideUp 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        // 3秒後移除
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ==================== 數據加載 ====================

    loadStoresFromConfig() {
        if (STORES_CONFIG && STORES_CONFIG.stores) {
            this.stores = STORES_CONFIG.stores;
            // 建立店鋪索引 Map 以提升查詢效能
            this.storeMap = new Map();
            this.stores.forEach(store => {
                this.storeMap.set(store.Site, store);
            });
        }
    }

    loadSafetyStockMatrix() {
        if (SAFETY_STOCK_MATRIX) {
            this.safetyStockMatrix = JSON.parse(JSON.stringify(SAFETY_STOCK_MATRIX));
        }
    }

    renderOmFilterButtons() {
        const container = document.getElementById('omFilterButtons');
        if (!container) return;

        const omCounts = {};
        this.stores.forEach(store => {
            const om = store.OM;
            if (om) {
                omCounts[om] = (omCounts[om] || 0) + 1;
            }
        });

        const sortedOms = Object.keys(omCounts).sort();
        let html = '';
        sortedOms.forEach(om => {
            const activeClass = this.activeFilters.manager.includes(om) ? ' active' : '';
            html += `
                <button class="filter-btn om-filter-btn${activeClass}" data-filter="manager" data-value="${escapeHtml(om)}" title="${escapeHtml(om)} 負責的店鋪">
                    <span class="om-name">${escapeHtml(om)}</span>
                    <span class="om-count">${omCounts[om]}間</span>
                </button>
            `;
        });
        container.innerHTML = html;

        // 篩選按鈕使用事件委派，由 setupEventListeners 統一綁定，
        // 避免 OM 按鈕動態重建後被重複綁定而一次點擊被切換兩次。
    }

    // ==================== 事件監聽設置 ====================

    setupEventListeners() {
        if (this._eventsBound) return;
        this._eventsBound = true;

        // 店鋪選擇按鈕
        document.getElementById('selectAllBtn')?.addEventListener('click', () => this.selectAllStores());
        document.getElementById('deselectAllBtn')?.addEventListener('click', () => this.deselectAllStores());
        document.getElementById('invertSelectionBtn')?.addEventListener('click', () => this.invertSelection());
        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => this.clearFilters());
        document.getElementById('resetCustomStockBtn')?.addEventListener('click', () => this.resetCustomStoreStock());

        // OM 店鋪清單面板關閉按鈕
        document.getElementById('closeOmPanel')?.addEventListener('click', () => this.closeOmStoresPanel());

        // 分類及動態 OM 篩選按鈕：使用事件委派，確保每個按鈕只觸發一次
        const filterContainer = document.querySelector('.category-filters');
        if (filterContainer && !this._filterEventsBound) {
            filterContainer.addEventListener('click', (e) => this.handleFilterClick(e));
            this._filterEventsBound = true;
        }

        // 計算和導出
        document.getElementById('calculateBtn')?.addEventListener('click', () => this.calculate());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportToCSV());
        document.getElementById('exportExcelBtn')?.addEventListener('click', () => this.exportToExcel());
        document.getElementById('exportExcelWithFormulasBtn')?.addEventListener('click', () => this.exportToExcelWithFormulas());
        document.getElementById('exportConfigBtn')?.addEventListener('click', () => this.exportConfiguration());
        document.getElementById('importBtn')?.addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile')?.addEventListener('change', (e) => this.importConfiguration(e));
        document.getElementById('printBtn')?.addEventListener('click', () => this.printResults());

        // 店鋪管理（CSV 上載）
        document.getElementById('uploadStoresBtn')?.addEventListener('click', () => this.triggerStoresCsvUpload());
        document.getElementById('downloadStoresTemplateBtn')?.addEventListener('click', () => this.downloadStoresCsvTemplate());
        document.getElementById('storesCsvFile')?.addEventListener('change', (e) => this.importStoresFromCsv(e));

        // 店鋪管理區域摺疊
        document.getElementById('toggleStoresManagement')?.addEventListener('click', () => this.toggleStoresManagement());

        // 密碼驗證
        document.getElementById('verifyPasswordBtn')?.addEventListener('click', () => this.verifyAdminPassword());
        document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verifyAdminPassword();
        });

        // 鎖定管理區域
        document.getElementById('lockManagementBtn')?.addEventListener('click', () => this.lockManagement());

        // Safety Stock Matrix 編輯（已改為直接點擊自動生效，舊按鈕保留兼容）
        document.getElementById('editMatrixBtn')?.addEventListener('click', () => this.enableMatrixEdit());
        document.getElementById('saveMatrixBtn')?.addEventListener('click', () => this.saveMatrixEdit());
        document.getElementById('cancelMatrixBtn')?.addEventListener('click', () => this.cancelMatrixEdit());
        document.getElementById('resetMatrixBtn')?.addEventListener('click', () => this.resetMatrix());
        document.getElementById('applyMatrixBtn')?.addEventListener('click', () => this.applyMatrixToStores());
        // 駕駛艙一鍵操作
        document.getElementById('cockpitCalcBtn')?.addEventListener('click', () => this.calculate());
        document.getElementById('cockpitExportBtn')?.addEventListener('click', () => {
            if (this.summaryResults.length === 0) this.calculate({ silent: true });
            this.exportToExcel();
        });
        // 回到頂部浮動按鈕：捲動離開頂部超過一屏距離才顯示，在頂部時隱藏
        const backToTopBtn = document.getElementById('backToTopBtn');
        if (backToTopBtn) {
            backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
            const toggleBackToTop = () => backToTopBtn.classList.toggle('visible', window.scrollY > 300);
            window.addEventListener('scroll', toggleBackToTop, { passive: true });
            toggleBackToTop();
        }
        // 自動計算開關
        document.getElementById('autoCalcToggle')?.addEventListener('change', (e) => {
            this.autoCalc = e.target.checked;
            this.showToast(this.autoCalc ? '⚡ 已開啟自動計算' : '已關閉自動計算（需手動按計算）');
            this.scheduleAutoCalculate({ invalidate: false });
        });

        // 權重設定面板事件
        this.setupWeightPanelListeners();

        // 店鋪 Safety Stock 編輯監聽
        this.setupStoreStockEditListeners();
    }

    setupStoreStockEditListeners() {
        const container = document.getElementById('storesContainer');
        if (!container) return;
        
        container.addEventListener('click', (e) => {
            const span = e.target.closest('.editable-store-stock');
            if (span) {
                this.enableStoreStockEdit(span);
            }
        });
        
        container.addEventListener('blur', (e) => {
            const input = e.target.closest('.store-stock-input');
            if (input && input.classList.contains('editing')) {
                this.saveStoreStockEdit(input);
            }
        }, true);
        
        container.addEventListener('keydown', (e) => {
            const input = e.target.closest('.store-stock-input');
            if (!input || !input.classList.contains('editing')) return;
            
            if (e.key === 'Enter') {
                e.preventDefault();
                this.saveStoreStockEdit(input);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelStoreStockEdit(input);
            }
        }, true);
    }

    handleStoreStockEdit(e, storeCode) {
        e.stopPropagation();
        const span = e.target;
        this.enableStoreStockEdit(span);
    }

    enableStoreStockEdit(span) {
        if (span.classList.contains('editing')) return;
        
        const currentValue = span.textContent;
        const storeCode = span.dataset.storeCode;
        
        span.classList.add('editing');
        span.innerHTML = `<input type="number" class="store-stock-input" value="${currentValue}" min="0">`;
        
        const input = span.querySelector('input');
        input.classList.add('editing');
        input.focus();
        input.select();
    }

    saveStoreStockEdit(input) {
        const span = input.closest('.editable-store-stock');
        if (!span) return;
        
        const storeCode = span.dataset.storeCode;
        const newValue = Math.max(0, parseInt(input.value) || 0);
        
        // 保存自訂值
        this.customStoreStock[storeCode] = newValue;
        
        // 更新顯示
        span.textContent = newValue;
        span.classList.remove('editing');
        
        this.saveToLocalStorage();
        this.updateStoresPreview();
        this.updateCockpitBar();
        this.scheduleAutoCalculate();
        this.flushPendingWeightApply();
    }

    cancelStoreStockEdit(input) {
        const span = input.closest('.editable-store-stock');
        if (span) {
            const storeCode = span.dataset.storeCode;
            const store = this.getStoreBySite(storeCode);
            const value = this.customStoreStock[storeCode] !== undefined
                ? this.customStoreStock[storeCode]
                : this.getSafetyStock(store.Regional, store.Class, store.Size, store.Type);
            span.textContent = value;
            span.classList.remove('editing');
        }
        this.flushPendingWeightApply();
    }

    getStoreBySite(site) {
        return this.storeMap.get(site) || this.stores.find(s => s.Site === site);
    }

    getStoreTypeLabel(type = 'M') {
        const labels = { T: '遊客', M: '混合', L: '本地' };
        return labels[type] || labels.M;
    }

    getQuickReportDimensionMeta(mode = this.calculationMode) {
        if (mode === 'mode3') {
            return {
                key: '店鋪類型',
                shortKey: '類型',
                valueGetter: (store) => this.getStoreTypeLabel(store.Type || 'M')
            };
        }

        return {
            key: '貨場面積',
            shortKey: '面積',
            valueGetter: (store) => store.Size
        };
    }

    buildModeTypeCode(store, mode) {
        const region = store.Regional;
        const category = store.Class;
        const size = store.Size;
        const type = store.Type || 'M';

        if (mode === 'mode2') {
            return `${region}${category}${size}`;
        }

        if (mode === 'mode3') {
            return `${region}${category}${type}`;
        }

        return `${region}${category}${type}${size}`;
    }

    updateQuickReportModeUI() {
        const mode = this.calculationMode;
        const dimensionMeta = this.getQuickReportDimensionMeta(mode);
        const hint = document.querySelector('#tab-quickReport .hint');
        const tableDimensionHeader = document.querySelector('#qrTable thead th:nth-child(6)');
        const summaryDimensionHeader = document.querySelector('#qrTypeSummaryTable thead th:nth-child(4)');

        if (tableDimensionHeader) {
            tableDimensionHeader.textContent = dimensionMeta.shortKey;
        }

        if (summaryDimensionHeader) {
            summaryDimensionHeader.textContent = dimensionMeta.shortKey;
        }

        if (hint) {
            hint.textContent = mode === 'mode2'
                ? '簡潔模式：選擇店鋪 → 自動計算（模式 2：Type 固定為 M）→ 直接匯出 Excel'
                : mode === 'mode3'
                    ? '簡潔模式：選擇店鋪 → 自動計算（模式 3：Size 固定為 M）→ 直接匯出 Excel'
                    : '簡潔模式：選擇店鋪 → 自動計算 → 直接匯出 Excel，表格即所見即所得';
        }
    }

    // ==================== 店鋪選擇函數 ====================
    
    renderStores() {
        const container = document.getElementById('storesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        // 按區域和分類排序
        const sortedStores = [...this.stores].sort((a, b) => {
            if (a.Regional !== b.Regional) return a.Regional.localeCompare(b.Regional);
            if (a.Class !== b.Class) return a.Class.localeCompare(b.Class);
            return a.Shop.localeCompare(b.Shop);
        });
        
        sortedStores.forEach((store, index) => {
            const originalIndex = this.stores.indexOf(store);
            const div = document.createElement('div');
            div.className = 'store-item';
            div.dataset.region = store.Regional;
            div.dataset.category = store.Class;
            div.dataset.size = store.Size;
            div.dataset.type = store.Type || '';
            div.dataset.storeGroup = store.Site ? store.Site.substring(0, 2).toUpperCase() : '';
            div.dataset.manager = store.OM || '';

            // 檢查是否有個別店鋪的自訂值，或全局對照表的自訂值
            let safetyStock;
            if (this.customStoreStock[store.Site] !== undefined) {
                safetyStock = this.customStoreStock[store.Site];
            } else {
                // 使用對照表值，現在已經整合 Type
                safetyStock = this.getSafetyStock(store.Regional, store.Class, store.Size, store.Type || 'M', this.calculationMode);
            }

            // 根據 Type 生成色彩標籤
            const typeColors = { 'T': '#ff6b6b', 'M': '#4ecdc4', 'L': '#45b7d1' };
            const typeLabels = { 'T': '遊客', 'M': '混合', 'L': '本地' };
            const typeColor = typeColors[store.Type] || '#ccc';
            const typeLabel = typeLabels[store.Type] || '未分類';
            const isSpecial = isSpecialAttentionStore(store);
            div.dataset.specialattention = isSpecial ? '1' : '0';

            div.innerHTML = `
                <input type="checkbox" id="store-${originalIndex}" value="${originalIndex}">
                <label for="store-${originalIndex}" class="store-name">${escapeHtml(store.Shop)}</label>
                <span class="store-code${isSpecial ? ' store-code-special' : ''}"${isSpecial ? ' title="⭐ 需特別關注"' : ''}>${escapeHtml(store.Site)}</span>
                <span class="store-badge region-${store.Regional.toLowerCase()}">${escapeHtml(store.Regional)}</span>
                <span class="store-badge category-${store.Class.toLowerCase()}">${escapeHtml(store.Class)}</span>
                <span class="store-badge size-badge">${escapeHtml(store.Size)}</span>
                <span class="store-badge type-badge" style="background-color: ${typeColor}; color: #1a1b26;">${escapeHtml(typeLabel)}</span>
                <span class="store-safety-stock editable-store-stock" data-store-code="${escapeHtml(store.Site)}" title="點擊編輯 Safety Stock">${safetyStock}</span>
            `;

            const checkbox = div.querySelector('input[type="checkbox"]');
            checkbox.checked = this.selectedStores.includes(originalIndex);
            checkbox.addEventListener('change', (e) => this.handleStoreToggle(e));

            const safetyStockSpan = div.querySelector('.store-safety-stock');
            safetyStockSpan.addEventListener('click', (e) => this.handleStoreStockEdit(e, store.Site));

            container.appendChild(div);
        });
        
        console.log('renderStores completed, selectedStores after:', this.selectedStores);
        // renderStores() 會重建所有 row；重建後必須重新套用目前篩選狀態
        this.applyFilters();
    }

    handleStoreToggle(e) {
        const index = parseInt(e.target.value);
        if (e.target.checked) {
            if (!this.selectedStores.includes(index)) {
                this.selectedStores.push(index);
            }
        } else {
            this.selectedStores = this.selectedStores.filter(i => i !== index);
        }
        this.saveToLocalStorage();
        this.updateStoresPreview();
        this.updateStoreCount();
        this.updateCockpitBar();
        this.scheduleAutoCalculate();
    }

    selectAllStores(includeHidden = false) {
        const selector = includeHidden
            ? '#storesContainer .store-item'
            : '#storesContainer .store-item:not(.filtered-out)';
        const visibleItems = document.querySelectorAll(selector);
        visibleItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                const index = parseInt(checkbox.value);
                if (!this.selectedStores.includes(index)) {
                    this.selectedStores.push(index);
                }
            }
        });
        this.saveToLocalStorage();
        this.updateStoresPreview();
        this.updateStoreCount();
        this.updateCockpitBar();
        this.scheduleAutoCalculate();
    }

    deselectAllStores() {
        const visibleItems = document.querySelectorAll('#storesContainer .store-item:not(.filtered-out)');
        visibleItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                checkbox.checked = false;
                const index = parseInt(checkbox.value);
                this.selectedStores = this.selectedStores.filter(i => i !== index);
            }
        });
        this.saveToLocalStorage();
        this.updateStoresPreview();
        this.updateStoreCount();
        this.updateCockpitBar();
        this.scheduleAutoCalculate();
    }

    invertSelection() {
        const visibleItems = document.querySelectorAll('#storesContainer .store-item:not(.filtered-out)');
        visibleItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                const index = parseInt(checkbox.value);
                if (checkbox.checked) {
                    if (!this.selectedStores.includes(index)) {
                        this.selectedStores.push(index);
                    }
                } else {
                    this.selectedStores = this.selectedStores.filter(i => i !== index);
                }
            }
        });
        this.saveToLocalStorage();
        this.updateStoresPreview();
        this.updateStoreCount();
        this.updateCockpitBar();
        this.scheduleAutoCalculate();
    }

    clearFilters() {
        this.activeFilters = {
            region: [],
            category: [],
            size: [],
            type: [],
            storeGroup: [],
            manager: [],
            specialStore: []
        };
        document.querySelectorAll('.filter-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });
        this.resetOmStoresPanel();
        this.applyFilters();
    }

    // ==================== 診斷函數 ====================
    
    /**
     * 全面診斷系統狀態和功能
     * 用於排查問題和驗證系統完整性
     */
    runDiagnostics() {
        console.clear();
        console.log('🔍 ========== 系統診斷開始 ==========');
        
        const results = {
            timestamp: new Date().toISOString(),
            checks: {}
        };
        
        // 1. 檢查店鋪數據
        console.log('\n📊 1. 店鋪數據檢查');
        results.checks.stores = {
            total: this.stores.length,
            valid: this.stores.filter(s => s.Site && s.Regional && s.Class && s.Size).length,
            withType: this.stores.filter(s => s.Type).length,
            typeMissing: this.stores.filter(s => !s.Type).map(s => s.Site)
        };
        console.log(`   ✓ 總店鋪數: ${results.checks.stores.total}`);
        console.log(`   ✓ 有效店鋪: ${results.checks.stores.valid}`);
        console.log(`   ✓ 有 Type 屬性: ${results.checks.stores.withType}`);
        if (results.checks.stores.typeMissing.length > 0) {
            console.warn(`   ⚠️  缺少 Type 的店鋪: ${results.checks.stores.typeMissing.join(', ')}`);
        }
        
        // 2. 檢查筛选功能
        console.log('\n🔽 2. 篩選功能檢查');
        results.checks.filters = {
            activeFilters: JSON.stringify(this.activeFilters),
            filterButtons: document.querySelectorAll('.filter-btn').length,
            activeButtons: document.querySelectorAll('.filter-btn.active').length,
            storeItemsTotal: document.querySelectorAll('.store-item').length,
            storeItemsVisible: document.querySelectorAll('.store-item:not([style*="display: none"])').length
        };
        console.log(`   ✓ 過濾按鈕總數: ${results.checks.filters.filterButtons}`);
        console.log(`   ✓ 活躍篩選: ${results.checks.filters.activeButtons}`);
        console.log(`   ✓ 店鋪項目: ${results.checks.filters.storeItemsTotal} (${results.checks.filters.storeItemsVisible} 可見)`);
        console.log(`   ✓ activeFilters 內容:`, this.activeFilters);
        
        // 3. 檢查店鋪選擇
        console.log('\n✅ 3. 店鋪選擇檢查');
        results.checks.selection = {
            selectedCount: this.selectedStores.length,
            selectedIndices: this.selectedStores,
            selectedStores: this.selectedStores.map(idx => this.stores[idx]?.Site || `unknown-${idx}`),
            checkboxesChecked: document.querySelectorAll('.store-item input:checked').length
        };
        console.log(`   ✓ 已選店鋪: ${results.checks.selection.selectedCount}`);
        console.log(`   ✓ 選中複選框: ${results.checks.selection.checkboxesChecked}`);
        if (results.checks.selection.selectedCount !== results.checks.selection.checkboxesChecked) {
            console.warn('   ⚠️  selectedStores 與複選框不同步！');
        }
        
        // 4. 檢查對照表
        console.log('\n📋 4. 對照表檢查');
        const matrixValid = this.isValidMatrixDraftStructure(this.matrixDraft);
        results.checks.matrix = {
            draftStructureValid: matrixValid,
            hasCustomSafetyStock: Object.keys(this.customSafetyStock).length,
            hasCustomStoreStock: Object.keys(this.customStoreStock).length,
            draftSize: Object.keys(this.matrixDraft).length
        };
        console.log(`   ✓ Draft 3D 結構有效: ${matrixValid}`);
        console.log(`   ✓ 自訂對照表值: ${results.checks.matrix.hasCustomSafetyStock}`);
        console.log(`   ✓ 自訂店鋪值: ${results.checks.matrix.hasCustomStoreStock}`);
        
        // 5. 檢查 DOM 元素
        console.log('\n🎨 5. DOM 元素檢查');
        const requiredElements = [
            'storesContainer',
            'matrixContainer',
            'matrixSummaryContainer',
            'calculateBtn',
            'exportBtn',
            'selectAllBtn',
            'clearFiltersBtn'
        ];
        results.checks.dom = {};
        requiredElements.forEach(id => {
            const exists = !!document.getElementById(id);
            results.checks.dom[id] = exists;
            console.log(`   ${exists ? '✓' : '✗'} #${id}`);
        });
        
        // 6. 檢查計算相關
        console.log('\n🧮 6. 計算功能檢查');
        results.checks.calculation = {
            resultsCount: this.results.length,
            summaryResultsCount: this.summaryResults.length,
            lastCalculationTime: this.lastCalculationTime || '未執行'
        };
        console.log(`   ✓ 計算結果: ${results.checks.calculation.resultsCount}`);
        console.log(`   ✓ 摘要結果: ${results.checks.calculation.summaryResultsCount}`);
        
        // 7. 檢查本地儲存
        console.log('\n💾 7. 本地儲存檢查');
        try {
            const stored = localStorage.getItem('safetyStockCalculatorV2');
            results.checks.localStorage = {
                exists: !!stored,
                size: stored ? (stored.length / 1024).toFixed(2) + ' KB' : 'N/A'
            };
            console.log(`   ✓ 儲存存在: ${results.checks.localStorage.exists}`);
            console.log(`   ✓ 大小: ${results.checks.localStorage.size}`);
        } catch (e) {
            console.error('   ✗ localStorage 讀取失敗:', e.message);
        }
        
        console.log('\n📋 診斷報告:', results);
        console.log('🔍 ========== 診斷完成 ==========');
        
        return results;
    }

    // 重設所有店鋪的自訂 Safety Stock 值，恢復為對照表的值
    resetCustomStoreStock() {
        if (this.selectedStores.length === 0) {
            alert('⚠️ 請先選擇要重設的店鋪');
            return;
        }

        // 只處理實際存在自訂值的店鋪；重複按「重設」時也能提供明確反饋
        const customStoreStock = this.customStoreStock || (this.customStoreStock = {});
        const storesToReset = [...new Set(this.selectedStores)]
            .map(index => this.stores[index])
            .filter(store => store && Object.prototype.hasOwnProperty.call(customStoreStock, store.Site));

        if (storesToReset.length === 0) {
            alert('ℹ️ 已選擇的店鋪目前沒有自訂 Safety Stock 值');
            return;
        }

        const storeNames = storesToReset
            .map(store => `${store.Site} ${store.Shop}`)
            .join('\n');

        const confirmMsg = `確認要重設以下 ${storesToReset.length} 間店鋪的自訂 Safety Stock 值？\n\n${storeNames}\n\n系統將恢復使用對照表中的數值。`;

        if (!confirm(confirmMsg)) {
            return;
        }

        // 清除選中店鋪的自訂值
        storesToReset.forEach(store => {
            delete customStoreStock[store.Site];
        });

        // 保存到 localStorage、重新渲染，並立即重算結果，避免表格仍顯示舊值
        this.saveToLocalStorage();
        this.renderStores();
        if (this._calcDebounce) {
            clearTimeout(this._calcDebounce);
            this._calcDebounce = null;
        }
        this.calculate({ silent: true });

        alert(`✅ 已成功重設 ${storesToReset.length} 間店鋪的自訂值`);
    }

    handleFilterClick(e) {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        
        const filterType = btn.dataset.filter;
        const filterValue = btn.dataset.value;
        
        // 如果是OM按鈕，顯示店鋪清單
        if (filterType === 'manager') {
            this.showOmStoresPanel(filterValue);
        }
        
        btn.classList.toggle('active');
        
        if (btn.classList.contains('active')) {
            if (!this.activeFilters[filterType].includes(filterValue)) {
                this.activeFilters[filterType].push(filterValue);
            }
        } else {
            this.activeFilters[filterType] = this.activeFilters[filterType].filter(v => v !== filterValue);
            if (filterType === 'manager' && this.activeFilters.manager.length === 0) {
                this.resetOmStoresPanel();
            }
        }
        
        this.applyFilters();
    }

    // 顯示OM店鋪清單面板（右側面板版本）
    showOmStoresPanel(omName) {
        const title = document.getElementById('omStoresTitle');
        const content = document.getElementById('omStoresContent');
        const count = document.getElementById('omStoresCount');
        
        if (!title || !content) return;
        
        // 獲取該OM的店鋪
        const omStores = this.stores.filter(store => store.OM === omName);
        
        // 更新標題
        title.innerHTML = `👤 ${escapeHtml(omName)} 負責的店鋪`;
        if (count) count.textContent = `共 ${omStores.length} 間`;
        
        // 生成店鋪清單HTML
        if (omStores.length === 0) {
            content.innerHTML = `
                <div class="om-empty-message">
                    <p>暫無店鋪資料</p>
                </div>
            `;
        } else {
            // 按區域和代號排序
            const sortedStores = omStores.sort((a, b) => {
                if (a.Regional !== b.Regional) return a.Regional.localeCompare(b.Regional);
                return a.Site.localeCompare(b.Site);
            });
            
            let html = '<div class="om-stores-grid">';
            sortedStores.forEach(store => {
                const regionColor = store.Regional === 'HK' ? 'var(--color-region-hk)' : 'var(--color-region-mo)';
                const isSpecial = isSpecialAttentionStore(store);
                const codeBg = isSpecial
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : regionColor;
                html += `
                    <div class="om-store-item">
                        <span class="om-store-code${isSpecial ? ' om-store-code-special' : ''}" style="background:${codeBg};color:${isSpecial ? '#1a1b26' : 'white'}"${isSpecial ? ' title="⭐ 需特別關注"' : ''}>${escapeHtml(store.Site)}</span>
                        <span class="om-store-name">${escapeHtml(store.Shop)}</span>
                        <div class="om-store-badges">
                            <span class="om-store-badge" style="background:${this.getCategoryColor(store.Class)};color:#1a1b26">${escapeHtml(store.Class)}</span>
                            <span class="om-store-badge" style="background:#666;color:white">${escapeHtml(store.Size)}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            
            // 添加區域分佈統計
            const hkStores = omStores.filter(s => s.Regional === 'HK').length;
            const moStores = omStores.filter(s => s.Regional === 'MO').length;
            
            html += `
                <div class="om-stores-summary">
                    <span>📍 區域分佈：</span>
                    <span>
                        ${hkStores > 0 ? `<span style="color:var(--color-region-hk)">🇭🇰 香港 ${hkStores} 間</span>` : ''}
                        ${hkStores > 0 && moStores > 0 ? ' / ' : ''}
                        ${moStores > 0 ? `<span style="color:var(--color-region-mo)">🇲🇴 澳門 ${moStores} 間</span>` : ''}
                    </span>
                </div>
            `;
            
            content.innerHTML = html;
        }
    }

    // 關閉OM店鋪清單面板
    closeOmStoresPanel() {
        const panel = document.getElementById('omStoresPanel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    // 清除 OM 篩選後，將右側面板恢復為初始提示狀態
    resetOmStoresPanel() {
        const panel = document.getElementById('omStoresPanel');
        const title = document.getElementById('omStoresTitle');
        const count = document.getElementById('omStoresCount');
        const content = document.getElementById('omStoresContent');

        if (panel) panel.style.display = 'flex';
        if (title) title.textContent = '👤 請選擇營運經理查看店鋪';
        if (count) count.textContent = '';
        if (content) {
            content.innerHTML = `
                <div class="om-empty-state">
                    <div class="om-empty-icon">🏪</div>
                    <p>點擊左側營運經理按鈕</p>
                    <p class="om-empty-hint">查看該經理負責的店鋪清單</p>
                </div>
            `;
        }
    }

    // 獲取類別顏色
    getCategoryColor(category) {
        const colors = {
            'A': 'var(--color-category-a)',
            'B': 'var(--color-category-b)',
            'C': 'var(--color-category-c)',
            'D': 'var(--color-category-d)'
        };
        return colors[category] || '#666';
    }

    applyFilters() {
        const container = document.getElementById('storesContainer');
        if (!container) return;
        
        const items = container.querySelectorAll('.store-item');
        items.forEach(item => {
            let show = true;
            
            // 檢查區域篩選
            if (this.activeFilters.region.length > 0) {
                show = show && this.activeFilters.region.includes(item.dataset.region);
            }
            
            // 檢查分類篩選
            if (this.activeFilters.category.length > 0) {
                show = show && this.activeFilters.category.includes(item.dataset.category);
            }
            
            // 檢查尺寸篩選
            if (this.activeFilters.size.length > 0) {
                show = show && this.activeFilters.size.includes(item.dataset.size);
            }
            
            // 檢查客源類型篩選
            if (this.activeFilters.type.length > 0) {
                show = show && this.activeFilters.type.includes(item.dataset.type);
            }
            
            // 檢查店鋪組別篩選 (HA/HB/HC/HD)
            if (this.activeFilters.storeGroup.length > 0) {
                show = show && this.activeFilters.storeGroup.includes(item.dataset.storeGroup);
            }
            
            // 檢查營運經理篩選
            if (this.activeFilters.manager.length > 0) {
                show = show && this.activeFilters.manager.some(m => item.dataset.manager === m);
            }
            
            // 檢查需特別關注店鋪篩選（依 CSV「需特別關注」欄位標記）
            if (this.activeFilters.specialStore.length > 0) {
                show = show && item.dataset.specialattention === '1';
            }
            
            if (show) {
                item.style.display = 'flex';
                item.classList.remove('filtered-out');
            } else {
                item.style.display = 'none';
                item.classList.add('filtered-out');
            }
        });
        
        this.updateStoreCount();
        this.updateStoresPreview();
    }

    updateCheckboxes() {
        this.stores.forEach((_, index) => {
            const checkbox = document.getElementById(`store-${index}`);
            if (checkbox) {
                checkbox.checked = this.selectedStores.includes(index);
            }
        });
    }

    updateStoresPreview() {
        const preview = document.getElementById('storesPreview');
        if (!preview) return;
        
        const selectedCount = this.selectedStores.length;
        const totalCount = this.stores.length;
        
        if (selectedCount === 0) {
            preview.innerHTML = `
                <div class="no-selection">
                    <p>尚未選擇任何店鋪</p>
                    <p class="hint">請勾選左側店鋪或使用篩選功能</p>
                </div>
            `;
            try { this.updateCockpitBar(); } catch (e) {}
            return;
        }
        
        // 按類型分組統計（考慮個別店鋪的自訂值）
        const typeStats = {};
        let totalCustomSS = 0;
        const mode = this.calculationMode;
        this.selectedStores.forEach(idx => {
            const store = this.stores[idx];
            // 防禦性檢查：確保店鋪存在
            if (!store) {
                console.warn(`Store at index ${idx} is undefined, skipping`);
                return;
            }
            const code = this.buildModeTypeCode(store, mode);

            // 計算該店鋪的實際 Safety Stock（優先使用個別店鋪的自訂值，否則使用對照表值）
            let storeActualSS;
            if (this.customStoreStock[store.Site] !== undefined) {
                storeActualSS = this.customStoreStock[store.Site];
            } else {
                storeActualSS = this.getSafetyStock(store.Regional, store.Class, store.Size, store.Type || 'M', mode);
            }

            const sizeDisplay = mode === 'mode3' ? '不分類' : store.Size;

            if (!typeStats[code]) {
                typeStats[code] = {
                    region: store.Regional,
                    category: store.Class,
                    size: sizeDisplay,
                    safetyStock: storeActualSS,
                    minSafetyStock: storeActualSS,
                    maxSafetyStock: storeActualSS,
                    avgCustomSS: 0,
                    totalCustomSS: 0,
                    count: 0
                };
            } else {
                typeStats[code].minSafetyStock = Math.min(typeStats[code].minSafetyStock, storeActualSS);
                typeStats[code].maxSafetyStock = Math.max(typeStats[code].maxSafetyStock, storeActualSS);
            }
            typeStats[code].count++;
            typeStats[code].totalCustomSS += storeActualSS;
            totalCustomSS += storeActualSS;
        });
        
        let html = `
            <div class="preview-summary">
                <span>已選擇: <strong>${selectedCount} / ${totalCount}</strong> 間店鋪</span>
            </div>
            <div class="preview-types">
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>代碼</th>
                            <th>區域</th>
                            <th>類別</th>
                            <th>面積</th>
                            <th>店數</th>
                            <th>SS</th>
                            <th>小計</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        let totalSS = 0;
        Object.keys(typeStats).sort().forEach(code => {
            const stat = typeStats[code];
            const subtotal = stat.totalCustomSS; // 使用考慮個別店鋪自訂值的總計
            totalSS += subtotal;
            const isMixed = stat.minSafetyStock !== stat.maxSafetyStock;
            const avgSafetyStock = Math.round(stat.totalCustomSS / stat.count);
            const displaySafetyStock = isMixed ? avgSafetyStock : stat.safetyStock;
            const ssTitle = isMixed ? '此群組含不同自訂值，顯示平均值' : '';
            html += `
                <tr>
                    <td><strong>${code}</strong></td>
                    <td>${stat.region}</td>
                    <td>${stat.category}</td>
                    <td>${stat.size}</td>
                    <td style="text-align:center">${stat.count}</td>
                    <td style="text-align:center" title="${ssTitle}">${displaySafetyStock}</td>
                    <td style="text-align:center"><strong>${subtotal}</strong></td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="4">總計</td>
                            <td style="text-align:center"><strong>${selectedCount}</strong></td>
                            <td></td>
                            <td style="text-align:center" class="total-highlight"><strong>${totalSS}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        
        preview.innerHTML = html;
        try { this.updateCockpitBar(); } catch (e) {}
    }

    updateStoreCount() {
        const countEl = document.getElementById('storeCount');
        if (countEl) {
            const visibleItems = document.querySelectorAll('#storesContainer .store-item:not(.filtered-out)');
            const selectedVisible = Array.from(visibleItems).filter(item => 
                item.querySelector('input[type="checkbox"]').checked
            ).length;
            countEl.textContent = `顯示 ${visibleItems.length} 間 / 已選 ${this.selectedStores.length} 間`;
        }
    }

    // ==================== Safety Stock Matrix ====================
    
    getSafetyStock(region, category, size, type = 'M', mode = this.calculationMode) {
        if (mode === 'mode2') {
            const key = `${region}-${category}-${size}`;
            if (this.customSafetyStockMode2[key] !== undefined) {
                return this.customSafetyStockMode2[key];
            }
            return getSafetyStockValue(region, category, size, 'M');
        }

        if (mode === 'mode3') {
            const key = `${region}-${category}-${type}`;
            if (this.customSafetyStockMode3[key] !== undefined) {
                return this.customSafetyStockMode3[key];
            }
            return getSafetyStockValue(region, category, 'M', type);
        }

        const key = `${region}-${category}-${type}-${size}`;
        if (this.customSafetyStock[key] !== undefined) {
            return this.customSafetyStock[key];
        }
        return getSafetyStockValue(region, category, size, type);
    }

    getMatrixDraftValue(region, category, size, type = 'M', mode = this.calculationMode) {
        if (mode === 'mode2') {
            if (this.matrixDraftMode2?.[region]?.[category]?.[size] !== undefined) {
                return this.matrixDraftMode2[region][category][size];
            }
            return this.getSafetyStock(region, category, size, type, mode);
        }

        if (mode === 'mode3') {
            if (this.matrixDraftMode3?.[region]?.[category]?.[type] !== undefined) {
                return this.matrixDraftMode3[region][category][type];
            }
            return this.getSafetyStock(region, category, size, type, mode);
        }

        if (this.matrixDraft?.[region]?.[category]?.[type]?.[size] !== undefined) {
            return this.matrixDraft[region][category][type][size];
        }
        return this.getSafetyStock(region, category, size, type, mode);
    }

    buildMatrixDraftFromApplied() {
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];
        const categories = ['A', 'B', 'C', 'D'];
        const regions = ['HK', 'MO'];
        const types = ['T', 'M', 'L'];
        const matrix = {};

        regions.forEach(region => {
            matrix[region] = {};
            categories.forEach(category => {
                matrix[region][category] = {};
                types.forEach(type => {
                    matrix[region][category][type] = {};
                    sizes.forEach(size => {
                        matrix[region][category][type][size] = this.getSafetyStock(region, category, size, type, 'mode1');
                    });
                });
            });
        });

        return matrix;
    }

    buildMatrixDraftMode2() {
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];
        const categories = ['A', 'B', 'C', 'D'];
        const regions = ['HK', 'MO'];
        const matrix = {};

        regions.forEach(region => {
            matrix[region] = {};
            categories.forEach(category => {
                matrix[region][category] = {};
                sizes.forEach(size => {
                    // 用 getSafetyStock（含該模式自訂值），避免草稿重建時顯示值與實際計算值脫鉤
                    matrix[region][category][size] = this.getSafetyStock(region, category, size, 'M', 'mode2');
                });
            });
        });

        return matrix;
    }

    buildMatrixDraftMode3() {
        const categories = ['A', 'B', 'C', 'D'];
        const regions = ['HK', 'MO'];
        const types = ['T', 'M', 'L'];
        const matrix = {};

        regions.forEach(region => {
            matrix[region] = {};
            categories.forEach(category => {
                matrix[region][category] = {};
                types.forEach(type => {
                    // 用 getSafetyStock（含該模式自訂值），避免草稿重建時顯示值與實際計算值脫鉤
                    matrix[region][category][type] = this.getSafetyStock(region, category, 'M', type, 'mode3');
                });
            });
        });

        return matrix;
    }

    buildDefaultMatrix() {
        return SAFETY_STOCK_MATRIX
            ? JSON.parse(JSON.stringify(SAFETY_STOCK_MATRIX))
            : this.buildMatrixDraftFromApplied();
    }

    // 驗證matrixDraft是否為有效的3D結構 (模式1)
    isValidMatrixDraftStructure(matrix) {
        if (!matrix || typeof matrix !== 'object') return false;
        
        const regions = ['HK', 'MO'];
        const categories = ['A', 'B', 'C', 'D'];
        const types = ['T', 'M', 'L'];
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];
        
        try {
            for (let region of regions) {
                if (!matrix[region]) return false;
                for (let cat of categories) {
                    if (!matrix[region][cat]) return false;
                    for (let type of types) {
                        if (!matrix[region][cat][type]) return false;
                        for (let size of sizes) {
                            const val = matrix[region][cat][type][size];
                            if (typeof val !== 'number' || val < 0) return false;
                        }
                    }
                }
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    isValidMatrixDraftMode2(matrix) {
        if (!matrix || typeof matrix !== 'object') return false;

        const regions = ['HK', 'MO'];
        const categories = ['A', 'B', 'C', 'D'];
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];

        try {
            for (let region of regions) {
                if (!matrix[region]) return false;
                for (let cat of categories) {
                    if (!matrix[region][cat]) return false;
                    for (let size of sizes) {
                        const val = matrix[region][cat][size];
                        if (typeof val !== 'number' || val < 0) return false;
                    }
                }
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    isValidMatrixDraftMode3(matrix) {
        if (!matrix || typeof matrix !== 'object') return false;

        const regions = ['HK', 'MO'];
        const categories = ['A', 'B', 'C', 'D'];
        const types = ['T', 'M', 'L'];

        try {
            for (let region of regions) {
                if (!matrix[region]) return false;
                for (let cat of categories) {
                    if (!matrix[region][cat]) return false;
                    for (let type of types) {
                        const val = matrix[region][cat][type];
                        if (typeof val !== 'number' || val < 0) return false;
                    }
                }
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    renderSafetyStockMatrix() {
        const container = document.getElementById('matrixContainer');
        if (!container) return;
        
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];
        const categories = ['A', 'B', 'C', 'D'];
        const regions = ['HK', 'MO'];
        const types = ['T', 'M', 'L'];
        const typeLabels = { 'T': '遊客', 'M': '混合', 'L': '本地' };
        const mode = this.calculationMode;
        
        let html = '';
        
        regions.forEach(region => {
            html += `
                <div class="matrix-region">
                    <h4 class="region-title region-${region.toLowerCase()}">${REGION_DEFINITIONS[region].name} (${region})</h4>
                    <table class="matrix-table">
                        <thead>
                            <tr>
            `;

            if (mode === 'mode2') {
                html += `
                                <th>級別 \\ 面積</th>
                                ${sizes.map(s => `<th>${s}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                `;

                categories.forEach(cat => {
                    html += `<tr><td class="category-cell category-${cat.toLowerCase()}">${cat}級</td>`;
                    sizes.forEach(size => {
                        const value = this.getMatrixDraftValue(region, cat, size, 'M', mode);
                        const key = `${region}-${cat}-${size}`;
                        html += `
                            <td class="matrix-cell" data-key="${key}">
                                <span class="display-value">${value}</span>
                                <input type="number" class="edit-value" value="${value}" min="0" style="display:none">
                            </td>
                        `;
                    });
                    html += '</tr>';
                });
            } else if (mode === 'mode3') {
                html += `
                                <th>級別 \\ 類別</th>
                                ${types.map(t => `<th>${typeLabels[t]}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                `;

                categories.forEach(cat => {
                    html += `<tr><td class="category-cell category-${cat.toLowerCase()}">${cat}級</td>`;
                    types.forEach(type => {
                        const value = this.getMatrixDraftValue(region, cat, 'M', type, mode);
                        const key = `${region}-${cat}-${type}`;
                        html += `
                            <td class="matrix-cell" data-key="${key}">
                                <span class="display-value">${value}</span>
                                <input type="number" class="edit-value" value="${value}" min="0" style="display:none">
                            </td>
                        `;
                    });
                    html += '</tr>';
                });
            } else {
                html += `
                                <th>級別 \\ 類別 \\ 面積</th>
                                ${sizes.map(s => `<th>${s}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                `;

                categories.forEach(cat => {
                    types.forEach(type => {
                        const rowLabel = `${cat}級(${typeLabels[type]})`;
                        html += `<tr><td class="category-cell category-${cat.toLowerCase()}">${rowLabel}</td>`;
                        sizes.forEach(size => {
                            const value = this.getMatrixDraftValue(region, cat, size, type, mode);
                            const key = `${region}-${cat}-${type}-${size}`;
                            html += `
                                <td class="matrix-cell" data-key="${key}">
                                    <span class="display-value">${value}</span>
                                    <input type="number" class="edit-value" value="${value}" min="0" style="display:none">
                                </td>
                            `;
                        });
                        html += '</tr>';
                    });
                });
            }
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // 渲染矩陣摘要 + 綁定直接點擊編輯（免去編輯/保存兩步）
        this.renderMatrixSummary();
        this.setupMatrixInlineEdit();
        try { this.updateCockpitBar(); } catch (e) {}
    }

    // 對照表直接編輯：點擊數字即改，失焦/Enter 自動保存並同步全鏈路
    setupMatrixInlineEdit() {
        const container = document.getElementById('matrixContainer');
        if (!container || this._matrixEditBound) return;
        this._matrixEditBound = true;

        container.addEventListener('click', (e) => {
            const cell = e.target.closest('.matrix-cell');
            if (!cell || cell.classList.contains('editing')) return;
            // 若點到 input 本身則忽略
            if (e.target.tagName === 'INPUT') return;
            this.enableSingleMatrixCell(cell);
        });

        container.addEventListener('focusout', (e) => {
            const input = e.target.closest?.('.matrix-cell .edit-value');
            if (!input) return;
            const cell = input.closest('.matrix-cell');
            if (cell && cell.classList.contains('editing')) {
                setTimeout(() => {
                    if (!cell.contains(document.activeElement)) this.saveSingleMatrixCell(cell);
                }, 120);
            }
        }, true);

        container.addEventListener('keydown', (e) => {
            const input = e.target.closest?.('.matrix-cell .edit-value');
            if (!input) return;
            const cell = input.closest('.matrix-cell');
            if (!cell || !cell.classList.contains('editing')) return;
            if (e.key === 'Enter') { e.preventDefault(); this.saveSingleMatrixCell(cell); }
            else if (e.key === 'Escape') { e.preventDefault(); this.cancelSingleMatrixCell(cell); }
        }, true);

        container.addEventListener('input', (e) => {
            if (e.target.closest?.('.matrix-cell .edit-value')) {
                try { this.renderMatrixSummary(); } catch (err) {}
            }
        });
    }

    enableSingleMatrixCell(cell) {
        if (cell.classList.contains('editing')) return;
        const display = cell.querySelector('.display-value');
        const input = cell.querySelector('.edit-value');
        if (!display || !input) return;
        cell.classList.add('editing');
        display.style.display = 'none';
        input.style.display = 'inline-block';
        input.focus();
        input.select();
    }

    cancelSingleMatrixCell(cell) {
        const display = cell.querySelector('.display-value');
        const input = cell.querySelector('.edit-value');
        if (!display || !input) return;
        input.value = display.textContent;
        cell.classList.remove('editing');
        display.style.display = 'inline-block';
        input.style.display = 'none';
        this.flushPendingWeightApply();
    }

    saveSingleMatrixCell(cell) {
        if (!cell.classList.contains('editing')) return;
        const key = cell.dataset.key;
        const input = cell.querySelector('.edit-value');
        const display = cell.querySelector('.display-value');
        if (!key || !input || !display) return;
        const value = Math.max(0, parseInt(input.value) || 0);
        const parts = key.split('-');
        const mode = this.calculationMode;
        try {
            if (mode === 'mode2' && parts.length === 3) {
                const [region, category, size] = parts;
                if (!this.matrixDraftMode2[region]) this.matrixDraftMode2[region] = {};
                if (!this.matrixDraftMode2[region][category]) this.matrixDraftMode2[region][category] = {};
                this.matrixDraftMode2[region][category][size] = value;
            } else if (mode === 'mode3' && parts.length === 3) {
                const [region, category, type] = parts;
                if (!this.matrixDraftMode3[region]) this.matrixDraftMode3[region] = {};
                if (!this.matrixDraftMode3[region][category]) this.matrixDraftMode3[region][category] = {};
                this.matrixDraftMode3[region][category][type] = value;
            } else if (parts.length === 4) {
                const [region, category, type, size] = parts;
                if (!this.matrixDraft[region]) this.matrixDraft[region] = {};
                if (!this.matrixDraft[region][category]) this.matrixDraft[region][category] = {};
                if (!this.matrixDraft[region][category][type]) this.matrixDraft[region][category][type] = {};
                this.matrixDraft[region][category][type][size] = value;
            }
        } catch (err) { console.warn('saveSingleMatrixCell failed', err); }
        display.textContent = value;
        cell.classList.remove('editing');
        display.style.display = 'inline-block';
        input.style.display = 'none';
        // 全鏈路自動同步：草稿→生效→店鋪→重算，不彈 confirm
        this.saveToLocalStorage();
        try { this.syncDraftToApplied({ silent: true }); } catch (e) {}
        try { this.renderStores(); } catch (e) {}
        try { this.renderMatrixSummary(); } catch (e) {}
        try { this.updateCockpitBar(); } catch (e) {}
        this.scheduleAutoCalculate();
        this.flushPendingWeightApply();
    }

    // 計算並渲染對照表統計摘要
    calculateMatrixSummary() {
        const regions = ['HK', 'MO'];
        const categories = ['A', 'B', 'C', 'D'];
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];
        const types = ['T', 'M', 'L'];
        const mode = this.calculationMode;
        
        const summary = {
            HK: { values: [], storeCounts: 0 },
            MO: { values: [], storeCounts: 0 }
        };
        
        // 計算各區域的平均值和店舖數
        regions.forEach(region => {
            if (mode === 'mode2') {
                categories.forEach(category => {
                    sizes.forEach(size => {
                        const value = this.getMatrixDraftValue(region, category, size, 'M', mode);
                        summary[region].values.push(value);

                        const storeCount = this.stores.filter(s => s.Regional === region && s.Class === category && s.Size === size).length;
                        summary[region].storeCounts += storeCount;
                    });
                });
            } else if (mode === 'mode3') {
                categories.forEach(category => {
                    types.forEach(type => {
                        const value = this.getMatrixDraftValue(region, category, 'M', type, mode);
                        summary[region].values.push(value);

                        const storeCount = this.stores.filter(s => s.Regional === region && s.Class === category && s.Type === type).length;
                        summary[region].storeCounts += storeCount;
                    });
                });
            } else {
                categories.forEach(category => {
                    sizes.forEach(size => {
                        types.forEach(type => {
                            const value = this.getMatrixDraftValue(region, category, size, type, mode);
                            summary[region].values.push(value);

                            const storeCount = this.stores.filter(s => s.Regional === region && s.Class === category && s.Size === size && s.Type === type).length;
                            summary[region].storeCounts += storeCount;
                        });
                    });
                });
            }
        });
        
        // 計算各區域的統計數據
        const getRegionStats = (region) => {
            const values = summary[region].values;
            const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '0';
            return { avg, values };
        };
        
        // 計算整體平均值
        const allValues = [...summary.HK.values, ...summary.MO.values];
        const overallAvg = allValues.length > 0 ? (allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(1) : '0';
        
        // 計算依現有店舖數量估算總量
        let totalHK = 0, totalMO = 0;
        const storesForTotal = this.selectedStores.length > 0
            ? this.selectedStores.map(idx => this.stores[idx]).filter(Boolean)
            : this.stores;
        storesForTotal.forEach(store => {
            const value = this.getMatrixDraftValue(store.Regional, store.Class, store.Size, store.Type);
            if (store.Regional === 'HK') {
                totalHK += value;
            } else {
                totalMO += value;
            }
        });
        const totalAll = totalHK + totalMO;
        const totalLabel = this.selectedStores.length > 0
            ? `依已選 ${storesForTotal.length} 間店舖估算總量`
            : '依所有店舖數量估算總量';
        
        return {
            hk: getRegionStats('HK'),
            mo: getRegionStats('MO'),
            overallAvg,
            totalHK,
            totalMO,
            totalAll,
            totalLabel
        };
    }

    renderMatrixSummary() {
        const summaryContainer = document.getElementById('matrixSummaryContainer');
        if (!summaryContainer) return;
        
        const summary = this.calculateMatrixSummary();

        // 目標總量行（原預覽摘要的增量資訊，二合一後併入此處）
        let targetHtml = '';
        const targetTotal = Math.round(this.weightConfig?.targetTotal || 0);
        if (targetTotal > 0) {
            const diff = targetTotal - summary.totalAll;
            const diffText = diff === 0 ? '✅ 已對齊' : `（差 ${diff}）`;
            targetHtml = `
                    <div class="summary-item highlight">
                        <span class="summary-label">🎯 目標總量:</span>
                        <span class="summary-value">${targetTotal} / 實際 ${summary.totalAll} ${diffText}</span>
                    </div>`;
        }

        const html = `
            <div class="matrix-summary-box">
                <h4>📈 統計摘要</h4>
                <div class="summary-content">
                    <div class="summary-item">
                        <span class="summary-label">🇭🇰 香港 (HK):</span>
                        <span class="summary-value">平均 ${summary.hk.avg}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">🇲🇴 澳門 (MO):</span>
                        <span class="summary-value">平均 ${summary.mo.avg}</span>
                    </div>
                    <div class="summary-item highlight">
                        <span class="summary-label">📈 整體平均:</span>
                        <span class="summary-value">${summary.overallAvg}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">🧮 ${summary.totalLabel}:</span>
                        <span class="summary-value">${summary.totalAll} (HK ${summary.totalHK} / MO ${summary.totalMO})</span>
                    </div>${targetHtml}
                </div>
            </div>
        `;
        
        summaryContainer.innerHTML = html;
        try { this.updateCockpitBar(); } catch (e) {}
    }

    enableMatrixEdit() {
        document.querySelectorAll('.matrix-cell').forEach(cell => {
            cell.classList.add('editing');
            cell.querySelector('.display-value').style.display = 'none';
            cell.querySelector('.edit-value').style.display = 'inline-block';
        });
        
        document.getElementById('editMatrixBtn').style.display = 'none';
        document.getElementById('saveMatrixBtn').style.display = 'inline-block';
        document.getElementById('cancelMatrixBtn').style.display = 'inline-block';
        document.getElementById('resetMatrixBtn').style.display = 'inline-block';
        
        // 設置即時摘要更新
        this.setupMatrixEditListeners();
    }

    saveMatrixEdit() {
        try {
            let savedCount = 0;
            const mode = this.calculationMode;
            document.querySelectorAll('.matrix-cell').forEach(cell => {
                try {
                    const key = cell.dataset.key;
                    const input = cell.querySelector('.edit-value');
                    const display = cell.querySelector('.display-value');
                    
                    if (!input || !display) {
                        console.warn(`跳過無效單元格: ${key}`);
                        return;
                    }
                    
                    const value = Math.max(0, parseInt(input.value) || 0);
                    const parts = key.split('-');

                    if (mode === 'mode2') {
                        if (parts.length !== 3) {
                            console.error(`無效的 key 格式: ${key} (長度: ${parts.length})`);
                            return;
                        }

                        const [region, category, size] = parts;
                        if (!this.matrixDraftMode2[region]) this.matrixDraftMode2[region] = {};
                        if (!this.matrixDraftMode2[region][category]) this.matrixDraftMode2[region][category] = {};
                        this.matrixDraftMode2[region][category][size] = value;
                    } else if (mode === 'mode3') {
                        if (parts.length !== 3) {
                            console.error(`無效的 key 格式: ${key} (長度: ${parts.length})`);
                            return;
                        }

                        const [region, category, type] = parts;
                        if (!this.matrixDraftMode3[region]) this.matrixDraftMode3[region] = {};
                        if (!this.matrixDraftMode3[region][category]) this.matrixDraftMode3[region][category] = {};
                        this.matrixDraftMode3[region][category][type] = value;
                    } else {
                        if (parts.length !== 4) {
                            console.error(`無效的 key 格式: ${key} (長度: ${parts.length})`);
                            return;
                        }

                        const [region, category, type, size] = parts;
                        if (!this.matrixDraft[region]) this.matrixDraft[region] = {};
                        if (!this.matrixDraft[region][category]) this.matrixDraft[region][category] = {};
                        if (!this.matrixDraft[region][category][type]) this.matrixDraft[region][category][type] = {};
                        this.matrixDraft[region][category][type][size] = value;
                    }

                    display.textContent = value;
                    
                    cell.classList.remove('editing');
                    display.style.display = 'inline-block';
                    input.style.display = 'none';
                    
                    savedCount++;
                } catch (cellErr) {
                    console.error('儲存單個單元格時出錯:', cellErr);
                }
            });
            
            console.log(`成功保存 ${savedCount} 個單元格`);
            
            document.getElementById('editMatrixBtn').style.display = 'inline-block';
            document.getElementById('saveMatrixBtn').style.display = 'none';
            document.getElementById('cancelMatrixBtn').style.display = 'none';
            document.getElementById('resetMatrixBtn').style.display = 'none';
            
            this.saveToLocalStorage();
            this.renderMatrixSummary(); // 更新統計摘要
            this.showToast(`✅ 對照表已保存 (${savedCount} 個值)，已自動同步店鋪`);
            try { this.syncDraftToApplied({ silent: true }); } catch (e) {}
            try { this.renderStores(); } catch (e) {}
            try { this.updateCockpitBar(); } catch (e) {}
            this.scheduleAutoCalculate();
        } catch (err) {
            console.error('保存矩陣編輯時出錯:', err);
            this.showToast('❌ 保存失敗，請檢查瀏覽器控制台查看錯誤信息');
        }
    }

    cancelMatrixEdit() {
        this.renderSafetyStockMatrix();
        
        document.getElementById('editMatrixBtn').style.display = 'inline-block';
        document.getElementById('saveMatrixBtn').style.display = 'none';
        document.getElementById('cancelMatrixBtn').style.display = 'none';
        document.getElementById('resetMatrixBtn').style.display = 'none';
    }

    resetMatrix() {
        if (!this._adminVerified) { this.showToast('❌ 請先解鎖管理區域'); return; }
        if (confirm('確定要重置 Safety Stock 對照表為預設值嗎？')) {
            if (this.calculationMode === 'mode2') {
                this.customSafetyStockMode2 = {};
                this.matrixDraftMode2 = this.buildMatrixDraftMode2();
            } else if (this.calculationMode === 'mode3') {
                this.customSafetyStockMode3 = {};
                this.matrixDraftMode3 = this.buildMatrixDraftMode3();
            } else {
                this.customSafetyStock = {};
                this.matrixDraft = this.buildDefaultMatrix();
            }
            this.renderSafetyStockMatrix();
            this.enableMatrixEdit(); // 保持編輯模式
            this.saveToLocalStorage();
            this.renderMatrixSummary(); // 更新統計摘要
        }
    }

    applyMatrixToStores(options = {}) {
        // 免確認：直接同步（保留舊行為：清除已選店鋪的個別自訂值，讓對照表生效）
        const selectedSites = new Set(
            this.selectedStores
                .map(index => this.stores[index])
                .filter(store => store && store.Site)
                .map(store => store.Site)
        );
        let clearedStoreCustom = 0;
        if (selectedSites.size > 0) {
            selectedSites.forEach(site => {
                if (this.customStoreStock[site] !== undefined) {
                    delete this.customStoreStock[site];
                    clearedStoreCustom++;
                }
            });
        }

        this.syncDraftToApplied({ silent: true });

        this.renderStores();
        this.updateStoresPreview();
        this.updateCockpitBar();
        this.scheduleAutoCalculate();
        if (!options.silent) {
            this.showToast(clearedStoreCustom > 0
                ? `✅ 對照表已套用到選擇店鋪（已清除 ${clearedStoreCustom} 間個別自訂值）`
                : '✅ 對照表已套用到選擇店鋪');
        }
    }

    // ==================== 計算函數 ====================

    clearCalculationResults() {
        this.results = [];
        this.summaryResults = [];

        const resultBody = document.getElementById('resultTableBody');
        if (resultBody) {
            resultBody.innerHTML = '<tr><td colspan="9" class="empty-message">請選擇店鋪後點擊「計算」按鈕</td></tr>';
        }

        const detailBody = document.getElementById('detailTableBody');
        if (detailBody) {
            detailBody.innerHTML = '<tr><td colspan="10" class="empty-message">請選擇店鋪後點擊「計算」按鈕</td></tr>';
        }

        const omSummaryBody = document.getElementById('omSummaryTableBody');
        if (omSummaryBody) {
            omSummaryBody.innerHTML = '<tr><td colspan="7" class="empty-message">請選擇店鋪後點擊「計算」按鈕</td></tr>';
        }

        const statsContainer = document.getElementById('statsContainer');
        if (statsContainer) statsContainer.style.display = 'none';
        this.updateStats(0, 0, 0);

        try { this.updateCockpitBar(); } catch (e) {}
        try { this.refreshQuickReportForMode(); } catch (e) {}
    }

    calculate(options = {}) {
        if (this.selectedStores.length === 0) {
            this.clearCalculationResults();
            if (!options.silent) alert('請至少選擇一間店鋪');
            return;
        }
        
        this.results = [];
        this.summaryResults = [];
        
        const mode = this.calculationMode;

        // 計算每間店鋪的結果
        this.selectedStores.forEach(storeIndex => {
            const store = this.stores[storeIndex];
            // 優先使用個別店鋪的自訂值，否則使用對照表值再根據 Type 調整
            let safetyStock;
            if (this.customStoreStock[store.Site] !== undefined) {
                // 已手動設定的個別店舖值
                safetyStock = this.customStoreStock[store.Site];
            } else {
                // 使用對照表值，現在已經整合 Type
                safetyStock = this.getSafetyStock(store.Regional, store.Class, store.Size, store.Type || 'M', mode);
            }
            const typeCode = this.buildModeTypeCode(store, mode);
            const baseType = store.Type || 'M';
            const resultType = mode === 'mode2' ? 'M' : baseType;
            const resultSize = mode === 'mode3' ? 'M' : store.Size;
            const displayType = mode === 'mode2' ? '不分類' : baseType;
            const displaySize = mode === 'mode3' ? '不分類' : store.Size;

            this.results.push({
                code: store.Site,
                name: store.Shop,
                region: store.Regional,
                category: store.Class,
                size: resultSize,
                type: resultType,
                displaySize: displaySize,
                displayType: displayType,
                typeCode: typeCode,
                safetyStock: safetyStock,
                remarks: '',
                carry: safetyStock > 0 // 如果 Safety Stock > 0 則 carry
            });
        });
        
        // 按類型彙總（群內若含不同個別自訂值，顯示平均；與預覽/快速報表一致）
        const typeSummary = {};
        this.results.forEach(result => {
            if (!typeSummary[result.typeCode]) {
                typeSummary[result.typeCode] = {
                    typeCode: result.typeCode,
                    region: result.region,
                    category: result.category,
                    size: result.size,
                    type: result.type,
                    displaySize: result.displaySize,
                    displayType: result.displayType,
                    safetyStock: result.safetyStock,
                    ssMin: result.safetyStock,
                    ssMax: result.safetyStock,
                    displaySs: result.safetyStock,
                    storeCount: 0,
                    allShopQty: 0,
                    stores: []
                };
            }
            typeSummary[result.typeCode].storeCount++;
            typeSummary[result.typeCode].allShopQty += result.safetyStock;
            typeSummary[result.typeCode].stores.push(result.name);
            if (result.safetyStock < typeSummary[result.typeCode].ssMin) {
                typeSummary[result.typeCode].ssMin = result.safetyStock;
            }
            if (result.safetyStock > typeSummary[result.typeCode].ssMax) {
                typeSummary[result.typeCode].ssMax = result.safetyStock;
            }
        });

        Object.values(typeSummary).forEach(g => {
            g.displaySs = g.ssMax !== g.ssMin && g.storeCount > 0
                ? Math.round(g.allShopQty / g.storeCount)
                : g.safetyStock;
        });
        
        // 轉換為陣列並排序
        const typeOrder = { T: 1, M: 2, L: 3 };
        this.summaryResults = Object.values(typeSummary).sort((a, b) => {
            if (a.region !== b.region) return a.region.localeCompare(b.region);
            if (a.category !== b.category) return a.category.localeCompare(b.category);

            if (mode === 'mode3') {
                return (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
            }

            if (mode === 'mode1') {
                const typeDiff = (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
                if (typeDiff !== 0) return typeDiff;
            }

            return (SIZE_DEFINITIONS[a.size]?.order || 0) - (SIZE_DEFINITIONS[b.size]?.order || 0);
        });
        
        this.displayResults();
        this.displayOmSummary(); // 新增 OM 彙總顯示
        this.saveToLocalStorage();
        try { this.updateCockpitBar(); } catch (e) {}
        try { this.refreshQuickReportForMode(); } catch (e) {}
    }

    // 防抖自動重算：勾選 / 改參數後免手動按計算
    scheduleAutoCalculate(options = {}) {
        // 選取或參數改變後，先使上一輪結果失效，避免匯出舊資料
        if (options.invalidate !== false && (this.results.length > 0 || this.summaryResults.length > 0)) {
            this.clearCalculationResults();
        }

        // 沒有選中店鋪時，立即清除上一輪結果並取消待處理的重算
        if (this.selectedStores.length === 0) {
            this.clearCalculationResults();
            if (this._calcDebounce) {
                clearTimeout(this._calcDebounce);
                this._calcDebounce = null;
            }
            return;
        }

        if (!this.autoCalc) {
            // 關閉自動計算時，也要取消之前已排程的計算
            if (this._calcDebounce) {
                clearTimeout(this._calcDebounce);
                this._calcDebounce = null;
            }
            try { this.updateCockpitBar(); } catch (e) {}
            return;
        }
        if (this._calcDebounce) clearTimeout(this._calcDebounce);
        this._calcDebounce = setTimeout(() => {
            this._calcDebounce = null;
            // 使用者可能在上次排程後關閉自動計算
            if (!this.autoCalc) return;
            if (this.selectedStores.length === 0) {
                try { this.updateCockpitBar(); } catch (e) {}
                return;
            }
            this.calculate({ silent: true });
        }, 350);
    }

    // 駕駛艙總覽：已選數 / 預估總量 / 目標，不用捲動也看得到
    updateCockpitBar() {
        const selEl = document.getElementById('cockpitSelected');
        const totalEl = document.getElementById('cockpitTotal');
        const targetEl = document.getElementById('cockpitTarget');
        if (!selEl && !totalEl && !targetEl) return;
        const mode = this.calculationMode;
        let total = 0;
        this.selectedStores.forEach(idx => {
            const s = this.stores[idx];
            if (!s) return;
            // 真相來源與 calculate() 一致：個別自訂值 > 已生效對照表值。
            // 刻意不用 getMatrixDraftValue（草稿），避免草稿未同步時駕駛艙與計算結果脫鉤。
            let ss;
            if (this.customStoreStock[s.Site] !== undefined) ss = this.customStoreStock[s.Site];
            else ss = this.getSafetyStock(s.Regional, s.Class, s.Size, s.Type || 'M', mode);
            total += (ss || 0);
        });
        // 若已有計算結果，優先用結果總量（與表格一致）
        if (this.summaryResults && this.summaryResults.length > 0) {
            total = this.summaryResults.reduce((a, r) => a + (r.allShopQty || 0), 0);
        }
        if (selEl) selEl.textContent = this.selectedStores.length;
        if (totalEl) totalEl.textContent = total;
        if (targetEl) {
            const t = document.getElementById('targetTotal');
            const v = t ? parseFloat(t.value) : NaN;
            targetEl.textContent = (!isNaN(v) && v > 0) ? v : '—';
        }
    }

    displayResults() {
        const tbody = document.getElementById('resultTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        let totalStores = 0;
        let totalSafetyStock = 0;
        let carryCount = 0;
        
        // 按區域分組
        const regions = ['HK', 'MO'];
        
        regions.forEach(region => {
            const regionResults = this.summaryResults.filter(r => r.region === region);
            if (regionResults.length === 0) return;
            
            // 區域標題
            const regionRow = document.createElement('tr');
            regionRow.className = 'group-header';
            regionRow.innerHTML = `<td colspan="9" class="region-header-${region.toLowerCase()}">${REGION_DEFINITIONS[region].name}</td>`;
            tbody.appendChild(regionRow);
            
            // 數據行
            regionResults.forEach(result => {
                const tr = document.createElement('tr');
                tr.className = 'data-row';
                tr.dataset.typeCode = result.typeCode;

                const displaySs = result.displaySs ?? result.safetyStock;
                const isMixed = (result.ssMax ?? displaySs) !== (result.ssMin ?? displaySs);
                const ssTitle = isMixed ? '此群組含不同自訂值，顯示平均值' : '';
                const carryStatus = result.allShopQty > 0 ? 'Y' : 'FALSE';
                if (result.allShopQty > 0) carryCount += result.storeCount;
                
                // Type 標籤樣式
                const typeColors = { 'T': '#ff6b6b', 'M': '#4ecdc4', 'L': '#45b7d1', '不分類': '#9e9e9e' };
                const typeLabels = { 'T': '遊客', 'M': '混合', 'L': '本地' };
                const typeDisplay = result.displayType || typeLabels[result.type] || '-';
                const typeColor = typeColors[typeDisplay] || typeColors[result.type] || '#ccc';
                
                tr.innerHTML = `
                    <td>${result.region}</td>
                    <td><span class="badge category-${result.category.toLowerCase()}">${result.category}</span></td>
                    <td><span class="badge">${result.displaySize || result.size}</span></td>
                    <td><span class="badge" style="background:${typeColor}; color:white;">${typeDisplay}</span></td>
                    <td><strong>${result.typeCode}</strong></td>
                    <td style="text-align:center">${result.storeCount}</td>
                    <td style="text-align:center" class="editable-cell" data-field="safetyStock" title="${ssTitle}">
                        <span class="display-value">${displaySs}</span>
                        <input type="number" class="edit-value" value="${displaySs}" min="0" style="display:none">
                    </td>
                    <td style="text-align:center;font-weight:bold">${result.allShopQty}</td>
                    <td class="carry-status ${carryStatus === 'Y' ? 'carry-yes' : 'carry-no'}">${carryStatus}</td>
                `;
                tbody.appendChild(tr);
                
                totalStores += result.storeCount;
                totalSafetyStock += result.allShopQty;
            });
        });
        
        // 總計行
        const totalRow = document.createElement('tr');
        totalRow.className = 'total-row';
        totalRow.innerHTML = `
            <td colspan="5" style="text-align:right">TOTAL:</td>
            <td style="text-align:center"><strong>${totalStores}</strong></td>
            <td style="text-align:center">Safety Stock:</td>
            <td style="text-align:center" class="total-highlight"><strong>${totalSafetyStock}</strong></td>
            <td></td>
        `;
        tbody.appendChild(totalRow);
        
        // Carry 統計行
        const carryRow = document.createElement('tr');
        carryRow.className = 'carry-row';
        carryRow.innerHTML = `
            <td colspan="5" style="text-align:right">No. of shops carry:</td>
            <td style="text-align:center"><strong>${carryCount}</strong></td>
            <td colspan="3"></td>
        `;
        tbody.appendChild(carryRow);
        
        // 更新統計信息
        this.updateStats(totalStores, totalSafetyStock, carryCount);
        
        // 顯示統計容器
        const statsContainer = document.getElementById('statsContainer');
        if (statsContainer) {
            statsContainer.style.display = 'grid';
        }
        
        // 顯示詳細清單
        this.displayDetailedResults();
        try { this.updateCockpitBar(); } catch (e) {}
    }

    displayDetailedResults() {
        const detailBody = document.getElementById('detailTableBody');
        if (!detailBody) return;
        
        detailBody.innerHTML = '';
        
        // 按區域、分類、名稱排序
        const sortedResults = [...this.results].sort((a, b) => {
            if (a.region !== b.region) return a.region.localeCompare(b.region);
            if (a.category !== b.category) return a.category.localeCompare(b.category);
            return a.name.localeCompare(b.name);
        });
        
        sortedResults.forEach((result, index) => {
            const tr = document.createElement('tr');
            tr.className = 'detail-row';
            
            // 從店鋪清單中找到 OM 資訊
            const store = this.storeMap.get(result.code);
            const omName = store?.OM || '未分配';
            const storeType = store?.Type || result.type || '';
            
            const carryStatus = result.safetyStock > 0 ? 'Y' : 'FALSE';
            
            // Type 標籤樣式
            const typeColors = { 'T': '#ff6b6b', 'M': '#4ecdc4', 'L': '#45b7d1' };
            const typeLabels = { 'T': '遊客', 'M': '混合', 'L': '本地' };
            const typeColor = typeColors[storeType] || '#ccc';
            const typeLabel = typeLabels[storeType] || '-';
            const isSpecial = isSpecialAttentionStore(store);

            tr.innerHTML = `
                <td>${result.region}</td>
                <td>${result.code}</td>
                <td>${result.name}</td>
                <td><span class="badge" style="background:${typeColor}; color:white;">${typeLabel}</span></td>
                <td>${result.typeCode}</td>
                <td><span class="badge category-${result.category.toLowerCase()}">${result.category}</span></td>
                <td>${store?.Size || result.size}</td>
                <td style="text-align:center">${result.safetyStock}</td>
                <td>${omName}</td>
                <td class="carry-status ${carryStatus === 'Y' ? 'carry-yes' : 'carry-no'}">${carryStatus}</td>
                <td class="special-attention-cell">${isSpecial ? '⭐ 需特別關注' : ''}</td>
            `;
            detailBody.appendChild(tr);
        });
    }

    // ==================== OM 彙總功能 ====================
    
    /**
     * 計算按 OM 分組的彙總結果
     */
    calculateOmSummary() {
        const omSummary = {};
        
        this.results.forEach(result => {
            // 從 stores 中找到對應的店鋪獲取 OM 資訊
            const store = this.storeMap.get(result.code);
            const omName = store?.OM || '未分配';
            
            if (!omSummary[omName]) {
                omSummary[omName] = {
                    omName: omName,
                    storeCount: 0,
                    totalSS: 0,
                    hkCount: 0,
                    moCount: 0,
                    categoryCount: { A: 0, B: 0, C: 0, D: 0 },
                    carryCount: 0,
                    stores: []
                };
            }
            
            omSummary[omName].storeCount++;
            omSummary[omName].totalSS += result.safetyStock;
            if (result.safetyStock > 0) {
                omSummary[omName].carryCount++;
            }
            
            if (result.region === 'HK') {
                omSummary[omName].hkCount++;
            } else {
                omSummary[omName].moCount++;
            }
            
            omSummary[omName].categoryCount[result.category]++;
            omSummary[omName].stores.push(result.name);
        });
        
        // 計算平均值和比例
        const grandTotalSS = Object.values(omSummary).reduce((sum, om) => sum + om.totalSS, 0);
        
        Object.values(omSummary).forEach(om => {
            om.avgSS = om.storeCount > 0 ? Math.round(om.totalSS / om.storeCount) : 0;
            om.percentage = grandTotalSS > 0 ? ((om.totalSS / grandTotalSS) * 100).toFixed(1) : 0;
            om.carryCount = om.carryCount || 0;
        });
        
        // 轉換為陣列並按店鋪數量排序
        return Object.values(omSummary).sort((a, b) => b.storeCount - a.storeCount);
    }

    /**
     * 顯示 OM 彙總表格
     */
    displayOmSummary() {
        const tbody = document.getElementById('omSummaryTableBody');
        if (!tbody) return;
        
        const omSummary = this.calculateOmSummary();
        
        if (omSummary.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-message">沒有 OM 資料</td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        let totalStores = 0;
        let totalSS = 0;
        
        omSummary.forEach(om => {
            const regionDisplay = om.moCount === 0 ? '🇭🇰 香港' : 
                                  om.hkCount === 0 ? '🇲🇴 澳門' : '🇭🇰🇲🇴 港澳';
            
            // 類型分佈標籤
            const categoryTags = [];
            if (om.categoryCount.A > 0) categoryTags.push(`<span class="om-badge om-badge-a">A:${om.categoryCount.A}</span>`);
            if (om.categoryCount.B > 0) categoryTags.push(`<span class="om-badge om-badge-b">B:${om.categoryCount.B}</span>`);
            if (om.categoryCount.C > 0) categoryTags.push(`<span class="om-badge om-badge-c">C:${om.categoryCount.C}</span>`);
            if (om.categoryCount.D > 0) categoryTags.push(`<span class="om-badge om-badge-d">D:${om.categoryCount.D}</span>`);
            
            html += `
                <tr>
                    <td><strong>${om.omName}</strong></td>
                    <td>${regionDisplay}</td>
                    <td style="text-align:center">${om.storeCount}</td>
                    <td style="text-align:center">${om.avgSS}</td>
                    <td style="text-align:center;font-weight:bold;color:var(--color-primary)">${om.totalSS}</td>
                    <td>
                        <div class="percentage-bar">
                            <div class="percentage-fill" style="width:${om.percentage}%"></div>
                            <span>${om.percentage}%</span>
                        </div>
                    </td>
                    <td style="text-align:center">${om.carryCount}</td>
                </tr>
                <tr class="category-detail-row">
                    <td colspan="7" class="category-tags">${categoryTags.join(' ')}</td>
                </tr>
            `;
            
            totalStores += om.storeCount;
            totalSS += om.totalSS;
        });
        
        // 總計行
        html += `
            <tr class="total-row">
                <td colspan="2" style="text-align:right"><strong>總計:</strong></td>
                <td style="text-align:center"><strong>${totalStores}</strong></td>
                <td></td>
                <td style="text-align:center" class="total-highlight"><strong>${totalSS}</strong></td>
                <td style="text-align:center">100%</td>
                <td></td>
            </tr>
        `;
        
        tbody.innerHTML = html;
    }

    updateStats(totalStores, totalSafetyStock, carryCount) {
        const statsEl = {
            totalShops: document.getElementById('totalShops'),
            totalSafetyStock: document.getElementById('totalSafetyStock'),
            carryShops: document.getElementById('carryShops')
        };
        
        if (statsEl.totalShops) statsEl.totalShops.textContent = totalStores;
        if (statsEl.totalSafetyStock) statsEl.totalSafetyStock.textContent = totalSafetyStock;
        if (statsEl.carryShops) statsEl.carryShops.textContent = carryCount;
    }

    // ==================== 編輯功能 ====================
    
    setupInlineEditListeners() {
        const tbody = document.getElementById('resultTableBody');
        if (!tbody) return;
        
        tbody.addEventListener('click', (e) => {
            const cell = e.target.closest('.editable-cell');
            if (cell) {
                this.enableCellEdit(cell);
            }
        });
        
        tbody.addEventListener('focusout', (e) => {
            const cell = e.target.closest('.editable-cell');
            if (cell && cell.classList.contains('editing')) {
                setTimeout(() => {
                    if (!cell.contains(document.activeElement)) {
                        this.saveCellEdit(cell);
                    }
                }, 100);
            }
        }, true);
        
        tbody.addEventListener('keydown', (e) => {
            const cell = e.target.closest('.editable-cell');
            if (!cell || !cell.classList.contains('editing')) return;
            
            if (e.key === 'Enter') {
                e.preventDefault();
                this.saveCellEdit(cell);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelCellEdit(cell);
            }
        }, true);
    }

    enableCellEdit(cell) {
        if (cell.classList.contains('editing')) return;
        
        const currentlyEditing = document.querySelector('.editable-cell.editing');
        if (currentlyEditing) {
            this.saveCellEdit(currentlyEditing);
        }
        
        cell.classList.add('editing');
        const displayValue = cell.querySelector('.display-value');
        const editValue = cell.querySelector('.edit-value');
        
        if (displayValue && editValue) {
            displayValue.style.display = 'none';
            editValue.style.display = 'inline-block';
            editValue.focus();
            editValue.select();
        }
    }

    saveCellEdit(cell) {
        if (!cell.classList.contains('editing')) return;
        
        const row = cell.closest('.data-row');
        const editValue = cell.querySelector('.edit-value');
        const displayValue = cell.querySelector('.display-value');
        
        if (!editValue || !row) return;
        
        const typeCode = row.dataset.typeCode;
        const newValue = Math.max(0, parseInt(editValue.value) || 0);
        const mode = this.calculationMode;
        
        // 更新 summaryResults
        const result = this.summaryResults.find(r => r.typeCode === typeCode);
        let clearedStoreCustom = 0;
        if (result) {
            result.safetyStock = newValue;

            this.results.forEach(r => {
                if (r.typeCode === typeCode) {
                    r.safetyStock = newValue;
                }
            });

            // 該群組成員若留有個別店鋪自訂值，下次 calculate() 會優先採用、蓋過剛設的群組值；
            // 一併清除，否則這次群組編輯對這些店形同無效
            this.results.forEach(r => {
                if (r.typeCode === typeCode && this.customStoreStock[r.code] !== undefined) {
                    delete this.customStoreStock[r.code];
                    clearedStoreCustom++;
                }
            });

            result.allShopQty = result.storeCount * newValue;
            // 群組已統一為單一值（個別自訂值已清除），同步 min/max/顯示值
            result.ssMin = newValue;
            result.ssMax = newValue;
            result.displaySs = newValue;

            if (mode === 'mode2') {
                const key = `${result.region}-${result.category}-${result.size}`;
                this.customSafetyStockMode2[key] = newValue;

                if (!this.matrixDraftMode2[result.region]) this.matrixDraftMode2[result.region] = {};
                if (!this.matrixDraftMode2[result.region][result.category]) this.matrixDraftMode2[result.region][result.category] = {};
                this.matrixDraftMode2[result.region][result.category][result.size] = newValue;
            } else if (mode === 'mode3') {
                const key = `${result.region}-${result.category}-${result.type}`;
                this.customSafetyStockMode3[key] = newValue;

                if (!this.matrixDraftMode3[result.region]) this.matrixDraftMode3[result.region] = {};
                if (!this.matrixDraftMode3[result.region][result.category]) this.matrixDraftMode3[result.region][result.category] = {};
                this.matrixDraftMode3[result.region][result.category][result.type] = newValue;
            } else {
                const key = `${result.region}-${result.category}-${result.type}-${result.size}`;
                this.customSafetyStock[key] = newValue;

                if (!this.matrixDraft[result.region]) this.matrixDraft[result.region] = {};
                if (!this.matrixDraft[result.region][result.category]) this.matrixDraft[result.region][result.category] = {};
                if (!this.matrixDraft[result.region][result.category][result.type]) this.matrixDraft[result.region][result.category][result.type] = {};
                this.matrixDraft[result.region][result.category][result.type][result.size] = newValue;
            }
        }
        
        displayValue.textContent = newValue;
        
        cell.classList.remove('editing');
        displayValue.style.display = 'inline-block';
        editValue.style.display = 'none';
        
        // 重新顯示結果以更新總計
        this.displayResults();
        this.saveToLocalStorage();
        try { this.renderStores(); } catch (e) {}
        try { this.updateCockpitBar(); } catch (e) {}
        if (clearedStoreCustom > 0) {
            this.showToast(`✅ 群組值已更新（已清除 ${clearedStoreCustom} 間個別自訂值，統一使用群組值）`);
        }
    }

    cancelCellEdit(cell) {
        if (!cell.classList.contains('editing')) return;
        
        const displayValue = cell.querySelector('.display-value');
        const editValue = cell.querySelector('.edit-value');
        
        editValue.value = displayValue.textContent;
        
        cell.classList.remove('editing');
        displayValue.style.display = 'inline-block';
        editValue.style.display = 'none';
    }

    // ==================== 導出/導入函數 ====================
    
    // 生成格式化的檔案名稱 (safetystock_YYYYMMDD_HHMMSS)
    generateFileName(prefix = 'safetystock', extension = 'csv') {
        const now = new Date();
        const hkFormatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Hong_Kong',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        const parts = hkFormatter.formatToParts(now);
        const getPart = (type) => parts.find(p => p.type === type)?.value;
        
        const year = getPart('year');
        const month = getPart('month');
        const day = getPart('day');
        const hour = getPart('hour');
        const minute = getPart('minute');
        const second = getPart('second');
        
        const timestamp = `${year}${month}${day}_${hour}${minute}${second}`;
        return `${prefix}_${timestamp}.${extension}`;
    }

    downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // SheetJS 缺失時的統一處理：Excel 不可用時提供 CSV 替代，避免按鈕無反應
    // @returns {boolean} true = XLSX 可用可繼續；false = 已轉用 fallback，呼叫方應直接 return
    handleMissingXLSX(fallbackFn, featureName = 'Excel 匯出') {
        if (typeof XLSX !== 'undefined') return true;
        const useCsv = confirm(
            `${featureName}元件載入失敗（可能離線或 CDN 被擋）。\n按「確定」改用 CSV 匯出（Excel 可直接開啟），按「取消」則返回。`
        );
        if (useCsv && typeof fallbackFn === 'function') {
            try { fallbackFn(); } catch (e) { console.warn('CSV fallback failed', e); }
        }
        return false;
    }

    // 快速報表無 XLSX 時的 CSV fallback（僅匯出已勾選列，與 Excel 版同資料來源）
    qrExportCsvFallback() {
        const checkedRows = document.querySelectorAll('#qrTableBody .qr-chk:checked');
        const visibleCheckedRows = Array.from(checkedRows).filter(chk => {
            const row = chk.closest('tr');
            return row && !row.classList.contains('qr-row-hidden');
        });
        if (visibleCheckedRows.length === 0) {
            alert('請至少勾選一間店鋪');
            return;
        }
        const mode = this.calculationMode;
        let csv = '\uFEFF代號,店鋪名稱,區域,舖類,面積/類型,類型代碼,OM,Safety Stock,Carry\n';
        visibleCheckedRows.forEach(chk => {
            const idx = parseInt(chk.dataset.idx);
            const store = this.stores[idx];
            if (!store) return;
            const ss = this.customStoreStock[store.Site] !== undefined
                ? this.customStoreStock[store.Site]
                : this.getSafetyStock(store.Regional, store.Class, store.Size, store.Type, mode);
            const tc = this.buildModeTypeCode(store, mode);
            const dim = mode === 'mode3' ? this.getStoreTypeLabel(store.Type || 'M') : store.Size;
            const carry = ss > 0 ? 'Y' : '';
            const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            csv += `${store.Regional},${q(store.Site)},${q(store.Shop)},${store.Class},${q(dim)},${tc},${q(store.OM || '')},${ss},${carry}\n`;
        });
        this.downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), this.generateFileName('safetystock_quickreport', 'csv'));
    }
    
    exportToCSV() {
        if (this.summaryResults.length === 0) {
            alert('請先計算結果');
            return;
        }
        
        let csv = '\uFEFF'; // BOM for UTF-8
        
        // ========== 第一頁：店舖詳細清單（優先顯示）==========
        csv += '店舖詳細清單\n';
        csv += `生成日期: ${new Date().toLocaleString('zh-TW')}\n\n`;
        csv += 'HK/MO,代號,店舖,類型代碼,舖類,貨場面積,Safety Stock,Carry,需特別關注\n';

        this.results.forEach(result => {
            const carry = result.safetyStock > 0 ? 'Y' : 'FALSE';
            const store = this.storeMap.get(result.code);
            const storeSize = store?.Size || result.size;
            const specialFlag = isSpecialAttentionStore(store) ? '需特別關注' : '';
            csv += `${result.region},${result.code},"${result.name}",${result.typeCode},${result.category},${storeSize},${result.safetyStock},${carry},${specialFlag}\n`;
        });
        
        // 分頁分隔（空行）
        csv += '\n\n\n\n\n\n\n\n\n\n';
        
        // ========== 第二頁：Safety Stock 計算結果 - 彙總表 ==========
        csv += 'Safety Stock 計算結果 - 彙總表\n';
        csv += `生成日期: ${new Date().toLocaleString('zh-TW')}\n\n`;
        csv += 'HK/MO,舖類,貨場面積,代碼,店舖數量,Safety Stock,ALL SHOP QTY,Carry\n';
        
        let totalStores = 0;
        let totalSS = 0;
        
        this.summaryResults.forEach(result => {
            const carry = result.allShopQty > 0 ? 'Y' : 'FALSE';
            const sizeDisplay = result.displaySize || result.size;
            const displaySs = result.displaySs ?? result.safetyStock;
            csv += `${result.region},${result.category},${sizeDisplay},${result.typeCode},${result.storeCount},${displaySs},${result.allShopQty},${carry}\n`;
            totalStores += result.storeCount;
            totalSS += result.allShopQty;
        });
        
        csv += `\nTOTAL:,,,,${totalStores},,${totalSS},\n`;
        
        // ========== 第四頁：按 OM 彙總 ==========
        csv += '\n\n\n\n\n\n\n\n\n\n';
        csv += '按營運經理 (OM) 彙總\n';
        csv += `生成日期: ${new Date().toLocaleString('zh-TW')}\n\n`;
        csv += '營運經理,區域分佈,店舖數量,平均SS,SS總計,佔比,Carry,A類店,B類店,C類店,D類店\n';
        
        const omSummary = this.calculateOmSummary();
        let omTotalStores = 0;
        let omTotalSS = 0;
        
        omSummary.forEach(om => {
            const region = om.moCount === 0 ? 'HK' : om.hkCount === 0 ? 'MO' : 'HK+MO';
            csv += `${om.omName},${region},${om.storeCount},${om.avgSS},${om.totalSS},${om.percentage}%,${om.carryCount},${om.categoryCount.A},${om.categoryCount.B},${om.categoryCount.C},${om.categoryCount.D}\n`;
            omTotalStores += om.storeCount;
            omTotalSS += om.totalSS;
        });
        
        csv += `\nTOTAL:,,${omTotalStores},,${omTotalSS},100%,,,\n`;
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        this.downloadBlob(blob, this.generateFileName('safetystock', 'csv'));
    }

    exportToExcel() {
        if (this.summaryResults.length === 0) {
            alert('請先計算結果');
            return;
        }

        // SheetJS 缺失時改用 CSV（Excel 可直接開啟）
        if (!this.handleMissingXLSX(() => this.exportToCSV(), 'Excel 匯出')) {
            return;
        }

        // 創建工作簿
        const wb = XLSX.utils.book_new();
        
        // 獲取香港時區的日期時間
        const now = new Date();
        const hkFormatter = new Intl.DateTimeFormat('zh-TW', {
            timeZone: 'Asia/Hong_Kong',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const dateTimeStr = hkFormatter.format(now);

        // ========== 第一個工作表：店舖詳細清單 ==========
        const detailData = [
            ['店舖詳細清單'],
            [`生成日期: ${dateTimeStr}`],
            [],
            ['HK/MO', '代號', '店舖', '類型代碼', '舖類', '貨場面積', 'Safety Stock', 'Carry', 'OM', '需特別關注']
        ];

        this.results.forEach(result => {
            const carry = result.safetyStock > 0 ? 'Y' : 'FALSE';
            const store = this.storeMap.get(result.code);
            const om = store ? store.OM : '';
            const storeSize = store?.Size || result.size;
            detailData.push([
                result.region,
                result.code,
                result.name,
                result.typeCode,
                result.category,
                storeSize,
                result.safetyStock,
                carry,
                om,
                isSpecialAttentionStore(store) ? '需特別關注' : ''
            ]);
        });

        const wsDetail = XLSX.utils.aoa_to_sheet(detailData);

        // 設置欄寬
        wsDetail['!cols'] = [
            { wch: 10 },  // HK/MO
            { wch: 10 },  // 代號
            { wch: 20 },  // 店舖
            { wch: 12 },  // 類型代碼
            { wch: 8 },   // 舖類
            { wch: 12 },  // 貨場面積
            { wch: 14 },  // Safety Stock
            { wch: 10 },  // Carry
            { wch: 12 },  // OM
            { wch: 12 }   // 需特別關注
        ];

        XLSX.utils.book_append_sheet(wb, wsDetail, '店舖詳細清單');

        // ========== 第二個工作表：彙總表 ==========
        let totalStores = 0;
        let totalSS = 0;

        const summaryData = [
            ['Safety Stock 計算結果 - 彙總表'],
            [`生成日期: ${dateTimeStr}`],
            [],
            ['HK/MO', '舖類', '貨場面積', '類型代碼', '店舖數量', 'Safety Stock', 'ALL SHOP QTY', 'Carry']
        ];

        this.summaryResults.forEach(result => {
            const carry = result.allShopQty > 0 ? 'Y' : 'FALSE';
            const sizeDisplay = result.displaySize || result.size;
            const displaySs = result.displaySs ?? result.safetyStock;
            summaryData.push([
                result.region,
                result.category,
                sizeDisplay,
                result.typeCode,
                result.storeCount,
                displaySs,
                result.allShopQty,
                carry
            ]);
            totalStores += result.storeCount;
            totalSS += result.allShopQty;
        });

        // 添加總計行
        summaryData.push([]);
        summaryData.push(['TOTAL:', '', '', '', totalStores, '', totalSS, '']);

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        
        // 設置欄寬
        wsSummary['!cols'] = [
            { wch: 10 },  // HK/MO
            { wch: 8 },   // 舖類
            { wch: 12 },  // 貨場面積
            { wch: 12 },  // 類型代碼
            { wch: 12 },  // 店舖數量
            { wch: 14 },  // Safety Stock
            { wch: 14 },  // ALL SHOP QTY
            { wch: 10 }   // Carry
        ];

        XLSX.utils.book_append_sheet(wb, wsSummary, '彙總表');

        // ========== 第三個工作表：按 OM 彙總 ==========
        const omSummaryData = [
            ['按營運經理 (OM) 彙總'],
            [`生成日期: ${dateTimeStr}`],
            [],
            ['營運經理', '區域分佈', '店舖數量', '平均SS', 'SS總計', '佔比', 'Carry', 'A類店', 'B類店', 'C類店', 'D類店']
        ];

        const omSummary = this.calculateOmSummary();
        let omTotalStores = 0;
        let omTotalSS = 0;

        omSummary.forEach(om => {
            const region = om.moCount === 0 ? 'HK' : om.hkCount === 0 ? 'MO' : 'HK+MO';
            omSummaryData.push([
                om.omName,
                region,
                om.storeCount,
                om.avgSS,
                om.totalSS,
                `${om.percentage}%`,
                om.carryCount,
                om.categoryCount.A,
                om.categoryCount.B,
                om.categoryCount.C,
                om.categoryCount.D
            ]);
            omTotalStores += om.storeCount;
            omTotalSS += om.totalSS;
        });

        // 添加總計行
        omSummaryData.push([]);
        omSummaryData.push(['TOTAL:', '', omTotalStores, '', omTotalSS, '100%', '', '', '', '', '']);

        const wsOmSummary = XLSX.utils.aoa_to_sheet(omSummaryData);
        
        // 設置欄寬
        wsOmSummary['!cols'] = [
            { wch: 15 },  // 營運經理
            { wch: 12 },  // 區域分佈
            { wch: 12 },  // 店舖數量
            { wch: 12 },  // 平均SS
            { wch: 12 },  // SS總計
            { wch: 12 },  // 佔比
            { wch: 10 },  // Carry
            { wch: 10 },  // A類店
            { wch: 10 },  // B類店
            { wch: 10 },  // C類店
            { wch: 10 }   // D類店
        ];

        XLSX.utils.book_append_sheet(wb, wsOmSummary, 'OM彙總');
        
        // 匯出檔案
        const fileName = this.generateFileName('safetystock', 'xlsx');
        XLSX.writeFile(wb, fileName);
    }

    // ==================== 匯出含公式的 Excel ====================
    exportToExcelWithFormulas() {
        if (this.summaryResults.length === 0) {
            alert('請先計算結果');
            return;
        }

        // 含公式版必須有 SheetJS；缺失時退回 CSV（公式無法在 CSV 保留，但數值與明細完整）
        if (!this.handleMissingXLSX(() => this.exportToCSV(), 'Excel（含公式）匯出')) {
            return;
        }

        // 創建工作簿
        const wb = XLSX.utils.book_new();
        
        // 獲取香港時區的日期時間
        const now = new Date();
        const hkFormatter = new Intl.DateTimeFormat('zh-TW', {
            timeZone: 'Asia/Hong_Kong',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const dateTimeStr = hkFormatter.format(now);

        const mode = this.calculationMode;

        // ========== 第一個工作表：Safety Stock 對照表（可編輯，含公式）==========
        const matrixData = this.buildEditableMatrixForExcelByMode(mode);
        const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
        
        // 設置欄寬
        wsMatrix['!cols'] = mode === 'mode3'
            ? [
                { wch: 14 },  // 區域/舖類
                { wch: 12 },  // 遊客
                { wch: 12 },  // 混合
                { wch: 12 }   // 本地
            ]
            : [
                { wch: 12 },  // 區域/舖類/尺寸
                { wch: 12 },  // XL
                { wch: 12 },  // L
                { wch: 12 },  // M
                { wch: 12 },  // S
                { wch: 12 }   // XS
            ];

        XLSX.utils.book_append_sheet(wb, wsMatrix, '對照表');

        // ========== 第二個工作表：店舖詳細清單（含公式） ==========
        // 需特別關注固定放最後欄（J），D/E/G/I 欄的跨表公式不受影響
        const detailData = [
            ['店舖詳細清單'],
            [`生成日期: ${dateTimeStr}`],
            [],
            ['HK/MO', '代號', '店舖', '類型代碼', '舖類', '貨場面積', 'Safety Stock', 'Carry', 'OM', '需特別關注']
        ];

        // 對照表數據位置（會在對照表工作表中）
        const matrixSheetRef = '對照表';
        
        this.results.forEach((result, index) => {
            const store = this.storeMap.get(result.code);
            const om = store ? store.OM : '';
            const storeSize = store?.Size || result.size;
            const typeForFormula = mode === 'mode2' ? 'M' : (store?.Type || result.type || 'M');
            const sizeForFormula = mode === 'mode3' ? 'M' : storeSize;

            // Excel列號（1-based，加上標題和空行）
            const rowNum = 5 + index;
            // Carry 用活公式跟隨 G 欄，避免改對照表後 Carry 過期
            const carryFormula = `IF(G${rowNum}>0,"Y","FALSE")`;
            // 個別店鋪自訂值不在對照表裡，VLOOKUP 查不到，必須輸出靜態數才與網頁一致；
            // 其餘用公式查詢對照表，保持改表即連動
            const hasStoreCustom = this.customStoreStock[result.code] !== undefined;
            const safetyStockCell = hasStoreCustom
                ? result.safetyStock
                : this.buildSafetyStockFormula(
                    result.region,
                    result.category,
                    sizeForFormula,
                    typeForFormula,
                    matrixSheetRef,
                    mode
                );

            detailData.push([
                result.region,
                result.code,
                result.name,
                result.typeCode,
                result.category,
                storeSize,
                safetyStockCell,
                carryFormula,
                om,
                isSpecialAttentionStore(store) ? '需特別關注' : ''
            ]);
        });

        const wsDetail = XLSX.utils.aoa_to_sheet(detailData);

        // 設置欄寬
        wsDetail['!cols'] = [
            { wch: 10 },  // HK/MO
            { wch: 10 },  // 代號
            { wch: 20 },  // 店舖
            { wch: 12 },  // 類型代碼
            { wch: 8 },   // 舖類
            { wch: 12 },  // 貨場面積
            { wch: 14 },  // Safety Stock
            { wch: 10 },  // Carry
            { wch: 12 },  // OM
            { wch: 12 }   // 需特別關注
        ];

        // 設置公式屬性，使其被識別為公式（靜態數值欄保留原快取值，與網頁一致）
        detailData.forEach((row, idx) => {
            if (idx >= 4) { // 跳過標題行
                // Safety Stock列：字串才是公式；數字是個別店鋪自訂靜態值，不設公式
                if (typeof row[6] === 'string' && row[6]) {
                    const cellRef = XLSX.utils.encode_cell({ r: idx, c: 6 });
                    if (wsDetail[cellRef]) {
                        wsDetail[cellRef].f = row[6]; // 設置為公式
                        wsDetail[cellRef].v = 0; // 暫時設置值為0（打開時會計算）
                    }
                }
                // Carry列：一律為活公式
                if (typeof row[7] === 'string' && row[7]) {
                    const carryRef = XLSX.utils.encode_cell({ r: idx, c: 7 });
                    if (wsDetail[carryRef]) {
                        wsDetail[carryRef].f = row[7];
                        wsDetail[carryRef].v = '';
                    }
                }
            }
        });

        XLSX.utils.book_append_sheet(wb, wsDetail, '店舖詳細清單');

        // ========== 第三個工作表：彙總表（含公式） ==========
        const summaryDataFormulas = [
            ['Safety Stock 計算結果 - 彙總表'],
            [`生成日期: ${dateTimeStr}`],
            [],
            ['HK/MO', '舖類', '貨場面積', '類型代碼', '店舖數量', 'Safety Stock', 'ALL SHOP QTY', 'Carry']
        ];

        this.summaryResults.forEach((result, idx) => {
            // 使用類型代碼做彙總，適用所有模式
            const storeCountFormula = `COUNTIF('店舖詳細清單'!D:D,"${result.typeCode}")`;
            const safetyStockSumFormula = `SUMIF('店舖詳細清單'!D:D,"${result.typeCode}",'店舖詳細清單'!G:G)`;
            // Safety Stock 欄為單店值（總和÷店數），ALL SHOP QTY 欄為群組總和，兩者語義不同
            const safetyStockPerStoreFormula = `IF(${storeCountFormula}=0,0,ROUND(${safetyStockSumFormula}/${storeCountFormula},0))`;
            const carryFormula = `IF(${safetyStockSumFormula}>0,"Y","FALSE")`;
            const sizeDisplay = result.displaySize || result.size;

            summaryDataFormulas.push([
                result.region,
                result.category,
                sizeDisplay,
                result.typeCode,
                storeCountFormula,
                safetyStockPerStoreFormula,
                safetyStockSumFormula, // ALL SHOP QTY 為群組總和
                carryFormula
            ]);
        });

        // 添加總計行（含公式）
        summaryDataFormulas.push([]);
        const totalRow = [
            'TOTAL:',
            '',
            '',
            '',
            `COUNTA('店舖詳細清單'!B:B)-1`, // B 欄非空 = 表頭 1 格 + N 筆資料，故減 1
            '',
            `SUM('彙總表'!G5:G${4 + this.summaryResults.length})`, // 彙總所有Safety Stock
            ''
        ];
        summaryDataFormulas.push(totalRow);

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryDataFormulas);
        
        // 設置欄寬
        wsSummary['!cols'] = [
            { wch: 10 },  // HK/MO
            { wch: 8 },   // 舖類
            { wch: 12 },  // 貨場面積
            { wch: 12 },  // 類型代碼
            { wch: 12 },  // 店舖數量
            { wch: 14 },  // Safety Stock
            { wch: 14 },  // ALL SHOP QTY
            { wch: 10 }   // Carry
        ];

        // 設置公式屬性
        summaryDataFormulas.forEach((row, idx) => {
            if (idx >= 4 && idx < 4 + this.summaryResults.length) {
                // 店舖數量列
                const countCellRef = XLSX.utils.encode_cell({ r: idx, c: 4 });
                if (wsSummary[countCellRef]) {
                    wsSummary[countCellRef].f = row[4];
                    wsSummary[countCellRef].v = 0;
                }
                // Safety Stock列
                const ssCellRef = XLSX.utils.encode_cell({ r: idx, c: 5 });
                if (wsSummary[ssCellRef]) {
                    wsSummary[ssCellRef].f = row[5];
                    wsSummary[ssCellRef].v = 0;
                }
                // ALL SHOP QTY列
                const qtyRefCell = XLSX.utils.encode_cell({ r: idx, c: 6 });
                if (wsSummary[qtyRefCell]) {
                    wsSummary[qtyRefCell].f = row[6];
                    wsSummary[qtyRefCell].v = 0;
                }
                // Carry列
                const carryCellRef = XLSX.utils.encode_cell({ r: idx, c: 7 });
                if (wsSummary[carryCellRef]) {
                    wsSummary[carryCellRef].f = row[7];
                    wsSummary[carryCellRef].v = false;
                }
            } else if (idx === 4 + this.summaryResults.length + 1) {
                // 總計行
                const totalCountRef = XLSX.utils.encode_cell({ r: idx, c: 4 });
                if (wsSummary[totalCountRef]) {
                    wsSummary[totalCountRef].f = row[4];
                    wsSummary[totalCountRef].v = 0;
                }
                const totalSsRef = XLSX.utils.encode_cell({ r: idx, c: 6 });
                if (wsSummary[totalSsRef]) {
                    wsSummary[totalSsRef].f = row[6];
                    wsSummary[totalSsRef].v = 0;
                }
            }
        });

        XLSX.utils.book_append_sheet(wb, wsSummary, '彙總表');

        // ========== 第四個工作表：按 OM 彙總（含公式） ==========
        const omSummaryDataFormulas = [
            ['按營運經理 (OM) 彙總'],
            [`生成日期: ${dateTimeStr}`],
            [],
            ['營運經理', '區域分佈', '店舖數量', '平均SS', 'SS總計', '佔比', 'Carry', 'A類店', 'B類店', 'C類店', 'D類店']
        ];

        const omSummary = this.calculateOmSummary();

        omSummary.forEach((om, idx) => {
            const region = om.moCount === 0 ? 'HK' : om.hkCount === 0 ? 'MO' : 'HK+MO';
            
            // 使用公式計算OM下的店舖數量
            const omStoreCountFormula = `COUNTIF('店舖詳細清單'!I:I,"${om.omName}")`;
            
            // 使用公式計算OM下的SS總計
            const omTotalSSFormula = `SUMIF('店舖詳細清單'!I:I,"${om.omName}",'店舖詳細清單'!G:G)`;
            
            // 平均SS = SS總計 / 店舖數量（ROUND 取整，與網頁 Math.round 一致）
            const omAvgSSFormula = `IF(${omStoreCountFormula}=0,0,ROUND(${omTotalSSFormula}/${omStoreCountFormula},0))`;
            
            // 佔比 = SS總計 / 全部SS總計 * 100
            const omPercentageFormula = `IF(SUM('OM彙總'!E:E)=0,0,ROUND(${omTotalSSFormula}/SUM('OM彙總'!E5:E${4 + omSummary.length})*100,1))`;
            
            // Carry標誌
            const omCarryFormula = `IF(${omTotalSSFormula}>0,"Y","FALSE")`;
            
            // 各類店舖數
            const categoryAFormula = `COUNTIFS('店舖詳細清單'!I:I,"${om.omName}",'店舖詳細清單'!E:E,"A")`;
            const categoryBFormula = `COUNTIFS('店舖詳細清單'!I:I,"${om.omName}",'店舖詳細清單'!E:E,"B")`;
            const categoryCFormula = `COUNTIFS('店舖詳細清單'!I:I,"${om.omName}",'店舖詳細清單'!E:E,"C")`;
            const categoryDFormula = `COUNTIFS('店舖詳細清單'!I:I,"${om.omName}",'店舖詳細清單'!E:E,"D")`;
            
            omSummaryDataFormulas.push([
                om.omName,
                region,
                omStoreCountFormula,
                omAvgSSFormula,
                omTotalSSFormula,
                omPercentageFormula,
                omCarryFormula,
                categoryAFormula,
                categoryBFormula,
                categoryCFormula,
                categoryDFormula
            ]);
        });

        // 添加總計行（含公式）
        omSummaryDataFormulas.push([]);
        omSummaryDataFormulas.push([
            'TOTAL:',
            '',
            `SUM('OM彙總'!C5:C${4 + omSummary.length})`,
            '',
            `SUM('OM彙總'!E5:E${4 + omSummary.length})`,
            '100%',
            '',
            '',
            '',
            '',
            ''
        ]);

        const wsOmSummary = XLSX.utils.aoa_to_sheet(omSummaryDataFormulas);
        
        // 設置欄寬
        wsOmSummary['!cols'] = [
            { wch: 15 },  // 營運經理
            { wch: 12 },  // 區域分佈
            { wch: 12 },  // 店舖數量
            { wch: 12 },  // 平均SS
            { wch: 12 },  // SS總計
            { wch: 12 },  // 佔比
            { wch: 10 },  // Carry
            { wch: 10 },  // A類店
            { wch: 10 },  // B類店
            { wch: 10 },  // C類店
            { wch: 10 }   // D類店
        ];

        // 設置公式屬性
        omSummaryDataFormulas.forEach((row, idx) => {
            if (idx >= 4 && idx < 4 + omSummary.length) {
                // 各種需要公式的列
                [2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(col => {
                    const cellRef = XLSX.utils.encode_cell({ r: idx, c: col });
                    if (wsOmSummary[cellRef] && row[col]) {
                        wsOmSummary[cellRef].f = row[col];
                        wsOmSummary[cellRef].v = (col === 5 || col === 6) ? '0%' : 0;
                    }
                });
            } else if (idx === 4 + omSummary.length + 1) {
                // 總計行
                [2, 4].forEach(col => {
                    const cellRef = XLSX.utils.encode_cell({ r: idx, c: col });
                    if (wsOmSummary[cellRef] && row[col]) {
                        wsOmSummary[cellRef].f = row[col];
                        wsOmSummary[cellRef].v = 0;
                    }
                });
            }
        });

        XLSX.utils.book_append_sheet(wb, wsOmSummary, 'OM彙總');
        
        // 匯出檔案
        const fileName = this.generateFileName('safetystock_formulas', 'xlsx');
        XLSX.writeFile(wb, fileName);
    }

    // 建構 Safety Stock 的 VLOOKUP 公式
    buildSafetyStockFormula(region, category, size, type, sheetName, mode = this.calculationMode) {
        // 建構公式：使用 VLOOKUP 從對照表查詢（現包含 Type 維度）
        // 對照表格式: 第一列是 Row Header (HK-A-T, HK-A-M, HK-A-L 等)，列是 Size (XL, L, M, S, XS)

        if (mode === 'mode2') {
            const regionCatKey = `${region}-${category}`;
            const sizeColumn = this.getSizeColumnNumber(size);
            return `VLOOKUP("${regionCatKey}",'${sheetName}'!A:F,${sizeColumn},FALSE)`;
        }

        if (mode === 'mode3') {
            const regionCatKey = `${region}-${category}`;
            const typeColumn = this.getTypeColumnNumber(type);
            return `VLOOKUP("${regionCatKey}",'${sheetName}'!A:D,${typeColumn},FALSE)`;
        }

        const typeLabel = { 'T': '遊客', 'M': '混合', 'L': '本地' }[type] || '混合';
        const regionCatTypeKey = `${region}-${category}-${type}(${typeLabel})`;
        const sizeColumn = this.getSizeColumnNumber(size); // 取得Size對應的列號

        return `VLOOKUP("${regionCatTypeKey}",'${sheetName}'!A:F,${sizeColumn},FALSE)`;
    }

    // 取得 Size 對應的列號
    getSizeColumnNumber(size) {
        const sizeMap = {
            'XL': 2,
            'L': 3,
            'M': 4,
            'S': 5,
            'XS': 6
        };
        return sizeMap[size] || 2;
    }

    // 取得 Type 對應的列號（模式 3 用）
    getTypeColumnNumber(type) {
        const typeMap = {
            'T': 2,
            'M': 3,
            'L': 4
        };
        return typeMap[type] || 3;
    }

    // 為 Excel 構建可編輯的對照表數據（依模式）
    buildEditableMatrixForExcelByMode(mode = this.calculationMode) {
        const matrixData = [];
        
        // 標題行
        if (mode === 'mode2') {
            matrixData.push(['Safety Stock 對照表（模式 2）', 'XL', 'L', 'M', 'S', 'XS']);
        } else if (mode === 'mode3') {
            matrixData.push(['Safety Stock 對照表（模式 3）', '遊客', '混合', '本地']);
        } else {
            matrixData.push(['Safety Stock 對照表（含客源類型）', 'XL', 'L', 'M', 'S', 'XS']);
        }
        matrixData.push([]);

        const regions = ['HK', 'MO'];
        const categories = ['A', 'B', 'C', 'D'];
        const types = ['T', 'M', 'L'];
        const typeLabels = { 'T': '遊客', 'M': '混合', 'L': '本地' };
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];

        regions.forEach(region => {
            if (mode === 'mode3') {
                matrixData.push([`${region} 區域`, '', '', '']);
            } else {
                matrixData.push([`${region} 區域`, '', '', '', '', '']);
            }

            categories.forEach(category => {
                if (mode === 'mode2') {
                    const rowLabel = `${region}-${category}`;
                    const rowData = [rowLabel];
                    sizes.forEach(size => {
                        const value = this.getSafetyStock(region, category, size, 'M', mode);
                        rowData.push(value);
                    });
                    matrixData.push(rowData);
                } else if (mode === 'mode3') {
                    const rowLabel = `${region}-${category}`;
                    const rowData = [rowLabel];
                    types.forEach(type => {
                        const value = this.getSafetyStock(region, category, 'M', type, mode);
                        rowData.push(value);
                    });
                    matrixData.push(rowData);
                } else {
                    types.forEach(type => {
                        const rowLabel = `${region}-${category}-${type}(${typeLabels[type]})`;
                        const rowData = [rowLabel];

                        sizes.forEach(size => {
                            const value = this.getSafetyStock(region, category, size, type, 'mode1');
                            rowData.push(value);
                        });

                        matrixData.push(rowData);
                    });
                }
            });

            matrixData.push([]); // 區域之間的空行
        });

        return matrixData;
    }

    exportConfiguration() {
        const config = {
            customSafetyStock: this.customSafetyStock,
            customSafetyStockMode2: this.customSafetyStockMode2,
            customSafetyStockMode3: this.customSafetyStockMode3,
            customStoreStock: this.customStoreStock,
            matrixDraft: this.matrixDraft,
            matrixDraftMode2: this.matrixDraftMode2,
            matrixDraftMode3: this.matrixDraftMode3,
            calculationMode: this.calculationMode,
            selectedStores: this.selectedStores,
            stores: this.stores,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, this.generateFileName('safetystock_config', 'json'));
    }

    importConfiguration(e) {
        if (!this._adminVerified) { this.showToast('❌ 請先解鎖管理區域'); return; }
        const file = e.target.files[0];
        if (!file) return;

        const importToken = (this._configImportToken || 0) + 1;
        this._configImportToken = importToken;
        if (this._configReader && this._configReader.readyState === 1) {
            this._configReader.abort();
        }

        const reader = new FileReader();
        this._configReader = reader;
        reader.onload = (event) => {
            if (importToken !== this._configImportToken) return;
            this._configReader = null;
            try {
                const config = JSON.parse(event.target.result);
                
                if (config.customSafetyStock) {
                    this.customSafetyStock = config.customSafetyStock;
                    this.matrixDraft = this.buildMatrixDraftFromApplied();
                }

                if (config.customSafetyStockMode2) {
                    this.customSafetyStockMode2 = config.customSafetyStockMode2;
                }

                if (config.customSafetyStockMode3) {
                    this.customSafetyStockMode3 = config.customSafetyStockMode3;
                }

                if (config.customStoreStock) {
                    this.customStoreStock = config.customStoreStock;
                }

                if (config.matrixDraft) {
                    if (this.isValidMatrixDraftStructure(config.matrixDraft)) {
                        this.matrixDraft = config.matrixDraft;
                    }
                }

                if (config.matrixDraftMode2) {
                    if (this.isValidMatrixDraftMode2(config.matrixDraftMode2)) {
                        this.matrixDraftMode2 = config.matrixDraftMode2;
                    }
                }

                if (config.matrixDraftMode3) {
                    if (this.isValidMatrixDraftMode3(config.matrixDraftMode3)) {
                        this.matrixDraftMode3 = config.matrixDraftMode3;
                    }
                }

                if (config.stores) {
                    this.stores = config.stores;
                    STORES_CONFIG.stores = config.stores;
                    // 重建店鋪索引 Map
                    this.storeMap = new Map();
                    this.stores.forEach(store => {
                        this.storeMap.set(store.Site, store);
                    });
                }

                if (config.calculationMode) {
                    this.setCalculationMode(config.calculationMode, { render: false, persist: false });
                }
                
                if (Array.isArray(config.selectedStores)) {
                    this.selectedStores = [...new Set(config.selectedStores)]
                        .filter(idx => Number.isInteger(idx) && idx >= 0 && idx < this.stores.length && this.stores[idx] !== undefined);
                }

                // 匯入的草稿必須同步為生效值，否則 calculate() 讀的是舊生效值，匯入等於無效
                try { this.syncDraftToApplied({ silent: true }); } catch (e) {}

                // 匯入後一次重建所有依賴狀態，避免沿用舊結果 / 舊店鋪列表
                this.clearFilters();
                this.renderOmFilterButtons();
                this.qrPopulateOmFilter();
                this.renderStores();
                this.renderSafetyStockMatrix();
                this.scheduleAutoCalculate();

                this.saveToLocalStorage();
                alert('配置導入成功！');
            } catch (err) {
                alert('配置導入失敗：' + err.message);
            }
        };
        reader.onerror = () => {
            if (importToken === this._configImportToken) {
                this._configReader = null;
                alert('配置導入失敗：無法讀取檔案');
            }
        };
        reader.onabort = () => {
            if (importToken === this._configImportToken) this._configReader = null;
        };
        reader.readAsText(file);
        e.target.value = ''; // 重置 input
    }

    // ==================== 打印函數 ====================
    
    printResults() {
        if (this.summaryResults.length === 0) {
            alert('請先計算結果');
            return;
        }
        
        const printWindow = window.open('', '_blank');
        
        let totalStores = 0;
        let totalSS = 0;
        let carryCount = 0;
        
        let summaryHTML = '';
        this.summaryResults.forEach(result => {
            const carry = result.allShopQty > 0 ? 'Y' : 'FALSE';
            if (result.allShopQty > 0) carryCount += result.storeCount;
            totalStores += result.storeCount;
            totalSS += result.allShopQty;
            const sizeDisplay = result.displaySize || result.size;
            const displaySs = result.displaySs ?? result.safetyStock;

            summaryHTML += `
                <tr>
                    <td>${result.region}</td>
                    <td>${result.category}</td>
                    <td>${sizeDisplay}</td>
                    <td><strong>${result.typeCode}</strong></td>
                    <td style="text-align:center">${result.storeCount}</td>
                    <td style="text-align:center">${displaySs}</td>
                    <td style="text-align:center"><strong>${result.allShopQty}</strong></td>
                    <td style="text-align:center">${carry}</td>
                </tr>
            `;
        });
        
        let detailHTML = '';
        this.results.forEach(result => {
            const carry = result.safetyStock > 0 ? 'Y' : 'FALSE';
            const store = this.storeMap.get(result.code);
            const storeSize = store?.Size || result.size;
            const specialFlag = isSpecialAttentionStore(store) ? '⭐ 需特別關注' : '';
            detailHTML += `
                <tr>
                    <td>${escapeHtml(result.region)}</td>
                    <td>${escapeHtml(result.code)}</td>
                    <td>${escapeHtml(result.name)}</td>
                    <td>${escapeHtml(result.typeCode)}</td>
                    <td>${escapeHtml(result.category)}</td>
                    <td>${escapeHtml(storeSize)}</td>
                    <td style="text-align:center">${result.safetyStock}</td>
                    <td style="text-align:center">${carry}</td>
                    <td>${escapeHtml(specialFlag)}</td>
                </tr>
            `;
        });
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Safety Stock 計算結果</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #667eea; text-align: center; }
                    h2 { color: #333; margin-top: 30px; }
                    .info { background: #f0f4ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background: #667eea; color: white; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .total-row { background: #e8f5e9 !important; font-weight: bold; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <h1>🏪 Safety Stock 計算結果</h1>
                <div class="info">
                    <p><strong>生成日期：</strong>${new Date().toLocaleString('zh-TW')}</p>
                    <p><strong>店舖總數：</strong>${totalStores} 間</p>
                    <p><strong>Safety Stock 總需求：</strong>${totalSS}</p>
                    <p><strong>Carry 店舖數：</strong>${carryCount} 間</p>
                </div>
                
                <h2>📊 彙總表</h2>
                <table>
                    <thead>
                        <tr>
                            <th>HK/MO</th>
                            <th>舖類</th>
                            <th>貨場面積</th>
                            <th>代碼</th>
                            <th>店舖數量</th>
                            <th>Safety Stock</th>
                            <th>ALL SHOP QTY</th>
                            <th>Carry</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summaryHTML}
                        <tr class="total-row">
                            <td colspan="4" style="text-align:right">TOTAL:</td>
                            <td style="text-align:center">${totalStores}</td>
                            <td style="text-align:center">SS:</td>
                            <td style="text-align:center" class="total-highlight">${totalSS}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
                
                <h2>📋 店舖詳細清單</h2>
                <table>
                    <thead>
                        <tr>
                            <th>HK/MO</th>
                            <th>代號</th>
                            <th>店舖</th>
                            <th>類型代碼</th>
                            <th>舖類</th>
                            <th>貨場面積</th>
                            <th>Safety Stock</th>
                            <th>Carry</th>
                            <th>需特別關注</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${detailHTML}
                    </tbody>
                </table>
                
                <div class="no-print" style="text-align:center;margin-top:30px">
                    <button onclick="window.print()" style="padding:10px 20px;font-size:0.94em;cursor:pointer">打印</button>
                    <button onclick="window.close()" style="padding:10px 20px;font-size:0.94em;cursor:pointer;margin-left:10px">關閉</button>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
    }

    // ==================== 店鋪 CSV 導入 ====================

    triggerStoresCsvUpload() {
        if (!this._adminVerified) { this.showToast('❌ 請先解鎖管理區域'); return; }
        const input = document.getElementById('storesCsvFile');
        if (input) input.click();
    }

    downloadStoresCsvTemplate() {
        // 使用當前店鋪名單生成 CSV 範本（包含 Class 1, Class 2, Type, 需特別關注欄位）
        const header = 'Site,Shop,Regional,Class 1,Class 2,Size,OM,Type,需特別關注';
        
        // 按區域、代號排序店鋪
        const sortedStores = [...this.stores].sort((a, b) => {
            if (a.Regional !== b.Regional) return a.Regional.localeCompare(b.Regional);
            return a.Site.localeCompare(b.Site);
        });
        
        // 生成數據行
        const rows = sortedStores.map(store => {
            const site = store.Site || '';
            const shop = store.Shop || '';
            const regional = store.Regional || '';
            const classVal = store.Class || '';
            const class2 = store.Class2 || '';
            const size = store.Size || '';
            const om = store.OM || '';
            const type = store.Type || 'M';
            const special = store.SpecialAttention ? '需特別關注' : '';

            // 處理可能包含逗號的店鋪名稱
            const escapedShop = shop.includes(',') ? `"${shop}"` : shop;

            return `${site},${escapedShop},${regional},${classVal},${class2},${size},${om},${type},${special}`;
        });
        
        // 組合 CSV 內容
        const csv = '\uFEFF' + header + '\n' + rows.join('\n') + '\n';
        
        // 生成檔案名稱（包含日期時間）
        const fileName = this.generateFileName('stores-template', 'csv');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        this.downloadBlob(blob, fileName);
        
        // 顯示提示
        this.showToast(`✅ 已下載店鋪範本（${sortedStores.length} 間店鋪）`);
    }

    importStoresFromCsv(e) {
        if (!this._adminVerified) { this.showToast('❌ 請先解鎖管理區域'); return; }
        const file = e.target.files[0];
        if (!file) return;

        const importToken = (this._storesImportToken || 0) + 1;
        this._storesImportToken = importToken;
        if (this._storesReader && this._storesReader.readyState === 1) {
            this._storesReader.abort();
        }

        const reader = new FileReader();
        this._storesReader = reader;
        reader.onload = (event) => {
            if (importToken !== this._storesImportToken) return;
            this._storesReader = null;
            try {
                const text = event.target.result || '';
                const parsed = this.parseStoresCsv(text);
                if (parsed.errors.length > 0) {
                    alert('CSV 內容有誤：\n' + parsed.errors.join('\n'));
                    return;
                }

                this.stores = parsed.stores;
                STORES_CONFIG.stores = parsed.stores;
                // 重建店鋪索引 Map
                this.storeMap = new Map();
                this.stores.forEach(store => {
                    this.storeMap.set(store.Site, store);
                });
                this.selectedStores = [];
                this.clearFilters();
                this.renderOmFilterButtons();
                this.qrPopulateOmFilter();
                this.renderStores();
                this.scheduleAutoCalculate();
                this.saveToLocalStorage();
                alert(`店鋪名單更新成功！共 ${parsed.stores.length} 間店鋪。`);
            } catch (err) {
                alert('CSV 導入失敗：' + err.message);
            }
        };
        reader.onerror = () => {
            if (importToken === this._storesImportToken) {
                this._storesReader = null;
                alert('CSV 導入失敗：無法讀取檔案');
            }
        };
        reader.onabort = () => {
            if (importToken === this._storesImportToken) this._storesReader = null;
        };
        reader.readAsText(file, 'utf-8');
        e.target.value = '';
    }

    parseStoresCsv(text) {
        const rows = this.parseCsv(text);
        const errors = [];
        const stores = [];

        if (rows.length === 0) {
            return { stores, errors: ['CSV 內容為空'] };
        }

        const headerAliases = {
            Site: ['site', 'code', 'storecode', '代號', '代碼', '店舖代號', '店鋪代號'],
            Shop: ['shop', 'name', 'storename', '店舖', '店鋪', '店名', '店舖名稱', '店鋪名稱'],
            Regional: ['regional', 'region', 'area', 'hk/mo', '區域', '地區'],
            Class: ['class', 'class 1', 'class1', 'category', '舖類', '舖類別', '類別'],
            Class2: ['class 2', 'class2', 'sub class', '子類別', '舖類2'],
            Size: ['size', 'area size', '貨場面積', '面積'],
            OM: ['om', 'manager', '營運經理', '經理'],
            Type: ['type', '客源類型', '客源', '店舖類型'],
            SpecialAttention: ['需特別關注', '特別關注', 'specialattention', 'special attention']
        };

        const headerRow = rows[0].map(v => v.trim());
        const headerLower = headerRow.map(v => v.toLowerCase());
        const columnIndexByField = {};

        headerLower.forEach((cell, idx) => {
            Object.keys(headerAliases).forEach(field => {
                if (columnIndexByField[field] !== undefined) return;
                if (headerAliases[field].some(alias => alias.toLowerCase() === cell)) {
                    columnIndexByField[field] = idx;
                }
            });
        });

        const hasHeader = ['Site', 'Shop', 'Regional', 'Class', 'Size']
            .filter(field => columnIndexByField[field] !== undefined).length >= 3;

        const dataStartIndex = hasHeader ? 1 : 0;
        const fixedIndex = { Site: 0, Shop: 1, Regional: 2, Class: 3, Class2: 4, Size: 5, OM: 6, Type: 7, SpecialAttention: 8 };

        const validRegions = ['HK', 'MO'];
        const validCategories = ['A', 'B', 'C', 'D'];
        const validSizes = Object.keys(SIZE_DEFINITIONS || {});
        const validTypes = ['T', 'M', 'L'];

        for (let i = dataStartIndex; i < rows.length; i++) {
            const row = rows[i];
            if (row.every(cell => cell.trim() === '')) continue;

            const getCell = (field) => {
                const idx = hasHeader ? columnIndexByField[field] : fixedIndex[field];
                return (idx !== undefined && row[idx] !== undefined) ? row[idx].trim() : '';
            };

            const Site = getCell('Site');
            const Shop = getCell('Shop');
            const Regional = getCell('Regional').toUpperCase();
            const Class = getCell('Class').toUpperCase();
            const Class2 = getCell('Class2').toUpperCase();
            let Size = getCell('Size').toUpperCase();
            const OM = getCell('OM');
            const Type = getCell('Type').toUpperCase();
            const specialAttentionRaw = getCell('SpecialAttention');

            const rowNumber = i + 1;

            if (!Site || !Shop || !Regional || !Class || !Size) {
                errors.push(`第 ${rowNumber} 行：缺少必填欄位（Site/Shop/Regional/Class/Size）`);
                continue;
            }

            if (!validRegions.includes(Regional)) {
                errors.push(`第 ${rowNumber} 行：Regional 必須為 HK 或 MO`);
                continue;
            }

            if (!validCategories.includes(Class)) {
                errors.push(`第 ${rowNumber} 行：Class 必須為 A/B/C/D`);
                continue;
            }

            if (validSizes.length > 0 && !validSizes.includes(Size)) {
                if (Size === 'TBC') {
                    console.warn(`第 ${rowNumber} 行（${Site} ${Shop}）：Size 為 TBC，預設為 M`);
                    Size = 'M';
                } else {
                    errors.push(`第 ${rowNumber} 行：Size 必須為 ${validSizes.join('/')}`);
                    continue;
                }
            }

            // 「需特別關注」欄位：有值且非否定詞即標記（CSV 中填「需特別關注」）
            const specialAttention = specialAttentionRaw !== '' &&
                !['n', 'no', 'false', '0', '否', '無'].includes(specialAttentionRaw.toLowerCase());

            const storeObj = {
                Site,
                Shop,
                Regional,
                Class,
                Size,
                OM: OM || '',
                Type: validTypes.includes(Type) ? Type : 'M',
                SpecialAttention: specialAttention
            };

            // 如果有 Class2 欄位則加入
            if (Class2) {
                storeObj.Class2 = Class2;
            }

            stores.push(storeObj);
        }

        if (stores.length === 0 && errors.length === 0) {
            errors.push('未讀取到任何有效店鋪資料');
        }

        return { stores, errors };
    }

    parseCsv(text) {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const next = text[i + 1];

            if (inQuotes) {
                if (char === '"') {
                    if (next === '"') {
                        field += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    row.push(field);
                    field = '';
                } else if (char === '\n') {
                    row.push(field);
                    rows.push(row);
                    row = [];
                    field = '';
                } else if (char === '\r') {
                    continue;
                } else {
                    field += char;
                }
            }
        }

        if (field.length > 0 || row.length > 0) {
            row.push(field);
            rows.push(row);
        }

        return rows.filter(r => r.some(cell => cell.trim() !== ''));
    }

    // ==================== 店鋪管理區域摺疊與密碼保護 ====================

    // 切換店鋪管理區域顯示/隱藏
    toggleStoresManagement() {
        const content = document.getElementById('storesManagementContent');
        const btn = document.getElementById('toggleStoresManagement');
        
        if (!content || !btn) {
            console.error('無法找到必要的 DOM 元素');
            return;
        }

        // 使用 getComputedStyle 來獲取實際的顯示狀態
        const currentDisplay = window.getComputedStyle(content).display;
        
        if (currentDisplay === 'none') {
            content.style.display = 'block';
            btn.textContent = '▲';
        } else {
            content.style.display = 'none';
            btn.textContent = '▼';
        }
    }

    // 驗證管理員密碼
    async verifyAdminPassword() {
        const passwordInput = document.getElementById('adminPassword');
        const password = passwordInput.value.trim();

        const encoder = new TextEncoder();
        const data = encoder.encode(password + '_sasa_admin_salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const ADMIN_PASSWORD_HASH = '18c6390a3e189277c6f18c9602de2aa1116bdf40464008fdb56f2c7fd05f348f';

        if (hashHex === ADMIN_PASSWORD_HASH) {
            this._adminVerified = true;
            document.getElementById('passwordLock').style.display = 'none';
            document.getElementById('unlockedContent').style.display = 'block';
            passwordInput.value = '';
            this.showToast('✅ 管理員權限已確認');
        } else {
            this.showToast('❌ 密碼錯誤，請重試');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    // 鎖定管理區域
    lockManagement() {
        this._adminVerified = false;
        document.getElementById('passwordLock').style.display = 'block';
        document.getElementById('unlockedContent').style.display = 'none';
        this.showToast('🔒 管理區域已鎖定');
    }

    // ==================== 本地存儲函數 ====================
    
    saveToLocalStorage() {
        const data = {
            customSafetyStock: this.customSafetyStock,
            customSafetyStockMode2: this.customSafetyStockMode2,
            customSafetyStockMode3: this.customSafetyStockMode3,
            customStoreStock: this.customStoreStock, // 個別店鋪的自訂值
            selectedStores: this.selectedStores,
            stores: this.stores,
            theme: this.currentTheme, // 保存當前主題
            weightConfig: this.weightConfig,
            matrixDraft: this.matrixDraft,
            matrixDraftMode2: this.matrixDraftMode2,
            matrixDraftMode3: this.matrixDraftMode3,
            calculationMode: this.calculationMode
        };
        try {
            localStorage.setItem('safetyStockCalculatorV2', JSON.stringify(data));
            return true;
        } catch (err) {
            // 私隱模式／配額錯誤不應中斷店鋪選擇及重算流程
            console.warn('無法保存至 localStorage:', err);
            return false;
        }
    }

    loadFromLocalStorage() {
        let hasSavedSelection = false;
        try {
            const data = JSON.parse(localStorage.getItem('safetyStockCalculatorV2'));
            // 檢查是否需要更新店鋪資料（如果 localStorage 中的店鋪數量與 config.js 不同）
            const configStoreCount = STORES_CONFIG.stores.length;
            let storeCountMismatch = false;
            let needsTypeUpdate = false;
            let needsClass2Update = false;
            let needsSpecialAttentionUpdate = false;

            if (data && data.stores) {
                const savedStoreCount = data.stores.length;
                if (savedStoreCount !== configStoreCount) {
                    console.log(`店鋪數量已更新：${savedStoreCount} → ${configStoreCount}，使用新的店鋪資料`);
                    storeCountMismatch = true;
                }

                // 檢查是否缺少 Type 屬性（數據版本檢查）
                if (!storeCountMismatch && data.stores.length > 0) {
                    const hasTypeProperty = data.stores.every(store => store.hasOwnProperty('Type'));
                    if (!hasTypeProperty) {
                        console.log('偵測到舊版本店鋪資料（缺少 Type 屬性），正在更新...');
                        needsTypeUpdate = true;
                    }
                }

                // 檢查是否缺少 Class2 屬性（數據版本檢查）
                if (!storeCountMismatch && !needsTypeUpdate && data.stores.length > 0) {
                    const hasClass2Property = data.stores.some(store => store.hasOwnProperty('Class2'));
                    if (!hasClass2Property) {
                        console.log('偵測到舊版本店鋪資料（缺少 Class2 屬性），正在更新...');
                        needsClass2Update = true;
                    }
                }

                // 檢查是否缺少 SpecialAttention 屬性（需特別關注，數據版本檢查）
                if (!storeCountMismatch && !needsTypeUpdate && !needsClass2Update && data.stores.length > 0) {
                    const hasSpecialAttentionProperty = data.stores.some(store => store.hasOwnProperty('SpecialAttention'));
                    if (!hasSpecialAttentionProperty) {
                        console.log('偵測到舊版本店鋪資料（缺少 SpecialAttention 屬性），正在更新...');
                        needsSpecialAttentionUpdate = true;
                    }
                }

                // 檢查店鋪資料是否與 config.js 一致（比對 Site 代號 + 需特別關注標記，
                // 標記有變更時例如新增 HC72，也須改用 config.js 的新資料）
                if (!storeCountMismatch && !needsTypeUpdate && !needsClass2Update && !needsSpecialAttentionUpdate && data.stores.length > 0) {
                    const savedSites = data.stores.map(s => s.Site + (s.SpecialAttention ? '*' : '')).sort().join(',');
                    const configSites = STORES_CONFIG.stores.map(s => s.Site + (s.SpecialAttention ? '*' : '')).sort().join(',');
                    if (savedSites !== configSites) {
                        console.log('偵測到店鋪代號或需特別關注標記已變更，使用新的店鋪資料');
                        storeCountMismatch = true;
                    }
                }
            }

            if (data) {
                if (data.calculationMode) {
                    this.setCalculationMode(data.calculationMode, { render: false, persist: false });
                }

                if (storeCountMismatch || needsTypeUpdate || needsClass2Update || needsSpecialAttentionUpdate) {
                    this.stores = JSON.parse(JSON.stringify(STORES_CONFIG.stores));
                    this.storeMap = new Map();
                    this.stores.forEach(store => {
                        this.storeMap.set(store.Site, store);
                    });
                    const hasSavedSelectionData = Object.prototype.hasOwnProperty.call(data, 'selectedStores') && Array.isArray(data.selectedStores);
                    if (hasSavedSelectionData) {
                        hasSavedSelection = true;
                        const savedSelectedSites = new Set(
                            data.selectedStores
                                .map(index => data.stores?.[index]?.Site)
                                .filter(Boolean)
                        );
                        this.selectedStores = this.stores
                            .map((store, index) => savedSelectedSites.has(store.Site) ? index : -1)
                            .filter(index => index >= 0);
                    } else {
                        this.selectedStores = this.stores.map((_, index) => index);
                    }

                    if (needsClass2Update) {
                        this.showToast(`✅ 店鋪資料已更新（新增 Class2 分類），已預設全選`);
                    } else if (needsTypeUpdate) {
                        this.showToast(`✅ 店鋪資料已更新（新增 Type 分類），已預設全選`);
                    } else if (needsSpecialAttentionUpdate) {
                        this.showToast(`✅ 店鋪資料已更新（新增需特別關注標記），已預設全選`);
                    } else {
                        this.showToast(`🔄 店鋪資料已更新（${configStoreCount} 間），已預設全選`);
                    }
                } else {
                    if (data.stores && data.stores.length > 0) {
                        this.stores = data.stores;
                        STORES_CONFIG.stores = data.stores;
                        this.storeMap = new Map();
                        this.stores.forEach(store => {
                            this.storeMap.set(store.Site, store);
                        });
                    }

                    if (Object.prototype.hasOwnProperty.call(data, 'selectedStores') && Array.isArray(data.selectedStores)) {
                        hasSavedSelection = true;
                        this.selectedStores = [...new Set(data.selectedStores)]
                            .filter(idx => Number.isInteger(idx) && idx >= 0 && idx < this.stores.length && this.stores[idx] !== undefined);
                    }
                }

                // 載入其他設定（與店鋪數量無關）
                if (data.customSafetyStock) {
                    this.customSafetyStock = data.customSafetyStock;
                }
                if (data.customSafetyStockMode2) {
                    this.customSafetyStockMode2 = data.customSafetyStockMode2;
                }
                if (data.customSafetyStockMode3) {
                    this.customSafetyStockMode3 = data.customSafetyStockMode3;
                }
                if (data.customStoreStock) {
                    this.customStoreStock = data.customStoreStock;
                }
                // 加載保存的主題（如果有的話）
                if (data.theme && AVAILABLE_THEMES[data.theme]) {
                    this.currentTheme = data.theme;
                    this.applyTheme(data.theme);
                }
                // 加載權重配置（如果有的話）
                if (data.weightConfig) {
                    this.weightConfig = data.weightConfig;
                    this.loadWeightConfigToUI();
                }
                if (data.matrixDraft) {
                    // 檢查matrixDraft是否是有效的3D結構（HK/MO → Category → Type → Size）
                    const isValid3DMatrix = this.isValidMatrixDraftStructure(data.matrixDraft);
                    if (isValid3DMatrix) {
                        this.matrixDraft = data.matrixDraft;
                        console.log('✓ 成功加載保存的對照表草稿');
                    } else {
                        console.warn('偵測到舊版本或無效的對照表格式，正在重新構建...');
                        this.matrixDraft = this.buildMatrixDraftFromApplied();
                    }
                } else {
                    this.matrixDraft = this.buildMatrixDraftFromApplied();
                }

                if (data.matrixDraftMode2) {
                    const isValidMode2 = this.isValidMatrixDraftMode2(data.matrixDraftMode2);
                    if (isValidMode2) {
                        this.matrixDraftMode2 = data.matrixDraftMode2;
                    } else {
                        this.matrixDraftMode2 = this.buildMatrixDraftMode2();
                    }
                } else {
                    this.matrixDraftMode2 = this.buildMatrixDraftMode2();
                }

                if (data.matrixDraftMode3) {
                    const isValidMode3 = this.isValidMatrixDraftMode3(data.matrixDraftMode3);
                    if (isValidMode3) {
                        this.matrixDraftMode3 = data.matrixDraftMode3;
                    } else {
                        this.matrixDraftMode3 = this.buildMatrixDraftMode3();
                    }
                } else {
                    this.matrixDraftMode3 = this.buildMatrixDraftMode3();
                }
                this.renderSafetyStockMatrix();
            }
        } catch (err) {
            console.log('無法從本地存儲加載數據');
        }

        if (!this.selectedStores || (!hasSavedSelection && this.selectedStores.length === 0)) {
            this.selectedStores = this.stores.map((_, index) => index);
        }

        // 所有狀態 hydration 完成後只渲染一次，確保店鋪列使用已載入的 custom values
        this.renderStores();
        this.updateCheckboxes();
        this.saveToLocalStorage();
    }

    // ==================== 權重快速設定功能 ====================

    // 設置權重面板事件監聽（輸入即自動生效，免去預覽→套用兩步）
    setupWeightPanelListeners() {
        // 切換面板顯示/隱藏
        document.getElementById('toggleWeightPanel')?.addEventListener('click', () => this.toggleWeightPanel());

        // 算式簡介摺疊/展開
        document.getElementById('formulaToggleBtn')?.addEventListener('click', () => this.toggleFormulaIntro());

        // 套用權重（手動備用，免確認直接生效）
        document.getElementById('applyWeightsBtn')?.addEventListener('click', () => this.applyWeights({ skipConfirm: true }));

        // 銷售目標數量變化事件（含自動生效）
        document.getElementById('salesTarget')?.addEventListener('change', () => { this.updateTargetSafetyStock(); this.scheduleAutoWeightApply(); });
        document.getElementById('salesTarget')?.addEventListener('input', () => { this.updateTargetSafetyStock(); this.scheduleAutoWeightApply(); });
        document.getElementById('targetTotal')?.addEventListener('input', () => this.scheduleAutoWeightApply());

        // Safety Stock Days 滑塊變化事件（含自動生效）
        document.getElementById('safetyStockDays')?.addEventListener('input', (e) => {
            const display = document.querySelector('.days-display');
            if (display) {
                display.textContent = e.target.value;
            }
            this.updateTargetSafetyStock();
            this.scheduleAutoWeightApply();
        });
        document.getElementById('safetyStockDays')?.addEventListener('change', () => this.scheduleAutoWeightApply());

        // 所有權重數字輸入：輸入即自動預覽 + 套用（防抖）
        const weightIds = ['weightClassA','weightClassB','weightClassC','weightClassD','weightSizeXL','weightSizeL','weightSizeM','weightSizeS','weightSizeXS','weightTypeT','weightTypeM','weightTypeL','baseValue','hkFactor','moFactor'];
        weightIds.forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.scheduleAutoWeightApply());
            document.getElementById(id)?.addEventListener('change', () => this.scheduleAutoWeightApply());
        });

        // 模板按鈕
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const templateName = e.target.dataset.template;
                this.applyWeightTemplate(templateName);
            });
        });
    }

    hasActiveSafetyEditor() {
        return !!document.querySelector('#storesContainer .store-stock-input.editing, #matrixContainer .matrix-cell.editing .edit-value');
    }

    flushPendingWeightApply() {
        if (!this._pendingWeightApply) return;
        this._pendingWeightApply = false;
        try { this.autoApplyWeightsSilent(); } catch (e) { console.warn('autoApplyWeightsSilent failed', e); }
    }

    // 防抖：權重輸入後 450ms 自動走完 預覽→套用→同步→重算
    scheduleAutoWeightApply() {
        // 參數一改動就使舊結果失效，避免防抖等待期間匯出舊值
        if (this.results.length > 0 || this.summaryResults.length > 0) {
            this.clearCalculationResults();
        }
        if (this._weightDebounce) clearTimeout(this._weightDebounce);
        this._weightDebounce = setTimeout(() => {
            this._weightDebounce = null;
            if (this.hasActiveSafetyEditor()) {
                // 不可在 inline editor 仍focus時重建 DOM，先等儲存/取消
                this._pendingWeightApply = true;
                return;
            }
            try { this.updateTargetSafetyStock(); } catch (e) {}
            try { this.autoApplyWeightsSilent(); } catch (e) { console.warn('autoApplyWeightsSilent failed', e); }
        }, 450);
    }

    // 目標總量合理性提示（雙向共用）：上調>3x 或下調<1/3 皆告警；正常範圍回傳 ''
    getTargetSanityWarn(targetTotal, naturalTotal) {
        if (!(targetTotal > 0) || !(naturalTotal > 0)) return '';
        if (targetTotal > 3 * naturalTotal) {
            const ratio = (targetTotal / naturalTotal).toFixed(1);
            return ` ⚠️ 目標約為自然總量 ${ratio} 倍，請確認銷售目標是否為「單一 SKU」月銷量`;
        }
        if (targetTotal * 3 < naturalTotal) {
            const ratio = (naturalTotal / targetTotal).toFixed(1);
            return ` ⚠️ 目標僅為自然總量約 1/${ratio}，多數對照表格將被壓成 0，請確認目標是否正確（是否少填一位數）`;
        }
        return '';
    }

    // 靜默自動套用：不彈 confirm、不打斷輸入焦點
    autoApplyWeightsSilent() {
        if (this.hasActiveSafetyEditor()) {
            this._pendingWeightApply = true;
            return;
        }

        const weights = this.readWeightsFromUI();
        let newMatrix = this.buildWeightMatrixByType(weights);
        const targetTotal = Math.round(weights.targetTotal || 0);
        const mode = this.calculationMode;
        const naturalTotal = this.calculateStoreTotals(newMatrix, mode).totalAll;
        if (targetTotal > 0) {
            const targetInfo = this.scaleMatrixToTarget(newMatrix, targetTotal, mode);
            newMatrix = targetInfo.matrix;
        }
        this.syncWeightMatrixToDraft(newMatrix, weights, mode);
        this.renderSafetyStockMatrix();
        this.saveToLocalStorage();
        try { this.previewWeights({ silent: true }); } catch (e) {}
        try { this.syncDraftToApplied({ silent: true }); } catch (e) {}
        try { this.renderStores(); } catch (e) {}
        try { this.updateCockpitBar(); } catch (e) {}
        this.scheduleAutoCalculate();
        // 自動模式平時保持靜默，但目標極端時仍需提醒（已防抖，不會逐字彈）
        try {
            const warn = this.getTargetSanityWarn(targetTotal, naturalTotal);
            if (warn) this.showToast(warn.trim());
        } catch (e) {}
    }

    // 共用：把權重矩陣寫入對照表草稿 + 保存權重配置
    syncWeightMatrixToDraft(newMatrix, weights, mode) {
        if (mode === 'mode2') {
            Object.keys(this.matrixDraftMode2).forEach(region => {
                Object.keys(this.matrixDraftMode2[region]).forEach(category => {
                    Object.keys(this.matrixDraftMode2[region][category]).forEach(size => {
                        this.matrixDraftMode2[region][category][size] = newMatrix?.[region]?.[category]?.M?.[size] ?? 0;
                    });
                });
            });
        } else if (mode === 'mode3') {
            Object.keys(this.matrixDraftMode3).forEach(region => {
                Object.keys(this.matrixDraftMode3[region]).forEach(category => {
                    Object.keys(this.matrixDraftMode3[region][category]).forEach(type => {
                        this.matrixDraftMode3[region][category][type] = newMatrix?.[region]?.[category]?.[type]?.M ?? 0;
                    });
                });
            });
        } else {
            this.matrixDraft = JSON.parse(JSON.stringify(newMatrix));
        }
        this.weightConfig = weights;
    }

    // 共用：把草稿同步為生效值（原 applyMatrixToStores 的核心，不彈 confirm）
    syncDraftToApplied(options = {}) {
        if (this.calculationMode === 'mode2') {
            this.customSafetyStockMode2 = {};
            if (this.matrixDraftMode2) {
                Object.keys(this.matrixDraftMode2).forEach(region => {
                    Object.keys(this.matrixDraftMode2[region] || {}).forEach(category => {
                        Object.keys(this.matrixDraftMode2[region][category] || {}).forEach(size => {
                            const draftValue = this.matrixDraftMode2[region][category][size];
                            const originalValue = getSafetyStockValue(region, category, size, 'M');
                            if (draftValue !== originalValue) {
                                const key = `${region}-${category}-${size}`;
                                this.customSafetyStockMode2[key] = draftValue;
                            }
                        });
                    });
                });
            }
        } else if (this.calculationMode === 'mode3') {
            this.customSafetyStockMode3 = {};
            if (this.matrixDraftMode3) {
                Object.keys(this.matrixDraftMode3).forEach(region => {
                    Object.keys(this.matrixDraftMode3[region] || {}).forEach(category => {
                        Object.keys(this.matrixDraftMode3[region][category] || {}).forEach(type => {
                            const draftValue = this.matrixDraftMode3[region][category][type];
                            const originalValue = getSafetyStockValue(region, category, 'M', type);
                            if (draftValue !== originalValue) {
                                const key = `${region}-${category}-${type}`;
                                this.customSafetyStockMode3[key] = draftValue;
                            }
                        });
                    });
                });
            }
        } else {
            // 模式1：全量同步（自動模式下不再只限已選店鋪，避免混淆）
            const newCustom = {};
            if (this.matrixDraft) {
                Object.keys(this.matrixDraft).forEach(region => {
                    Object.keys(this.matrixDraft[region] || {}).forEach(category => {
                        Object.keys(this.matrixDraft[region][category] || {}).forEach(type => {
                            Object.keys(this.matrixDraft[region][category][type] || {}).forEach(size => {
                                const draftValue = this.matrixDraft[region][category][type][size];
                                const originalValue = getSafetyStockValue(region, category, size, type);
                                if (draftValue !== originalValue) {
                                    const key = `${region}-${category}-${type}-${size}`;
                                    newCustom[key] = draftValue;
                                }
                            });
                        });
                    });
                });
            }
            this.customSafetyStock = newCustom;
        }
        this.saveToLocalStorage();
        if (!options.silent) this.showToast('✅ 對照表已自動同步到店鋪');
    }

    // 更新目標安全庫存數量
    updateTargetSafetyStock() {
        const salesTargetEl = document.getElementById('salesTarget');
        const safetyStockDaysEl = document.getElementById('safetyStockDays');
        const targetTotalEl = document.getElementById('targetTotal');
        
        const salesTarget = parseFloat(salesTargetEl?.value || 0);
        const safetyStockDays = parseFloat(safetyStockDaysEl?.value || 7);
        
        if (salesTarget > 0) {
            const calculatedTarget = Math.round((salesTarget / 30) * safetyStockDays);
            if (targetTotalEl) {
                targetTotalEl.value = calculatedTarget;
                // 當有銷售目標時，鎖定 targetTotal 為 readonly（淺灰底 + 深色字，兩種主題都清晰）
                targetTotalEl.readOnly = true;
                targetTotalEl.style.backgroundColor = '#f5f5f5';
                targetTotalEl.style.color = '#1a1b26';
            }
        } else {
            // 當沒有銷售目標時，允許手動編輯 targetTotal
            if (targetTotalEl) {
                targetTotalEl.readOnly = false;
                targetTotalEl.style.backgroundColor = '';
                targetTotalEl.style.color = '';
            }
        }
    }

    // 切換算式簡介摺疊/展開
    toggleFormulaIntro() {
        const btn = document.getElementById('formulaToggleBtn');
        const content = document.getElementById('formulaContent');

        if (btn && content) {
            btn.classList.toggle('collapsed');
            content.classList.toggle('collapsed');
        }
    }

    // 切換權重面板顯示/隱藏
    toggleWeightPanel() {
        const panel = document.getElementById('weightContent');
        const btn = document.getElementById('toggleWeightPanel');

        if (!panel) return;
        const hidden = panel.style.display === 'none' || getComputedStyle(panel).display === 'none';
        if (hidden) {
            panel.style.display = '';
            btn?.classList.add('active');
        } else {
            panel.style.display = 'none';
            btn?.classList.remove('active');
        }
    }

    // 從 UI 讀取權重設定 - 與對照表數值一致
    readWeightsFromUI() {
        const getValue = (id, defaultValue) => {
            const el = document.getElementById(id);
            const val = parseFloat(el?.value);
            return isNaN(val) ? defaultValue : val;
        };

        const salesTarget = getValue('salesTarget', 0);
        const safetyStockDays = getValue('safetyStockDays', 7);
        
        // 計算目標總量: salesTarget / 30 * safetyStockDays
        let targetTotal = getValue('targetTotal', 0);
        if (salesTarget > 0) {
            targetTotal = Math.round((salesTarget / 30) * safetyStockDays);
            // 實時更新 UI 中的目標總量顯示
            const targetTotalEl = document.getElementById('targetTotal');
            if (targetTotalEl) {
                targetTotalEl.value = targetTotal;
            }
        }

        return {
            class: {
                A: getValue('weightClassA', 2.2),
                B: getValue('weightClassB', 1.75),
                C: getValue('weightClassC', 1.52),
                D: getValue('weightClassD', 1.35)
            },
            size: {
                XL: getValue('weightSizeXL', 7.22),
                L: getValue('weightSizeL', 6.55),
                M: getValue('weightSizeM', 5.3),
                S: getValue('weightSizeS', 4.6),
                XS: getValue('weightSizeXS', 4.03)
            },
            type: {
                T: getValue('weightTypeT', 1.23),
                M: getValue('weightTypeM', 1.0),
                L: getValue('weightTypeL', 0.88)
            },
            baseValue: getValue('baseValue', 2),
            regionFactor: {
                HK: getValue('hkFactor', 1.0),
                MO: getValue('moFactor', 1.22)
            },
            salesTarget: salesTarget,
            safetyStockDays: safetyStockDays,
            targetTotal: targetTotal
        };
    }

    // 將權重配置載入 UI
    loadWeightConfigToUI() {
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };

        setValue('weightClassA', this.weightConfig.class.A);
        setValue('weightClassB', this.weightConfig.class.B);
        setValue('weightClassC', this.weightConfig.class.C);
        setValue('weightClassD', this.weightConfig.class.D);

        setValue('weightSizeXL', this.weightConfig.size.XL);
        setValue('weightSizeL', this.weightConfig.size.L);
        setValue('weightSizeM', this.weightConfig.size.M);
        setValue('weightSizeS', this.weightConfig.size.S);
        setValue('weightSizeXS', this.weightConfig.size.XS);

        // 載入 Type 權重
        if (this.weightConfig.type) {
            setValue('weightTypeT', this.weightConfig.type.T);
            setValue('weightTypeM', this.weightConfig.type.M);
            setValue('weightTypeL', this.weightConfig.type.L);
        }

        setValue('baseValue', this.weightConfig.baseValue);
        setValue('hkFactor', this.weightConfig.regionFactor.HK);
        setValue('moFactor', this.weightConfig.regionFactor.MO);
        
        // 載入銷售目標和安全庫存天數
        if (this.weightConfig.salesTarget !== undefined) {
            setValue('salesTarget', this.weightConfig.salesTarget);
        }
        if (this.weightConfig.safetyStockDays !== undefined) {
            setValue('safetyStockDays', this.weightConfig.safetyStockDays);
            // 更新對應的天數顯示
            const display = document.querySelector('.days-display');
            if (display) display.textContent = this.weightConfig.safetyStockDays;
        }
        
        if (this.weightConfig.targetTotal !== undefined) {
            setValue('targetTotal', this.weightConfig.targetTotal);
        }
    }

    // 套用權重模板
    applyWeightTemplate(templateName) {
        const template = WEIGHT_TEMPLATES[templateName];
        if (!template) return;

        const mode = this.calculationMode;

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };

        setValue('weightClassA', template.class.A);
        setValue('weightClassB', template.class.B);
        setValue('weightClassC', template.class.C);
        setValue('weightClassD', template.class.D);

        setValue('weightSizeXL', template.size.XL);
        setValue('weightSizeL', template.size.L);
        setValue('weightSizeM', template.size.M);
        setValue('weightSizeS', template.size.S);
        setValue('weightSizeXS', template.size.XS);

        // 套用 Type 權重
        if (template.type) {
            setValue('weightTypeT', template.type.T);
            setValue('weightTypeM', template.type.M);
            setValue('weightTypeL', template.type.L);
        }

        setValue('baseValue', template.baseValue);
        setValue('hkFactor', template.regionFactor.HK);
        setValue('moFactor', template.regionFactor.MO);

        if (mode === 'mode2') {
            const typeM = parseFloat(document.getElementById('weightTypeM')?.value);
            if (!isNaN(typeM)) {
                setValue('weightTypeT', typeM);
                setValue('weightTypeL', typeM);
            }
        } else if (mode === 'mode3') {
            const sizeM = parseFloat(document.getElementById('weightSizeM')?.value);
            if (!isNaN(sizeM)) {
                setValue('weightSizeXL', sizeM);
                setValue('weightSizeL', sizeM);
                setValue('weightSizeS', sizeM);
                setValue('weightSizeXS', sizeM);
            }
        }

        const modeNote = mode === 'mode2'
            ? '（模式 2：Type 固定為 M）'
            : mode === 'mode3'
                ? '（模式 3：Size 固定為 M）'
                : '';

        const templateLabels = { current: '目前設定', default: '預設權重', balanced: '平衡權重', conservative: '保守型', aggressive: '積極型' };
        const templateLabel = templateLabels[templateName] || templateName;

        this.showToast(`已套用「${templateLabel}」模板 ${modeNote}`.trim());

        // 模板即時生效：預覽 + 同步 + 重算（免確認）
        try { this.previewWeights({ silent: true }); } catch (e) {}
        try { this.autoApplyWeightsSilent(); } catch (e) {}
    }

    // 預覽權重計算結果（二合一後：不再渲染重複表格，直接更新下方對照表 + 統計摘要）
    previewWeights(options = {}) {
        const weights = this.readWeightsFromUI();

        // 保存權重配置
        this.weightConfig = weights;
        this.saveToLocalStorage();
        try { this.renderMatrixSummary(); } catch (e) {}
        try { this.updateCockpitBar(); } catch (e) {}
    }

    // 依店舖數量計算矩陣總量
    calculateStoreTotals(matrix, mode = this.calculationMode) {
        let totalHK = 0;
        let totalMO = 0;
        let totalAll = 0;

        this.stores.forEach(store => {
            let value = 0;
            if (mode === 'mode2') {
                value = matrix?.[store.Regional]?.[store.Class]?.M?.[store.Size] ?? 0;
            } else if (mode === 'mode3') {
                value = matrix?.[store.Regional]?.[store.Class]?.[store.Type]?.M ?? 0;
            } else {
                value = matrix?.[store.Regional]?.[store.Class]?.[store.Type]?.[store.Size] ?? 0;
            }
            totalAll += value;
            if (store.Regional === 'HK') {
                totalHK += value;
            } else {
                totalMO += value;
            }
        });

        return { totalHK, totalMO, totalAll };
    }

    // 統計各店舖類型數量
    getStoreTypeCounts() {
        const counts = {};
        this.stores.forEach(store => {
            const type = store.Type || 'M';
            const key = `${store.Regional}-${store.Class}-${type}-${store.Size}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }

    // 依權重生成三維矩陣（Region → Class → Type → Size）
    buildWeightMatrixByType(weights) {
        const regions = ['HK', 'MO'];
        const categories = ['A', 'B', 'C', 'D'];
        const types = ['T', 'M', 'L'];
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];
        const matrix = {};

        regions.forEach(region => {
            matrix[region] = {};
            categories.forEach(category => {
                matrix[region][category] = {};
                types.forEach(type => {
                    matrix[region][category][type] = {};
                    sizes.forEach(size => {
                        matrix[region][category][type][size] = calculateSafetyStockWithWeights(
                            region,
                            category,
                            size,
                            type,
                            weights
                        );
                    });
                });
            });
        });

        return matrix;
    }

    // 依目標總量縮放矩陣
    // 基準與顯示一致：有選店時只按已選店鋪縮放，否則按全店（與 calculateMatrixSummary 同基準）
    scaleMatrixToTarget(matrix, targetTotal, mode = this.calculationMode) {
        const regions = ['HK', 'MO'];
        const categories = ['A', 'B', 'C', 'D'];
        const types = ['T', 'M', 'L'];
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];
        const basisStores = this.selectedStores.length > 0
            ? this.selectedStores.map(idx => this.stores[idx]).filter(Boolean)
            : this.stores;
        // 各模式實際生效的切片不同（mode2 取 Type=M，mode3 取 Size=M），
        // 計數必須映射到生效切片，否則縮放分母與實際套用的分子口徑不一，目標永遠對不準
        const counts = {};
        basisStores.forEach(store => {
            if (!store) return;
            const effType = mode === 'mode2' ? 'M' : (store.Type || 'M');
            const effSize = mode === 'mode3' ? 'M' : store.Size;
            const key = `${store.Regional}-${store.Class}-${effType}-${effSize}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        let currentTotal = 0;
        const cells = [];

        regions.forEach(region => {
            categories.forEach(category => {
                types.forEach(type => {
                    sizes.forEach(size => {
                        const value = matrix?.[region]?.[category]?.[type]?.[size] ?? 0;
                        const count = counts[`${region}-${category}-${type}-${size}`] || 0;
                        currentTotal += count * value;
                        cells.push({ region, category, type, size, count, value });
                    });
                });
            });
        });

        if (currentTotal === 0) {
            return {
                matrix,
                currentTotal,
                appliedTotal: 0,
                remaining: targetTotal,
                scale: 0
            };
        }

        const scale = targetTotal / currentTotal;
        let appliedTotal = 0;

        cells.forEach(cell => {
            const scaled = cell.value * scale;
            const base = Math.max(0, Math.floor(scaled));
            cell.base = base;
            cell.frac = scaled - base;
            appliedTotal += cell.count * cell.base;
        });

        let remaining = targetTotal - appliedTotal;
        if (remaining > 0) {
            // 只把餘量分配給該模式實際會生效的切片，
            // 否則 +1 會漏到被丟棄的維度（mode2 丟 T/L、mode3 丟非 M 尺寸），目標永遠欠配
            const sliceOK = (c) => {
                if (mode === 'mode2') return c.type === 'M';
                if (mode === 'mode3') return c.size === 'M';
                return true;
            };
            const sorted = [...cells].filter(c => c.count > 0 && sliceOK(c)).sort((a, b) => {
                if (b.frac !== a.frac) return b.frac - a.frac;
                return b.count - a.count;
            });

            let safety = 0;
            let idx = 0;
            while (remaining > 0 && safety < 10000) {
                safety++;
                let found = false;
                for (let i = 0; i < sorted.length; i++) {
                    const candidate = sorted[(idx + i) % sorted.length];
                    if (candidate.count <= remaining) {
                        candidate.base += 1;
                        remaining -= candidate.count;
                        idx = (idx + i + 1) % sorted.length;
                        found = true;
                        break;
                    }
                }
                if (!found) break;
            }
        }

        const scaledMatrix = {};
        regions.forEach(region => {
            scaledMatrix[region] = {};
            categories.forEach(category => {
                scaledMatrix[region][category] = {};
                types.forEach(type => {
                    scaledMatrix[region][category][type] = {};
                    sizes.forEach(size => {
                        const cell = cells.find(item =>
                            item.region === region && item.category === category && item.type === type && item.size === size
                        );
                        scaledMatrix[region][category][type][size] = cell ? cell.base : 0;
                    });
                });
            });
        });

        // 強制單調性：確保每個 (region, class) 中 XL >= L >= M >= S >= XS
        // （mode2 僅 M-Type 切片會生效，mode3 的 Size 已收斂為 M，均在函數內處理）
        this.enforceMonotonicity(scaledMatrix, counts, mode);

        // 單調性修正會改變總量，重算實際已分配總量，否則 toast/提示用的 remaining 是修正前舊值
        let finalTotal = 0;
        cells.forEach(cell => {
            const v = scaledMatrix?.[cell.region]?.[cell.category]?.[cell.type]?.[cell.size] ?? 0;
            finalTotal += cell.count * v;
        });
        remaining = Math.max(0, targetTotal - finalTotal);

        return {
            matrix: scaledMatrix,
            currentTotal,
            appliedTotal: finalTotal,
            remaining,
            scale
        };
    }

    /**
    * 強制尺寸單調性約束：確保 XL >= L >= M >= S >= XS
    * 修正 scaleMatrixToTarget 中餘量分配造成的違規情況。
     *
     * 策略：
    * 1. 對每個 (region, class, type) 組合，將較小尺寸的值 cap 到不超過較大尺寸
     * 2. 將釋放的配額以「從大到小每輪各 +1」的方式平均回填，
     *    保證不違反順序且盡量貼近目標總量
     */
    enforceMonotonicity(scaledMatrix, counts, mode = this.calculationMode) {
        // mode3 的 Size 已收斂為 M，跨尺寸單調性無意義且會扭曲 M 值，直接跳過
        if (mode === 'mode3') return 0;
        const regions = ['HK', 'MO'];
        const categories = ['A', 'B', 'C', 'D'];
        const types = ['T', 'M', 'L'];
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];
        let totalFreed = 0;

        regions.forEach(region => {
            categories.forEach(category => {
                types.forEach(type => {
                    // mode2 僅 M-Type 切片會生效，T/L 組的修正與回填會被丟棄，直接跳過以免配額洩漏
                    if (mode === 'mode2' && type !== 'M') return;
                    let groupFreed = 0;

                    // Step 1: 將較小尺寸 cap 到不超過較大尺寸
                    for (let i = 1; i < sizes.length; i++) {
                        const curVal = scaledMatrix?.[region]?.[category]?.[type]?.[sizes[i]] ?? 0;
                        const prevVal = scaledMatrix?.[region]?.[category]?.[type]?.[sizes[i - 1]] ?? 0;
                        if (curVal > prevVal) {
                            const excess = curVal - prevVal;
                            const count = counts[`${region}-${category}-${type}-${sizes[i]}`] || 0;
                            groupFreed += excess * count;
                            scaledMatrix[region][category][type][sizes[i]] = prevVal;
                        }
                    }

                    totalFreed += groupFreed;

                    // Step 2: 將釋放的配額回填到本組
                    if (groupFreed > 0) {
                        let remaining = groupFreed;
                        let safety = 0;

                        while (remaining > 0 && safety < 10000) {
                            safety++;
                            let addedAny = false;

                            for (let i = 0; i < sizes.length; i++) {
                                const size = sizes[i];
                                const count = counts[`${region}-${category}-${type}-${size}`] || 0;
                                if (count === 0 || count > remaining) continue;

                                // 檢查單調性：新值不能超過更大尺寸的值
                                const newVal = scaledMatrix[region][category][type][size] + 1;
                                if (i > 0 && newVal > scaledMatrix[region][category][type][sizes[i - 1]]) {
                                    continue;
                                }

                                scaledMatrix[region][category][type][size] = newVal;
                                remaining -= count;
                                addedAny = true;
                            }

                            if (!addedAny) break;
                        }
                    }
                });
            });
        });

        return totalFreed;
    }

    // 套用權重到對照表（免確認：預設直接生效；手動按鈕亦不再彈 confirm）
    applyWeights(options = {}) {
        const weights = this.readWeightsFromUI();
        let newMatrix = this.buildWeightMatrixByType(weights);
        const targetTotal = Math.round(weights.targetTotal || 0);
        let targetInfo = null;
        const mode = this.calculationMode;
        const naturalTotals = this.calculateStoreTotals(newMatrix, mode);

        if (targetTotal > 0) {
            targetInfo = this.scaleMatrixToTarget(newMatrix, targetTotal, mode);
            newMatrix = targetInfo.matrix;
        }

        // 直接生效（不再 confirm）
        this.syncWeightMatrixToDraft(newMatrix, weights, mode);
        this.renderSafetyStockMatrix();
        this.saveToLocalStorage();
        try { this.previewWeights({ silent: true }); } catch (e) {}
        try { this.syncDraftToApplied({ silent: true }); } catch (e) {}
        try { this.renderStores(); } catch (e) {}
        try { this.updateCockpitBar(); } catch (e) {}
        this.scheduleAutoCalculate();

        const totals = this.calculateStoreTotals(newMatrix, mode);
        // 合理性提示（雙向，邏輯見 getTargetSanityWarn）
        let sanityWarn = this.getTargetSanityWarn(targetTotal, naturalTotals.totalAll);
        if (targetTotal > 0 && targetInfo && targetInfo.remaining > 0) {
            this.showToast(`✅ 權重已套用！實際總量 ${totals.totalAll}（尚有 ${targetInfo.remaining} 未分配）${sanityWarn}`);
        } else {
            this.showToast(`✅ 權重已套用！總量 ${totals.totalAll}${sanityWarn}`);
        }
    }

    // 設置即時摘要更新（在編輯對照表時）
    setupMatrixEditListeners() {
        const container = document.getElementById('matrixContainer');
        if (!container) return;
        
        container.addEventListener('input', (e) => {
            const input = e.target.closest('.matrix-cell .edit-value');
            if (input) {
                // 實時更新摘要
                this.renderMatrixSummary();
            }
        });
    }

    // ==================== 快速報表分頁 (Quick Report Tab) ====================

    /**
     * 初始化分頁切換與快速報表功能
     * 在 init() 之後由 setupEventListeners 呼叫
     */
    initTabNavigation() {
        this.updateQuickReportModeUI();

        // 分頁按鈕切換
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                // 切換按鈕 active
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // 切換面板
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                const panel = document.getElementById(`tab-${tabId}`);
                if (panel) panel.classList.add('active');
                // 初次切換到快速報表時渲染數據
                if (tabId === 'quickReport') {
                    this.renderQuickReport();
                }
            });
        });

        // 快速報表事件
        document.getElementById('qrSelectAll')?.addEventListener('click', () => this.qrToggleAll(true));
        document.getElementById('qrDeselectAll')?.addEventListener('click', () => this.qrToggleAll(false));
        document.getElementById('qrCheckAll')?.addEventListener('change', (e) => this.qrToggleAll(e.target.checked));
        document.getElementById('qrExportExcel')?.addEventListener('click', () => this.qrExportExcel());

        // 區域快速篩選
        document.querySelectorAll('.qr-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                this.qrApplyFilters();
            });
        });

        // OM 下拉篩選
        document.getElementById('qrOmFilter')?.addEventListener('change', () => this.qrApplyFilters());

        // 填充 OM 下拉
        this.qrPopulateOmFilter();
    }

    /** 填充 OM 篩選下拉 */
    qrPopulateOmFilter() {
        const select = document.getElementById('qrOmFilter');
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '';
        // 重建時必須保留「全部 OM」空選項，否則瀏覽器會自動選上第一個 OM，
        // 導致快速報表載入後只顯示該 OM 的店鋪
        const allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = '全部 OM';
        select.appendChild(allOpt);
        const oms = [...new Set(this.stores.map(s => s.OM).filter(Boolean))].sort();
        oms.forEach(om => {
            const opt = document.createElement('option');
            opt.value = om;
            opt.textContent = om;
            select.appendChild(opt);
        });
        if (oms.includes(currentValue)) select.value = currentValue;
    }

    /** 渲染快速報表主表格（全部店鋪，含勾選） */
    renderQuickReport() {
        const tbody = document.getElementById('qrTableBody');
        if (!tbody) return;

        this.updateQuickReportModeUI();
        const mode = this.calculationMode;
        const dimensionMeta = this.getQuickReportDimensionMeta(mode);

        // 按區域 → 舖類 → 名稱排序
        const sorted = [...this.stores].sort((a, b) => {
            if (a.Regional !== b.Regional) return a.Regional.localeCompare(b.Regional);
            if (a.Class !== b.Class) return a.Class.localeCompare(b.Class);
            if (a.Size !== b.Size) return (SIZE_DEFINITIONS[a.Size]?.order || 9) - (SIZE_DEFINITIONS[b.Size]?.order || 9);
            return a.Shop.localeCompare(b.Shop);
        });

        let html = '';
        sorted.forEach((store, idx) => {
            const origIdx = this.stores.indexOf(store);
            const ss = this.customStoreStock[store.Site] !== undefined
                ? this.customStoreStock[store.Site]
                : this.getSafetyStock(store.Regional, store.Class, store.Size, store.Type, mode);
            const carry = ss > 0 ? '✓' : '';
            const checked = this.selectedStores.includes(origIdx) ? 'checked' : '';
            const dimensionValue = dimensionMeta.valueGetter(store);
            const regionBadge = store.Regional === 'HK'
                ? '<span class="qr-badge qr-badge-hk">HK</span>'
                : '<span class="qr-badge qr-badge-mo">MO</span>';
            const classBadge = `<span class="qr-badge qr-badge-${store.Class.toLowerCase()}">${store.Class}</span>`;
            const specialMark = isSpecialAttentionStore(store)
                ? '<span class="qr-special-star" title="⭐ 需特別關注">★</span>'
                : '';

            html += `<tr data-orig="${origIdx}" data-region="${escapeHtml(store.Regional)}" data-om="${escapeHtml(store.OM || '')}" data-special="${isSpecialAttentionStore(store) ? '1' : '0'}">
                <td><input type="checkbox" class="qr-chk" data-idx="${origIdx}" ${checked}></td>
                <td>${specialMark}${escapeHtml(store.Site)}</td>
                <td>${escapeHtml(store.Shop)}</td>
                <td>${regionBadge}</td>
                <td>${classBadge}</td>
                <td>${escapeHtml(dimensionValue)}</td>
                <td>${escapeHtml(store.OM || '')}</td>
                <td class="qr-cell-ss">${ss}</td>
                <td class="qr-cell-carry">${carry}</td>
            </tr>`;
        });
        tbody.innerHTML = html;

        // 綁定勾選事件
        tbody.querySelectorAll('.qr-chk').forEach(chk => {
            chk.addEventListener('change', () => this.qrOnCheckChange());
        });

        this.qrApplyFilters();
        this.qrUpdateSummary();
    }

    /** 全選/取消全選（僅可見行） */
    qrToggleAll(checked) {
        const rows = document.querySelectorAll('#qrTableBody tr:not(.qr-row-hidden)');
        rows.forEach(row => {
            const chk = row.querySelector('.qr-chk');
            if (chk) chk.checked = checked;
        });
        this.qrOnCheckChange();
    }

    /** 勾選變更回調 */
    qrOnCheckChange() {
        // 同步到主計算器的 selectedStores
        const allChks = document.querySelectorAll('#qrTableBody .qr-chk');
        const newSelection = [];
        allChks.forEach(chk => {
            if (chk.checked) {
                newSelection.push(parseInt(chk.dataset.idx));
            }
        });
        this.selectedStores = newSelection;
        this.saveToLocalStorage();
        this.updateCheckboxes();
        this.updateStoresPreview();
        this.updateStoreCount();
        this.qrUpdateSummary();
        this.scheduleAutoCalculate();
    }

    /** 套用篩選（區域 + OM） */
    qrApplyFilters() {
        const activeRegions = [];
        document.querySelectorAll('.qr-filter-btn.active').forEach(btn => {
            // 需特別關注按鈕沒有 data-qr-filter，只作為獨立開關
            if (btn.dataset.qrFilter) activeRegions.push(btn.dataset.qrFilter);
        });
        const specialOnly = !!document.querySelector('.qr-special-filter-btn.active');
        const omVal = document.getElementById('qrOmFilter')?.value || '';

        document.querySelectorAll('#qrTableBody tr').forEach(row => {
            let show = true;
            if (activeRegions.length > 0) {
                show = show && activeRegions.includes(row.dataset.region);
            }
            if (specialOnly) {
                show = show && row.dataset.special === '1';
            }
            if (omVal) {
                show = show && row.dataset.om === omVal;
            }
            row.classList.toggle('qr-row-hidden', !show);
        });
        this.qrUpdateSummary();
    }

    /** 更新快速報表底部統計 */
    qrUpdateSummary() {
        const panel = document.getElementById('qrSummaryPanel');
        const tfoot = document.getElementById('qrTableFoot');
        const checkedRows = document.querySelectorAll('#qrTableBody .qr-chk:checked');
        const mode = this.calculationMode;
        const dimensionMeta = this.getQuickReportDimensionMeta(mode);

        // 過濾掉隱藏的行
        const visibleCheckedRows = Array.from(checkedRows).filter(chk => {
            const row = chk.closest('tr');
            return row && !row.classList.contains('qr-row-hidden');
        });

        if (visibleCheckedRows.length === 0) {
            if (panel) panel.style.display = 'none';
            if (tfoot) tfoot.innerHTML = '';
            document.getElementById('qrSelectedCount').textContent = '已選 0 間店鋪';
            const exportBtn = document.getElementById('qrExportExcel');
            if (exportBtn) exportBtn.disabled = true;
            return;
        }

        if (panel) panel.style.display = '';
        const exportBtn = document.getElementById('qrExportExcel');
        if (exportBtn) exportBtn.disabled = false;

        let totalSS = 0, carryCount = 0;
        const typeSummary = {};
        const omSummary = {};
        const typeOrder = { T: 1, M: 2, L: 3 };

        visibleCheckedRows.forEach(chk => {
            const idx = parseInt(chk.dataset.idx);
            const store = this.stores[idx];
            const ss = this.customStoreStock[store.Site] !== undefined
                ? this.customStoreStock[store.Site]
                : this.getSafetyStock(store.Regional, store.Class, store.Size, store.Type, mode);
            totalSS += ss;
            if (ss > 0) carryCount++;

            // 類型彙總
            const tc = this.buildModeTypeCode(store, mode);
            const dimensionValue = dimensionMeta.valueGetter(store);
            if (!typeSummary[tc]) {
                typeSummary[tc] = {
                    typeCode: tc,
                    region: store.Regional,
                    category: store.Class,
                    dimension: dimensionValue,
                    type: store.Type || 'M',
                    count: 0,
                    ssFirst: ss,
                    ssMin: ss,
                    ssMax: ss,
                    total: 0
                };
            }
            typeSummary[tc].count++;
            typeSummary[tc].total += ss;
            if (ss < typeSummary[tc].ssMin) typeSummary[tc].ssMin = ss;
            if (ss > typeSummary[tc].ssMax) typeSummary[tc].ssMax = ss;

            // OM 彙總
            const om = store.OM || '未分配';
            if (!omSummary[om]) {
                omSummary[om] = { name: om, count: 0, totalSS: 0 };
            }
            omSummary[om].count++;
            omSummary[om].totalSS += ss;
        });

        const storeCount = visibleCheckedRows.length;
        const avg = storeCount > 0 ? Math.round(totalSS / storeCount) : 0;

        // 統計卡
        document.getElementById('qrStatStores').textContent = storeCount;
        document.getElementById('qrStatTotal').textContent = totalSS;
        document.getElementById('qrStatCarry').textContent = carryCount;
        document.getElementById('qrStatAvg').textContent = avg;
        document.getElementById('qrSelectedCount').textContent = `已選 ${storeCount} 間店鋪`;

        // tfoot 合計行
        if (tfoot) {
            tfoot.innerHTML = `<tr>
                <td></td><td colspan="6" style="text-align:right">合計：</td>
                <td style="text-align:center">${totalSS}</td>
                <td style="text-align:center">${carryCount}</td>
            </tr>`;
        }

        // 類型彙總表
        const typeBody = document.getElementById('qrTypeSummaryBody');
        if (typeBody) {
            const types = Object.values(typeSummary).sort((a, b) => {
                if (a.region !== b.region) return a.region.localeCompare(b.region);
                if (a.category !== b.category) return a.category.localeCompare(b.category);
                if (mode === 'mode3') {
                    return (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
                }
                if (mode === 'mode1') {
                    const diff = (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
                    if (diff !== 0) return diff;
                }
                    return (SIZE_DEFINITIONS[a.dimension]?.order || 9) - (SIZE_DEFINITIONS[b.dimension]?.order || 9);
            });
            let h = '';
            types.forEach(t => {
                    // 群內含不同個別自訂值時顯示平均（與主預覽一致），否則顯示單一值
                    const mixed = t.ssMax !== t.ssMin;
                    const displaySs = mixed ? Math.round(t.total / t.count) : t.ssFirst;
                    const ssTitle = mixed ? '此群組含不同自訂值，顯示平均值' : '';
                    h += `<tr><td>${t.typeCode}</td><td>${t.region}</td><td>${t.category}</td><td>${t.dimension}</td><td>${t.count}</td><td title="${ssTitle}">${displaySs}</td><td>${t.total}</td></tr>`;
            });
            h += `<tr class="qr-sub-total"><td colspan="4">合計</td><td>${storeCount}</td><td></td><td>${totalSS}</td></tr>`;
            typeBody.innerHTML = h;
        }

        // OM 彙總表
        const omBody = document.getElementById('qrOmSummaryBody');
        if (omBody) {
            const oms = Object.values(omSummary).sort((a, b) => b.count - a.count);
            let h = '';
            oms.forEach(om => {
                const pct = totalSS > 0 ? ((om.totalSS / totalSS) * 100).toFixed(1) : 0;
                const avgOm = om.count > 0 ? Math.round(om.totalSS / om.count) : 0;
                h += `<tr><td>${om.name}</td><td>${om.count}</td><td>${om.totalSS}</td><td>${avgOm}</td><td>${pct}%</td></tr>`;
            });
            h += `<tr class="qr-sub-total"><td>合計</td><td>${storeCount}</td><td>${totalSS}</td><td>${avg}</td><td>100%</td></tr>`;
            omBody.innerHTML = h;
        }
    }

    /** 快速報表 — 匯出 Excel（缺失時改用 CSV） */
    qrExportExcel() {
        if (!this.handleMissingXLSX(() => this.qrExportCsvFallback(), '快速報表 Excel 匯出')) {
            return;
        }

        const checkedRows = document.querySelectorAll('#qrTableBody .qr-chk:checked');
        
        // 過濾掉隱藏的行
        const visibleCheckedRows = Array.from(checkedRows).filter(chk => {
            const row = chk.closest('tr');
            return row && !row.classList.contains('qr-row-hidden');
        });

        if (visibleCheckedRows.length === 0) {
            alert('請至少勾選一間店鋪（篩選後至少要有一間可見的店鋪）');
            return;
        }

        // ---- 收集資料 ----
        const detailData = [];
        const typeBucket = {};
        const typeLookup = {};
        const omBucket = {};
        const mode = this.calculationMode;
        const dimensionMeta = this.getQuickReportDimensionMeta(mode);
        const dimensionKey = dimensionMeta.key;

        visibleCheckedRows.forEach(chk => {
            const idx = parseInt(chk.dataset.idx);
            const store = this.stores[idx];
            const ss = this.customStoreStock[store.Site] !== undefined
                ? this.customStoreStock[store.Site]
                : this.getSafetyStock(store.Regional, store.Class, store.Size, store.Type, mode);
            const tc = this.buildModeTypeCode(store, mode);
            const carry = ss > 0 ? 'Y' : '';
            const dimensionValue = dimensionMeta.valueGetter(store);

            detailData.push({
                '代號': store.Site,
                '店鋪名稱': store.Shop,
                '區域': store.Regional,
                '舖類': store.Class,
                [dimensionKey]: dimensionValue,
                '類型代碼': tc,
                'OM': store.OM || '',
                'Safety Stock': ss,
                'Carry': carry,
                '需特別關注': isSpecialAttentionStore(store) ? '需特別關注' : ''
            });

            if (!typeBucket[tc]) {
                typeBucket[tc] = { '類型代碼': tc, '區域': store.Regional, '舖類': store.Class, [dimensionKey]: dimensionValue, '店鋪數': 0, 'Safety Stock': ss, '小計': 0, _ssMin: ss, _ssMax: ss };
            }
            if (!typeLookup[tc]) {
                typeLookup[tc] = store.Type || 'M';
            }
            typeBucket[tc]['店鋪數']++;
            typeBucket[tc]['小計'] += ss;
            if (ss < typeBucket[tc]._ssMin) typeBucket[tc]._ssMin = ss;
            if (ss > typeBucket[tc]._ssMax) typeBucket[tc]._ssMax = ss;

            const om = store.OM || '未分配';
            if (!omBucket[om]) {
                omBucket[om] = { '營運經理': om, '店鋪數': 0, 'SS 總計': 0 };
            }
            omBucket[om]['店鋪數']++;
            omBucket[om]['SS 總計'] += ss;
        });

        // 在 detail 底部加合計
        const totalSS = detailData.reduce((s, d) => s + d['Safety Stock'], 0);
        detailData.push({
            '代號': '',
            '店鋪名稱': '合計',
            '區域': '',
            '舖類': '',
            [dimensionKey]: '',
            '類型代碼': '',
            'OM': '',
            'Safety Stock': totalSS,
            'Carry': '',
            '需特別關注': ''
        });

        // 類型彙總（群內含不同個別自訂值時，Safety Stock 取平均，與畫面一致）
        Object.values(typeBucket).forEach(b => {
            if (b._ssMax !== b._ssMin && b['店鋪數'] > 0) {
                b['Safety Stock'] = Math.round(b['小計'] / b['店鋪數']);
            }
            delete b._ssMin;
            delete b._ssMax;
        });
        const typeOrder = { T: 1, M: 2, L: 3 };
        const typeData = Object.values(typeBucket).sort((a, b) => {
            if (a['區域'] !== b['區域']) return a['區域'].localeCompare(b['區域']);
            if (a['舖類'] !== b['舖類']) return a['舖類'].localeCompare(b['舖類']);
            if (mode === 'mode3') {
                return (typeOrder[typeLookup[a['類型代碼']] || 'M'] || 0) - (typeOrder[typeLookup[b['類型代碼']] || 'M'] || 0);
            }
            if (mode === 'mode1') {
                const diff = (typeOrder[typeLookup[a['類型代碼']] || 'M'] || 0) - (typeOrder[typeLookup[b['類型代碼']] || 'M'] || 0);
                if (diff !== 0) return diff;
            }
            return (SIZE_DEFINITIONS[a[dimensionKey]]?.order || 9) - (SIZE_DEFINITIONS[b[dimensionKey]]?.order || 9);
        });
        typeData.push({ '類型代碼': '合計', '區域': '', '舖類': '', [dimensionKey]: '', '店鋪數': visibleCheckedRows.length, 'Safety Stock': '', '小計': totalSS });

        // OM 彙總
        const omData = Object.values(omBucket).sort((a, b) => b['店鋪數'] - a['店鋪數']);
        omData.forEach(om => {
            om['平均 SS'] = om['店鋪數'] > 0 ? Math.round(om['SS 總計'] / om['店鋪數']) : 0;
            om['佔比'] = totalSS > 0 ? ((om['SS 總計'] / totalSS) * 100).toFixed(1) + '%' : '0%';
        });
        omData.push({ '營運經理': '合計', '店鋪數': visibleCheckedRows.length, 'SS 總計': totalSS, '平均 SS': visibleCheckedRows.length > 0 ? Math.round(totalSS / visibleCheckedRows.length) : 0, '佔比': '100%' });

        // ---- 建立 Excel ----
        const wb = XLSX.utils.book_new();

        // Sheet 1：店鋪詳細清單
        const ws1 = XLSX.utils.json_to_sheet(detailData);
        ws1['!cols'] = [
            { wch: 8 }, { wch: 16 }, { wch: 6 }, { wch: 6 }, { wch: 8 },
            { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 6 }, { wch: 12 }
        ];
        XLSX.utils.book_append_sheet(wb, ws1, '店鋪詳細清單');

        // Sheet 2：類型彙總
        const ws2 = XLSX.utils.json_to_sheet(typeData);
        ws2['!cols'] = [
            { wch: 10 }, { wch: 6 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }
        ];
        XLSX.utils.book_append_sheet(wb, ws2, '類型彙總');

        // Sheet 3：OM 彙總
        const ws3 = XLSX.utils.json_to_sheet(omData);
        ws3['!cols'] = [
            { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 8 }
        ];
        XLSX.utils.book_append_sheet(wb, ws3, 'OM彙總');

        // Sheet 4：對照表
        const matrixData = this.qrBuildMatrixSheet();
        const ws4 = XLSX.utils.aoa_to_sheet(matrixData);
        ws4['!cols'] = [
            { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }
        ];
        XLSX.utils.book_append_sheet(wb, ws4, '對照表');

        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        XLSX.writeFile(wb, `SafetyStock_QuickReport_${dateStr}.xlsx`);
        this.showToast('✅ Excel 已匯出');
    }

    /** 組裝對照表 Sheet 的二維陣列 */
    qrBuildMatrixSheet() {
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];
        const categories = ['A', 'B', 'C', 'D'];
        const regions = ['HK', 'MO'];
        const types = ['T', 'M', 'L'];
        const typeLabels = { 'T': '遊客', 'M': '混合', 'L': '本地' };
        const mode = this.calculationMode;

        let aoa = [];

        if (mode === 'mode2') {
            aoa = [['區域-舖類', 'XL', 'L', 'M', 'S', 'XS']];
            regions.forEach(region => {
                categories.forEach(cat => {
                    const row = [`${region}-${cat}`];
                    sizes.forEach(size => {
                        row.push(this.getSafetyStock(region, cat, size, 'M', mode));
                    });
                    aoa.push(row);
                });
            });
        } else if (mode === 'mode3') {
            aoa = [['區域-舖類', '遊客', '混合', '本地']];
            regions.forEach(region => {
                categories.forEach(cat => {
                    const row = [`${region}-${cat}`];
                    types.forEach(type => {
                        row.push(this.getSafetyStock(region, cat, 'M', type, mode));
                    });
                    aoa.push(row);
                });
            });
        } else {
            aoa = [['區域-舖類-客源', 'XL', 'L', 'M', 'S', 'XS']];
            regions.forEach(region => {
                categories.forEach(cat => {
                    types.forEach(type => {
                        const row = [`${region}-${cat}-${type}(${typeLabels[type]})`];
                        sizes.forEach(size => {
                            row.push(this.getSafetyStock(region, cat, size, type, mode));
                        });
                        aoa.push(row);
                    });
                });
            });
        }
        return aoa;
    }
}

// 頁面加載時初始化應用
document.addEventListener('DOMContentLoaded', () => {
    // 正常頁面只允許一個 calculator instance，避免按鈕被重複綁定
    if (window.calculator) return;
    window.calculator = new SafetyStockCalculator();
    
    // 在控制台輸出診斷命令提示
    console.log('%c🔍 系統診斷命令已可用', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
    console.log('%c執行以下命令進行全面診斷：', 'color: #2196F3;');
    console.log('%cwindow.calculator.runDiagnostics()', 'background: #222; color: #0f0; padding: 5px; font-family: monospace;');
});
