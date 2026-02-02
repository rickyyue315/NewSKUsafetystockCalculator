// ==================== 主應用程序 ====================
// Safety Stock Calculator - 根據 Excel 對照表重新設計

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
            storeGroup: [],
            manager: [],
            specialStore: []
        };
        this.customSafetyStock = {}; // 使用者自訂的 Safety Stock 值
        this.customStoreStock = {}; // 個別店鋪的自訂 Safety Stock 值 (key: store.Site)
        this.currentTheme = DEFAULT_THEME; // 當前主題
        this.weightConfig = JSON.parse(JSON.stringify(WEIGHT_CONFIG)); // 權重配置
        this.matrixDraft = {}; // 對照表草稿（未套用到選擇店鋪）
        
        this.init();
    }

    // 初始化應用
    init() {
        this.loadStoresFromConfig();
        this.loadSafetyStockMatrix();
        this.matrixDraft = this.buildMatrixDraftFromApplied();
        this.initTheme(); // 初始化主題
        this.setupEventListeners();
        this.setupInlineEditListeners();
        this.renderStores();
        this.renderSafetyStockMatrix();
        this.loadFromLocalStorage();
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

        this.currentTheme = themeKey;
        this.updateThemeSelectorUI();
    }

    renderThemeSelector() {
        const themeList = document.getElementById('themeList');
        if (!themeList) return;

        const themeIcons = {
            sasa: '💄',
            corporate: '🏢',
            dark: '🌙',
            warm: '🌅',
            highContrast: '👁️',
            elegant: '💜',
            minimal: '◻️'
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
        localStorage.setItem('safetyStockTheme', themeKey);

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
        }
    }

    loadSafetyStockMatrix() {
        if (SAFETY_STOCK_MATRIX) {
            this.safetyStockMatrix = JSON.parse(JSON.stringify(SAFETY_STOCK_MATRIX));
        }
    }

    // ==================== 事件監聽設置 ====================

    setupEventListeners() {
        // 店鋪選擇按鈕
        document.getElementById('selectAllBtn')?.addEventListener('click', () => this.selectAllStores());
        document.getElementById('deselectAllBtn')?.addEventListener('click', () => this.deselectAllStores());
        document.getElementById('invertSelectionBtn')?.addEventListener('click', () => this.invertSelection());
        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => this.clearFilters());

        // OM 店鋪清單面板關閉按鈕
        document.getElementById('closeOmPanel')?.addEventListener('click', () => this.closeOmStoresPanel());

        // 分類篩選按鈕
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterClick(e));
        });

        // 計算和導出
        document.getElementById('calculateBtn')?.addEventListener('click', () => this.calculate());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportToCSV());
        document.getElementById('exportExcelBtn')?.addEventListener('click', () => this.exportToExcel());
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

        // Safety Stock Matrix 編輯
        document.getElementById('editMatrixBtn')?.addEventListener('click', () => this.enableMatrixEdit());
        document.getElementById('saveMatrixBtn')?.addEventListener('click', () => this.saveMatrixEdit());
        document.getElementById('cancelMatrixBtn')?.addEventListener('click', () => this.cancelMatrixEdit());
        document.getElementById('resetMatrixBtn')?.addEventListener('click', () => this.resetMatrix());
        document.getElementById('applyMatrixBtn')?.addEventListener('click', () => this.applyMatrixToStores());

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
        const newValue = parseInt(input.value) || 0;
        
        // 保存自訂值
        this.customStoreStock[storeCode] = newValue;
        
        // 更新顯示
        span.textContent = newValue;
        span.classList.remove('editing');
        
        this.saveToLocalStorage();
        this.updateStoresPreview();
    }

    cancelStoreStockEdit(input) {
        const span = input.closest('.editable-store-stock');
        if (span) {
            const storeCode = span.dataset.storeCode;
            const store = this.getStoreBySite(storeCode);
            const value = this.customStoreStock[storeCode] !== undefined
                ? this.customStoreStock[storeCode]
                : this.getSafetyStock(store.Regional, store.Class, store.Size);
            span.textContent = value;
            span.classList.remove('editing');
        }
    }

    getStoreBySite(site) {
        return this.stores.find(s => s.Site === site);
    }

    // ==================== 店鋪選擇函數 ====================
    
    renderStores() {
        const container = document.getElementById('storesContainer');
        if (!container) return;
        
        console.log('renderStores called, selectedStores before:', this.selectedStores);
        
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
            div.dataset.storeGroup = store.Site ? store.Site.substring(0, 2).toUpperCase() : '';
            div.dataset.manager = store.OM || '';

            // 檢查是否有個別店鋪的自訂值，或全局對照表的自訂值
            let safetyStock = this.customStoreStock[store.Site] !== undefined
                ? this.customStoreStock[store.Site]
                : this.getSafetyStock(store.Regional, store.Class, store.Size);
            const typeCode = getStoreTypeCode(store.Regional, store.Class, store.Size);

            div.innerHTML = `
                <input type="checkbox" id="store-${originalIndex}" value="${originalIndex}">
                <label for="store-${originalIndex}" class="store-name">${store.Shop}</label>
                <span class="store-code">${store.Site}</span>
                <span class="store-badge region-${store.Regional.toLowerCase()}">${store.Regional}</span>
                <span class="store-badge category-${store.Class.toLowerCase()}">${store.Class}</span>
                <span class="store-badge size-badge">${store.Size}</span>
                <span class="store-safety-stock editable-store-stock" data-store-code="${store.Site}" title="點擊編輯 Safety Stock">${safetyStock}</span>
            `;

            const checkbox = div.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => this.handleStoreToggle(e));

            const safetyStockSpan = div.querySelector('.store-safety-stock');
            safetyStockSpan.addEventListener('click', (e) => this.handleStoreStockEdit(e, store.Site));

            container.appendChild(div);
        });
        
        console.log('renderStores completed, selectedStores after:', this.selectedStores);
        this.updateStoresPreview();
        this.updateStoreCount();
    }

    handleStoreToggle(e) {
        const index = parseInt(e.target.value);
        console.log('handleStoreToggle called, index:', index, 'checked:', e.target.checked);
        if (e.target.checked) {
            if (!this.selectedStores.includes(index)) {
                this.selectedStores.push(index);
            }
        } else {
            this.selectedStores = this.selectedStores.filter(i => i !== index);
        }
        console.log('After toggle, selectedStores:', this.selectedStores);
        this.saveToLocalStorage();
        this.updateStoresPreview();
        this.updateStoreCount();
    }

    selectAllStores(includeHidden = false) {
        // 只選擇目前顯示的店鋪（或全部）
        const selector = includeHidden
            ? '#storesContainer .store-item'
            : '#storesContainer .store-item:not([style*="display: none"])';
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
    }

    deselectAllStores() {
        // 只取消選擇目前顯示的店鋪
        const visibleItems = document.querySelectorAll('#storesContainer .store-item:not([style*="display: none"])');
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
    }

    invertSelection() {
        const visibleItems = document.querySelectorAll('#storesContainer .store-item:not([style*="display: none"])');
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
    }

    clearFilters() {
        this.activeFilters = {
            region: [],
            category: [],
            size: [],
            storeGroup: [],
            manager: [],
            specialStore: []
        };
        document.querySelectorAll('.filter-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });
        this.applyFilters();
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
        title.innerHTML = `👤 ${omName} 負責的店鋪`;
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
                html += `
                    <div class="om-store-item">
                        <span class="om-store-code" style="background:${regionColor};color:white">${store.Site}</span>
                        <span class="om-store-name">${store.Shop}</span>
                        <div class="om-store-badges">
                            <span class="om-store-badge" style="background:${this.getCategoryColor(store.Class)};color:white">${store.Class}</span>
                            <span class="om-store-badge" style="background:#666;color:white">${store.Size}</span>
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
            
            // 檢查店鋪組別篩選 (HA/HB/HC/HD)
            if (this.activeFilters.storeGroup.length > 0) {
                show = show && this.activeFilters.storeGroup.includes(item.dataset.storeGroup);
            }
            
            // 檢查營運經理篩選
            if (this.activeFilters.manager.length > 0) {
                show = show && this.activeFilters.manager.some(m => item.dataset.manager.includes(m));
            }
            
            // 檢查特別店鋪篩選 (HA40, HB87, HB91)
            if (this.activeFilters.specialStore.length > 0) {
                const storeCode = item.querySelector('.store-code')?.textContent?.trim();
                show = show && this.activeFilters.specialStore.some(code => storeCode === code);
            }
            
            item.style.display = show ? 'flex' : 'none';
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
        
        // 診斷日誌
        console.log('updateStoresPreview called, selectedStores:', this.selectedStores);
        
        const selectedCount = this.selectedStores.length;
        const totalCount = this.stores.length;
        
        if (selectedCount === 0) {
            preview.innerHTML = `
                <div class="no-selection">
                    <p>尚未選擇任何店鋪</p>
                    <p class="hint">請勾選左側店鋪或使用篩選功能</p>
                </div>
            `;
            return;
        }
        
        // 按類型分組統計（考慮個別店鋪的自訂值）
        const typeStats = {};
        let totalCustomSS = 0;
        this.selectedStores.forEach(idx => {
            const store = this.stores[idx];
            // 防禦性檢查：確保店鋪存在
            if (!store) {
                console.warn(`Store at index ${idx} is undefined, skipping`);
                return;
            }
            const code = getStoreTypeCode(store.Regional, store.Class, store.Size);

            // 計算該店鋪的實際 Safety Stock（優先使用個別店鋪的自訂值）
            const storeActualSS = this.customStoreStock[store.Site] !== undefined
                ? this.customStoreStock[store.Site]
                : this.getSafetyStock(store.Regional, store.Class, store.Size);

            if (!typeStats[code]) {
                typeStats[code] = {
                    region: store.Regional,
                    category: store.Class,
                    size: store.Size,
                    safetyStock: this.getSafetyStock(store.Regional, store.Class, store.Size),
                    avgCustomSS: 0,
                    totalCustomSS: 0,
                    count: 0
                };
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
            html += `
                <tr>
                    <td><strong>${code}</strong></td>
                    <td>${stat.region}</td>
                    <td>${stat.category}</td>
                    <td>${stat.size}</td>
                    <td style="text-align:center">${stat.count}</td>
                    <td style="text-align:center">${stat.safetyStock}</td>
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
                            <td style="text-align:center;background:#ffeb3b"><strong>${totalSS}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        
        preview.innerHTML = html;
    }

    updateStoreCount() {
        const countEl = document.getElementById('storeCount');
        if (countEl) {
            const visibleItems = document.querySelectorAll('#storesContainer .store-item:not([style*="display: none"])');
            const selectedVisible = Array.from(visibleItems).filter(item => 
                item.querySelector('input[type="checkbox"]').checked
            ).length;
            countEl.textContent = `顯示 ${visibleItems.length} 間 / 已選 ${this.selectedStores.length} 間`;
        }
    }

    // ==================== Safety Stock Matrix ====================
    
    getSafetyStock(region, category, size) {
        const key = `${region}-${category}-${size}`;
        if (this.customSafetyStock[key] !== undefined) {
            return this.customSafetyStock[key];
        }
        return getSafetyStockValue(region, category, size);
    }

    getMatrixDraftValue(region, category, size) {
        if (this.matrixDraft?.[region]?.[category]?.[size] !== undefined) {
            return this.matrixDraft[region][category][size];
        }
        return this.getSafetyStock(region, category, size);
    }

    buildMatrixDraftFromApplied() {
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];
        const categories = ['A', 'B', 'C', 'D'];
        const regions = ['HK', 'MO'];
        const matrix = {};

        regions.forEach(region => {
            matrix[region] = {};
            categories.forEach(category => {
                matrix[region][category] = {};
                sizes.forEach(size => {
                    matrix[region][category][size] = this.getSafetyStock(region, category, size);
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

    renderSafetyStockMatrix() {
        const container = document.getElementById('matrixContainer');
        if (!container) return;
        
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];
        const categories = ['A', 'B', 'C', 'D'];
        const regions = ['HK', 'MO'];
        
        let html = '';
        
        regions.forEach(region => {
            html += `
                <div class="matrix-region">
                    <h4 class="region-title region-${region.toLowerCase()}">${REGION_DEFINITIONS[region].name} (${region})</h4>
                    <table class="matrix-table">
                        <thead>
                            <tr>
                                <th>舖類 \\ 面積</th>
                                ${sizes.map(s => `<th>${s}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            categories.forEach(cat => {
                html += `<tr><td class="category-cell category-${cat.toLowerCase()}">${cat}級</td>`;
                sizes.forEach(size => {
                    const value = this.getMatrixDraftValue(region, cat, size);
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
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });
        
        container.innerHTML = html;
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
    }

    saveMatrixEdit() {
        document.querySelectorAll('.matrix-cell').forEach(cell => {
            const key = cell.dataset.key;
            const input = cell.querySelector('.edit-value');
            const display = cell.querySelector('.display-value');
            const value = parseInt(input.value) || 0;
            const [region, category, size] = key.split('-');

            if (!this.matrixDraft[region]) this.matrixDraft[region] = {};
            if (!this.matrixDraft[region][category]) this.matrixDraft[region][category] = {};
            this.matrixDraft[region][category][size] = value;
            display.textContent = value;
            
            cell.classList.remove('editing');
            display.style.display = 'inline-block';
            input.style.display = 'none';
        });
        
        document.getElementById('editMatrixBtn').style.display = 'inline-block';
        document.getElementById('saveMatrixBtn').style.display = 'none';
        document.getElementById('cancelMatrixBtn').style.display = 'none';
        document.getElementById('resetMatrixBtn').style.display = 'none';
        
        this.saveToLocalStorage();
        this.showToast('✅ 對照表已保存，請按「套用到選擇店鋪」更新店鋪 Safety');
    }

    cancelMatrixEdit() {
        this.renderSafetyStockMatrix();
        
        document.getElementById('editMatrixBtn').style.display = 'inline-block';
        document.getElementById('saveMatrixBtn').style.display = 'none';
        document.getElementById('cancelMatrixBtn').style.display = 'none';
        document.getElementById('resetMatrixBtn').style.display = 'none';
    }

    resetMatrix() {
        if (confirm('確定要重置 Safety Stock 對照表為預設值嗎？')) {
            this.matrixDraft = this.buildDefaultMatrix();
            this.renderSafetyStockMatrix();
            this.enableMatrixEdit(); // 保持編輯模式
            this.saveToLocalStorage();
        }
    }

    applyMatrixToStores() {
        const confirmed = confirm('確定要套用目前對照表到「選擇店鋪」嗎？此操作會即時影響店鋪 Safety。');
        if (!confirmed) return;

        this.customSafetyStock = {};
        Object.keys(this.matrixDraft || {}).forEach(region => {
            Object.keys(this.matrixDraft[region] || {}).forEach(category => {
                Object.keys(this.matrixDraft[region][category] || {}).forEach(size => {
                    const key = `${region}-${category}-${size}`;
                    this.customSafetyStock[key] = this.matrixDraft[region][category][size];
                });
            });
        });

        this.saveToLocalStorage();
        this.renderStores();
        this.updateStoresPreview();
        this.showToast('✅ 對照表已套用到選擇店鋪');
    }

    // ==================== 計算函數 ====================
    
    calculate() {
        if (this.selectedStores.length === 0) {
            alert('請至少選擇一間店鋪');
            return;
        }
        
        this.results = [];
        this.summaryResults = [];
        
        // 計算每間店鋪的結果
        this.selectedStores.forEach(storeIndex => {
            const store = this.stores[storeIndex];
            // 優先使用個別店鋪的自訂值，否則使用對照表或全局自訂值
            const safetyStock = this.customStoreStock[store.Site] !== undefined
                ? this.customStoreStock[store.Site]
                : this.getSafetyStock(store.Regional, store.Class, store.Size);
            const typeCode = getStoreTypeCode(store.Regional, store.Class, store.Size);

            this.results.push({
                code: store.Site,
                name: store.Shop,
                region: store.Regional,
                category: store.Class,
                size: store.Size,
                typeCode: typeCode,
                safetyStock: safetyStock,
                remarks: '',
                carry: safetyStock > 0 // 如果 Safety Stock > 0 則 carry
            });
        });
        
        // 按類型彙總
        const typeSummary = {};
        this.results.forEach(result => {
            if (!typeSummary[result.typeCode]) {
                typeSummary[result.typeCode] = {
                    typeCode: result.typeCode,
                    region: result.region,
                    category: result.category,
                    size: result.size,
                    safetyStock: result.safetyStock,
                    storeCount: 0,
                    allShopQty: 0,
                    stores: []
                };
            }
            typeSummary[result.typeCode].storeCount++;
            typeSummary[result.typeCode].allShopQty += result.safetyStock;
            typeSummary[result.typeCode].stores.push(result.name);
        });
        
        // 轉換為陣列並排序
        this.summaryResults = Object.values(typeSummary).sort((a, b) => {
            if (a.region !== b.region) return a.region.localeCompare(b.region);
            if (a.category !== b.category) return a.category.localeCompare(b.category);
            return SIZE_DEFINITIONS[a.size].order - SIZE_DEFINITIONS[b.size].order;
        });
        
        this.displayResults();
        this.displayOmSummary(); // 新增 OM 彙總顯示
        this.saveToLocalStorage();
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
            regionRow.innerHTML = `<td colspan="8" class="region-header-${region.toLowerCase()}">${REGION_DEFINITIONS[region].name}</td>`;
            tbody.appendChild(regionRow);
            
            // 數據行
            regionResults.forEach(result => {
                const tr = document.createElement('tr');
                tr.className = 'data-row';
                tr.dataset.typeCode = result.typeCode;
                
                const carryStatus = result.safetyStock > 0 ? 'Y' : 'FALSE';
                if (result.safetyStock > 0) carryCount += result.storeCount;
                
                tr.innerHTML = `
                    <td>${result.region}</td>
                    <td><span class="badge category-${result.category.toLowerCase()}">${result.category}</span></td>
                    <td><span class="badge">${result.size}</span></td>
                    <td><strong>${result.typeCode}</strong></td>
                    <td style="text-align:center">${result.storeCount}</td>
                    <td style="text-align:center" class="editable-cell" data-field="safetyStock">
                        <span class="display-value">${result.safetyStock}</span>
                        <input type="number" class="edit-value" value="${result.safetyStock}" min="0" style="display:none">
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
            <td colspan="4" style="text-align:right">TOTAL:</td>
            <td style="text-align:center"><strong>${totalStores}</strong></td>
            <td style="text-align:center">Safety Stock:</td>
            <td style="text-align:center;background:#ffeb3b"><strong>${totalSafetyStock}</strong></td>
            <td></td>
        `;
        tbody.appendChild(totalRow);
        
        // Carry 統計行
        const carryRow = document.createElement('tr');
        carryRow.className = 'carry-row';
        carryRow.innerHTML = `
            <td colspan="4" style="text-align:right">No. of shops carry:</td>
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
            const store = this.stores.find(s => s.Site === result.code);
            const omName = store?.OM || '未分配';
            
            const carryStatus = result.safetyStock > 0 ? 'Y' : 'FALSE';
            
            tr.innerHTML = `
                <td>${result.region}</td>
                <td>${result.code}</td>
                <td>${result.name}</td>
                <td>${result.typeCode}</td>
                <td><span class="badge category-${result.category.toLowerCase()}">${result.category}</span></td>
                <td>${result.size}</td>
                <td style="text-align:center">${result.safetyStock}</td>
                <td>${omName}</td>
                <td class="carry-status ${carryStatus === 'Y' ? 'carry-yes' : 'carry-no'}">${carryStatus}</td>
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
            const store = this.stores.find(s => s.Site === result.code);
            const omName = store?.OM || '未分配';
            
            if (!omSummary[omName]) {
                omSummary[omName] = {
                    omName: omName,
                    storeCount: 0,
                    totalSS: 0,
                    hkCount: 0,
                    moCount: 0,
                    categoryCount: { A: 0, B: 0, C: 0, D: 0 },
                    stores: []
                };
            }
            
            omSummary[omName].storeCount++;
            omSummary[omName].totalSS += result.safetyStock;
            
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
            om.carryCount = om.totalSS > 0 ? om.storeCount : 0;
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
                <td style="text-align:center;background:#ffeb3b"><strong>${totalSS}</strong></td>
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
        const newValue = parseInt(editValue.value) || 0;
        
        // 更新 summaryResults
        const result = this.summaryResults.find(r => r.typeCode === typeCode);
        if (result) {
            result.safetyStock = newValue;
            result.allShopQty = result.storeCount * newValue;

            // 更新 customSafetyStock
            const key = `${result.region}-${result.category}-${result.size}`;
            this.customSafetyStock[key] = newValue;

                // 同步對照表草稿
                if (!this.matrixDraft[result.region]) this.matrixDraft[result.region] = {};
                if (!this.matrixDraft[result.region][result.category]) this.matrixDraft[result.region][result.category] = {};
                this.matrixDraft[result.region][result.category][result.size] = newValue;
        }
        
        displayValue.textContent = newValue;
        
        cell.classList.remove('editing');
        displayValue.style.display = 'inline-block';
        editValue.style.display = 'none';
        
        // 重新顯示結果以更新總計
        this.displayResults();
        this.saveToLocalStorage();
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
        // 使用香港時區 (Asia/Hong_Kong, UTC+8)
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
    
    exportToCSV() {
        if (this.summaryResults.length === 0) {
            alert('請先計算結果');
            return;
        }
        
        let csv = '\uFEFF'; // BOM for UTF-8
        
        // ========== 第一頁：店舖詳細清單（優先顯示）==========
        csv += '店舖詳細清單\n';
        csv += `生成日期: ${new Date().toLocaleString('zh-TW')}\n\n`;
        csv += 'HK/MO,代號,店舖,類型代碼,舖類,貨場面積,Safety Stock,Carry\n';
        
        this.results.forEach(result => {
            const carry = result.safetyStock > 0 ? 'Y' : 'FALSE';
            csv += `${result.region},${result.code},"${result.name}",${result.typeCode},${result.category},${result.size},${result.safetyStock},${carry}\n`;
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
            const carry = result.safetyStock > 0 ? 'Y' : 'FALSE';
            csv += `${result.region},${result.category},${result.size},${result.typeCode},${result.storeCount},${result.safetyStock},${result.allShopQty},${carry}\n`;
            totalStores += result.storeCount;
            totalSS += result.allShopQty;
        });
        
        csv += `\nTOTAL:,,,${totalStores},,${totalSS},,\n`;
        
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
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', this.generateFileName('safetystock', 'csv'));
        link.click();
    }

    exportToExcel() {
        if (this.summaryResults.length === 0) {
            alert('請先計算結果');
            return;
        }

        // 檢查是否載入 SheetJS 庫
        if (typeof XLSX === 'undefined') {
            alert('Excel 匯出功能載入失敗，請檢查網路連線後重試');
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
            ['HK/MO', '代號', '店舖', '類型代碼', '舖類', '貨場面積', 'Safety Stock', 'Carry']
        ];

        this.results.forEach(result => {
            const carry = result.safetyStock > 0 ? 'Y' : 'FALSE';
            detailData.push([
                result.region,
                result.code,
                result.name,
                result.typeCode,
                result.category,
                result.size,
                result.safetyStock,
                carry
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
            { wch: 10 }   // Carry
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
            const carry = result.safetyStock > 0 ? 'Y' : 'FALSE';
            summaryData.push([
                result.region,
                result.category,
                result.size,
                result.typeCode,
                result.storeCount,
                result.safetyStock,
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

    exportConfiguration() {
        const config = {
            customSafetyStock: this.customSafetyStock,
            selectedStores: this.selectedStores,
            stores: this.stores,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', this.generateFileName('safetystock_config', 'json'));
        link.click();
    }

    importConfiguration(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target.result);
                
                if (config.customSafetyStock) {
                    this.customSafetyStock = config.customSafetyStock;
                    this.matrixDraft = this.buildMatrixDraftFromApplied();
                    this.renderSafetyStockMatrix();
                }
                
                if (config.selectedStores) {
                    this.selectedStores = config.selectedStores;
                    this.updateCheckboxes();
                    this.updateStoresPreview();
                }
                
                if (config.stores) {
                    this.stores = config.stores;
                    STORES_CONFIG.stores = config.stores;
                    this.renderStores();
                }
                
                this.saveToLocalStorage();
                alert('配置導入成功！');
            } catch (err) {
                alert('配置導入失敗：' + err.message);
            }
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
            const carry = result.safetyStock > 0 ? 'Y' : 'FALSE';
            if (result.safetyStock > 0) carryCount += result.storeCount;
            totalStores += result.storeCount;
            totalSS += result.allShopQty;
            
            summaryHTML += `
                <tr>
                    <td>${result.region}</td>
                    <td>${result.category}</td>
                    <td>${result.size}</td>
                    <td><strong>${result.typeCode}</strong></td>
                    <td style="text-align:center">${result.storeCount}</td>
                    <td style="text-align:center">${result.safetyStock}</td>
                    <td style="text-align:center"><strong>${result.allShopQty}</strong></td>
                    <td style="text-align:center">${carry}</td>
                </tr>
            `;
        });
        
        let detailHTML = '';
        this.results.forEach(result => {
            const carry = result.safetyStock > 0 ? 'Y' : 'FALSE';
            detailHTML += `
                <tr>
                    <td>${result.region}</td>
                    <td>${result.code}</td>
                    <td>${result.name}</td>
                    <td>${result.typeCode}</td>
                    <td>${result.category}</td>
                    <td>${result.size}</td>
                    <td style="text-align:center">${result.safetyStock}</td>
                    <td style="text-align:center">${carry}</td>
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
                            <td style="text-align:center;background:#ffeb3b">${totalSS}</td>
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
                        </tr>
                    </thead>
                    <tbody>
                        ${detailHTML}
                    </tbody>
                </table>
                
                <div class="no-print" style="text-align:center;margin-top:30px">
                    <button onclick="window.print()" style="padding:10px 20px;font-size:16px;cursor:pointer">打印</button>
                    <button onclick="window.close()" style="padding:10px 20px;font-size:16px;cursor:pointer;margin-left:10px">關閉</button>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
    }

    // ==================== 店鋪 CSV 導入 ====================

    triggerStoresCsvUpload() {
        const input = document.getElementById('storesCsvFile');
        if (input) input.click();
    }

    downloadStoresCsvTemplate() {
        // 使用當前店鋪名單生成 CSV 範本
        const header = 'Site,Shop,Regional,Class,Size,OM';
        
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
            const size = store.Size || '';
            const om = store.OM || '';
            
            // 處理可能包含逗號的店鋪名稱
            const escapedShop = shop.includes(',') ? `"${shop}"` : shop;
            
            return `${site},${escapedShop},${regional},${classVal},${size},${om}`;
        });
        
        // 組合 CSV 內容
        const csv = '\uFEFF' + header + '\n' + rows.join('\n') + '\n';
        
        // 生成檔案名稱（包含日期時間）
        const fileName = this.generateFileName('stores-template', 'csv');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', fileName);
        link.click();
        
        // 顯示提示
        this.showToast(`✅ 已下載店鋪範本（${sortedStores.length} 間店鋪）`);
    }

    importStoresFromCsv(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result || '';
                const parsed = this.parseStoresCsv(text);
                if (parsed.errors.length > 0) {
                    alert('CSV 內容有誤：\n' + parsed.errors.join('\n'));
                    return;
                }

                this.stores = parsed.stores;
                STORES_CONFIG.stores = parsed.stores;
                this.selectedStores = [];
                this.renderStores();
                this.saveToLocalStorage();
                alert(`店鋪名單更新成功！共 ${parsed.stores.length} 間店鋪。`);
            } catch (err) {
                alert('CSV 導入失敗：' + err.message);
            }
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
            Class: ['class', 'category', 'type', '舖類', '舖類別', '類別'],
            Size: ['size', 'area size', '貨場面積', '面積'],
            OM: ['om', 'manager', '營運經理', '經理']
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
        const fixedIndex = { Site: 0, Shop: 1, Regional: 2, Class: 3, Size: 4, OM: 5 };

        const validRegions = ['HK', 'MO'];
        const validCategories = ['A', 'B', 'C', 'D'];
        const validSizes = Object.keys(SIZE_DEFINITIONS || {});

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
            const Size = getCell('Size').toUpperCase();
            const OM = getCell('OM');

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
                errors.push(`第 ${rowNumber} 行：Size 必須為 ${validSizes.join('/')}`);
                continue;
            }

            stores.push({
                Site,
                Shop,
                Regional,
                Class,
                Size,
                OM: OM || ''
            });
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
    verifyAdminPassword() {
        const passwordInput = document.getElementById('adminPassword');
        const password = passwordInput.value.trim();
        const ADMIN_PASSWORD = '0000'; // 預設密碼

        if (password === ADMIN_PASSWORD) {
            // 密碼正確，解鎖
            document.getElementById('passwordLock').style.display = 'none';
            document.getElementById('unlockedContent').style.display = 'block';
            passwordInput.value = ''; // 清空密碼欄位
            this.showToast('✅ 管理員權限已確認');
        } else {
            // 密碼錯誤
            this.showToast('❌ 密碼錯誤，請重試');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    // 鎖定管理區域
    lockManagement() {
        document.getElementById('passwordLock').style.display = 'block';
        document.getElementById('unlockedContent').style.display = 'none';
        this.showToast('🔒 管理區域已鎖定');
    }

    // ==================== 本地存儲函數 ====================
    
    saveToLocalStorage() {
        const data = {
            customSafetyStock: this.customSafetyStock,
            customStoreStock: this.customStoreStock, // 個別店鋪的自訂值
            selectedStores: this.selectedStores,
            stores: this.stores,
            theme: this.currentTheme, // 保存當前主題
            weightConfig: this.weightConfig,
            matrixDraft: this.matrixDraft
        };
        localStorage.setItem('safetyStockCalculatorV2', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        try {
            const data = JSON.parse(localStorage.getItem('safetyStockCalculatorV2'));
            // 檢查是否需要更新店鋪資料（如果 localStorage 中的店鋪數量與 config.js 不同）
            const configStoreCount = STORES_CONFIG.stores.length;
            let storeCountMismatch = false;

            if (data && data.stores) {
                const savedStoreCount = data.stores.length;
                if (savedStoreCount !== configStoreCount) {
                    console.log(`店鋪數量已更新：${savedStoreCount} → ${configStoreCount}，使用新的店鋪資料`);
                    storeCountMismatch = true;
                }
            }

            if (data) {
                // 如果店鋪數量不匹配，清除舊的選擇並重新渲染
                if (storeCountMismatch) {
                    this.renderStores();
                    this.selectedStores = this.stores.map((_, index) => index);
                    this.updateCheckboxes();
                    this.updateStoresPreview();
                    this.updateStoreCount();
                    this.saveToLocalStorage();
                    this.showToast(`🔄 店鋪資料已更新（${configStoreCount} 間），已預設全選`);
                } else {
                    // 正常載入選擇的店鋪
                    if (data.selectedStores) {
                        // 過濾掉無效的索引（防止店鋪列表更新後索引失效）
                        const validStores = data.selectedStores.filter(idx => {
                            return idx >= 0 && idx < this.stores.length && this.stores[idx] !== undefined;
                        });
                        this.selectedStores = validStores;
                        this.updateCheckboxes();
                        this.updateStoresPreview();
                    }
                    // 載入保存的店鋪資料（只有數量匹配時才載入）
                    if (data.stores && data.stores.length > 0) {
                        this.stores = data.stores;
                        STORES_CONFIG.stores = data.stores;
                        this.renderStores();
                    }
                }

                // 載入其他設定（與店鋪數量無關）
                if (data.customSafetyStock) {
                    this.customSafetyStock = data.customSafetyStock;
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
                    this.matrixDraft = data.matrixDraft;
                } else {
                    this.matrixDraft = this.buildMatrixDraftFromApplied();
                }
                this.renderSafetyStockMatrix();
            }
        } catch (err) {
            console.log('無法從本地存儲加載數據');
        }

        if (!this.selectedStores || this.selectedStores.length === 0) {
            this.selectedStores = this.stores.map((_, index) => index);
            this.updateCheckboxes();
            this.updateStoresPreview();
            this.updateStoreCount();
            this.saveToLocalStorage();
        }
    }

    // ==================== 權重快速設定功能 ====================

    // 設置權重面板事件監聽
    setupWeightPanelListeners() {
        // 切換面板顯示/隱藏
        document.getElementById('toggleWeightPanel')?.addEventListener('click', () => this.toggleWeightPanel());

        // 算式簡介摺疊/展開
        document.getElementById('formulaToggleBtn')?.addEventListener('click', () => this.toggleFormulaIntro());

        // 套用權重
        document.getElementById('applyWeightsBtn')?.addEventListener('click', () => this.applyWeights());

        // 預覽權重
        document.getElementById('previewWeightsBtn')?.addEventListener('click', () => this.previewWeights());

        // 模板按鈕
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const templateName = e.target.dataset.template;
                this.applyWeightTemplate(templateName);
            });
        });
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

        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            btn.classList.add('active');
        } else {
            panel.style.display = 'none';
            btn.classList.remove('active');
        }
    }

    // 從 UI 讀取權重設定 - 與對照表數值一致
    readWeightsFromUI() {
        const getValue = (id, defaultValue) => {
            const el = document.getElementById(id);
            const val = parseFloat(el?.value);
            return isNaN(val) ? defaultValue : val;
        };

        return {
            class: {
                A: getValue('weightClassA', 3),
                B: getValue('weightClassB', 2),
                C: getValue('weightClassC', 1.5),
                D: getValue('weightClassD', 1.5)
            },
            size: {
                XL: getValue('weightSizeXL', 4),
                L: getValue('weightSizeL', 3),
                M: getValue('weightSizeM', 2.5),
                S: getValue('weightSizeS', 2),
                XS: getValue('weightSizeXS', 1.5)
            },
            baseValue: getValue('baseValue', 4),
            regionFactor: {
                HK: getValue('hkFactor', 1.0),
                MO: getValue('moFactor', 1.33)
            },
            targetTotal: getValue('targetTotal', 0)
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

        setValue('baseValue', this.weightConfig.baseValue);
        setValue('hkFactor', this.weightConfig.regionFactor.HK);
        setValue('moFactor', this.weightConfig.regionFactor.MO);
        if (this.weightConfig.targetTotal !== undefined) {
            setValue('targetTotal', this.weightConfig.targetTotal);
        }
    }

    // 套用權重模板
    applyWeightTemplate(templateName) {
        const template = WEIGHT_TEMPLATES[templateName];
        if (!template) return;

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

        setValue('baseValue', template.baseValue);
        setValue('hkFactor', template.regionFactor.HK);
        setValue('moFactor', template.regionFactor.MO);

        this.showToast(`已套用「${templateName}」模板`);

        // 自動預覽
        this.previewWeights();
    }

    // 預覽權重計算結果
    previewWeights() {
        const weights = this.readWeightsFromUI();
        let previewMatrix = generateMatrixWithWeights(weights);
        const targetTotal = Math.round(weights.targetTotal || 0);
        let targetInfo = null;

        if (targetTotal > 0) {
            targetInfo = this.scaleMatrixToTarget(previewMatrix, targetTotal);
            previewMatrix = targetInfo.matrix;
        }

        let html = '';
        const regions = ['HK', 'MO'];
        const categories = ['A', 'B', 'C', 'D'];
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];

        regions.forEach(region => {
            html += `
                <div class="preview-region">
                    <table class="weight-preview-table">
                        <thead>
                            <tr>
                                <th class="region-header" colspan="6">${region === 'HK' ? '🇭🇰 香港' : '🇲🇴 澳門'} (${region})</th>
                            </tr>
                            <tr>
                                <th>Class \ Size</th>
                                <th>XL</th>
                                <th>L</th>
                                <th>M</th>
                                <th>S</th>
                                <th>XS</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            categories.forEach(category => {
                html += `<tr><td class="category-cell category-${category.toLowerCase()}">${category}級</td>`;
                sizes.forEach(size => {
                    const value = previewMatrix[region][category][size];
                    html += `<td class="value-cell">${value}</td>`;
                });
                html += '</tr>';
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        document.getElementById('weightPreviewContent').innerHTML = html;
        document.getElementById('weightPreview').style.display = 'block';

        // 計算並顯示摘要
        const summary = this.calculateWeightSummary(previewMatrix, targetTotal, targetInfo);
        document.getElementById('weightPreviewSummary').innerHTML = summary;

        // 保存權重配置
        this.weightConfig = weights;
        this.saveToLocalStorage();
    }

    // 計算權重預覽摘要
    calculateWeightSummary(matrix, targetTotal = 0, targetInfo = null) {
        let totalHK = 0;
        let totalMO = 0;
        let countHK = 0;
        let countMO = 0;

        const regions = ['HK', 'MO'];
        const categories = ['A', 'B', 'C', 'D'];
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];

        regions.forEach(region => {
            categories.forEach(category => {
                sizes.forEach(size => {
                    const value = matrix[region][category][size];
                    if (region === 'HK') {
                        totalHK += value;
                        countHK++;
                    } else {
                        totalMO += value;
                        countMO++;
                    }
                });
            });
        });

        const storeTotals = this.calculateStoreTotals(matrix);
        const totalLine = `🧮 依現有店舖數量估算總量: ${storeTotals.totalAll} (HK ${storeTotals.totalHK} / MO ${storeTotals.totalMO})`;

        let targetLine = '';
        if (targetTotal > 0) {
            const diff = targetTotal - storeTotals.totalAll;
            const diffText = diff === 0 ? '✅ 已對齊' : `（差 ${diff}）`;
            targetLine = `<br>🎯 目標總量: ${targetTotal} / 實際分配總量: ${storeTotals.totalAll} ${diffText}`;
            if (targetInfo && targetInfo.remaining > 0) {
                targetLine += `<br>⚠️ 因整數分配尚有 ${targetInfo.remaining} 未分配`;
            }
        }

        return `
            <strong>📊 統計摘要:</strong><br>
            🇭🇰 香港 (HK): 平均 ${(totalHK / countHK).toFixed(1)} (總計 ${totalHK})<br>
            🇲🇴 澳門 (MO): 平均 ${(totalMO / countMO).toFixed(1)} (總計 ${totalMO})<br>
            📈 整體平均: ${((totalHK + totalMO) / (countHK + countMO)).toFixed(1)}<br>
            ${totalLine}${targetLine}
        `;
    }

    // 依店舖數量計算矩陣總量
    calculateStoreTotals(matrix) {
        let totalHK = 0;
        let totalMO = 0;
        let totalAll = 0;

        this.stores.forEach(store => {
            const value = matrix?.[store.Regional]?.[store.Class]?.[store.Size] ?? 0;
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
            const key = `${store.Regional}-${store.Class}-${store.Size}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }

    // 依目標總量縮放矩陣
    scaleMatrixToTarget(matrix, targetTotal) {
        const regions = ['HK', 'MO'];
        const categories = ['A', 'B', 'C', 'D'];
        const sizes = ['XL', 'L', 'M', 'S', 'XS'];
        const counts = this.getStoreTypeCounts();

        let currentTotal = 0;
        const cells = [];

        regions.forEach(region => {
            categories.forEach(category => {
                sizes.forEach(size => {
                    const value = matrix[region][category][size];
                    const count = counts[`${region}-${category}-${size}`] || 0;
                    currentTotal += count * value;
                    cells.push({ region, category, size, count, value });
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
            const sorted = [...cells].sort((a, b) => {
                if (b.frac !== a.frac) return b.frac - a.frac;
                return b.count - a.count;
            });

            let safety = 0;
            while (remaining > 0 && safety < 10000) {
                const candidate = sorted.find(cell => cell.count > 0 && cell.count <= remaining);
                if (!candidate) break;
                candidate.base += 1;
                remaining -= candidate.count;
                safety += 1;
            }
        }

        const scaledMatrix = {};
        regions.forEach(region => {
            scaledMatrix[region] = {};
            categories.forEach(category => {
                scaledMatrix[region][category] = {};
                sizes.forEach(size => {
                    const cell = cells.find(item => item.region === region && item.category === category && item.size === size);
                    scaledMatrix[region][category][size] = cell ? cell.base : 0;
                });
            });
        });

        return {
            matrix: scaledMatrix,
            currentTotal,
            appliedTotal: targetTotal - remaining,
            remaining,
            scale
        };
    }

    // 套用權重到對照表
    applyWeights() {
        const weights = this.readWeightsFromUI();
        let newMatrix = generateMatrixWithWeights(weights);
        const targetTotal = Math.round(weights.targetTotal || 0);
        let targetInfo = null;

        if (targetTotal > 0) {
            targetInfo = this.scaleMatrixToTarget(newMatrix, targetTotal);
            newMatrix = targetInfo.matrix;
        }

        const confirmMessage = targetTotal > 0
            ? `確定要依目標總量 ${targetTotal} 套用權重計算結果嗎？這將覆蓋目前的 Safety Stock 對照表。\n\n提示：套用後您仍可手動調整個別數值。`
            : '確定要套用權重計算結果嗎？這將覆蓋目前的 Safety Stock 對照表。\n\n提示：套用後您仍可手動調整個別數值。';

        if (confirm(confirmMessage)) {
            // 更新對照表草稿（不直接影響店鋪）
            this.matrixDraft = JSON.parse(JSON.stringify(newMatrix));

            // 保存權重配置
            this.weightConfig = weights;

            // 重新渲染對照表
            this.renderSafetyStockMatrix();
            this.saveToLocalStorage();

            const totals = this.calculateStoreTotals(newMatrix);
            if (targetTotal > 0 && targetInfo && targetInfo.remaining > 0) {
                this.showToast(`✅ 權重已套用到對照表！實際總量 ${totals.totalAll}（尚有 ${targetInfo.remaining} 未分配）`);
            } else {
                this.showToast(`✅ 權重已套用到對照表！總量 ${totals.totalAll}`);
            }

            // 關閉預覽面板
            document.getElementById('weightPreview').style.display = 'none';
        }
    }
}

// 頁面加載時初始化應用
document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new SafetyStockCalculator();
});
