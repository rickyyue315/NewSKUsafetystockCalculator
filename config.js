// ==================== 配置文件：店鋪和Safety Stock參數 ====================
// 此文件存儲所有的店鋪名單和Safety Stock參數配置
// 根據 Safety Stocks Calculation 1.xlsx 重新設計

// 店鋪配置 - 完整的 85 間店鋪清單
const STORES_CONFIG = {
    stores: [
        // Ivy - 14間
        { Site: "HA02", Shop: "駱克", Regional: "HK", Class: "B", Size: "S", OM: "Ivy", Type: "M" },
        { Site: "HA06", Shop: "北角", Regional: "HK", Class: "B", Size: "M", OM: "Ivy", Type: "M" },
        { Site: "HA15", Shop: "新中環", Regional: "HK", Class: "A", Size: "L", OM: "Ivy", Type: "M" },
        { Site: "HA30", Shop: "禮頓中心", Regional: "HK", Class: "B", Size: "L", OM: "Ivy", Type: "M" },
        { Site: "HB01", Shop: "加連威", Regional: "HK", Class: "C", Size: "S", OM: "Ivy", Type: "T" },
        { Site: "HB10", Shop: "彌敦88", Regional: "HK", Class: "A", Size: "L", OM: "Ivy", Type: "T" },
        { Site: "HB29", Shop: "重慶站", Regional: "HK", Class: "A", Size: "XL", OM: "Ivy", Type: "T" },
        { Site: "HB38", Shop: "新港", Regional: "HK", Class: "C", Size: "M", OM: "Ivy", Type: "M" },
        { Site: "HB63", Shop: "佐敦道31", Regional: "HK", Class: "B", Size: "M", OM: "Ivy", Type: "M" },
        { Site: "HB66", Shop: "PopCorn", Regional: "HK", Class: "C", Size: "M", OM: "Ivy", Type: "M" },
        { Site: "HB68", Shop: "新都城", Regional: "HK", Class: "C", Size: "S", OM: "Ivy", Type: "L" },
        { Site: "HB75", Shop: "東港城2", Regional: "HK", Class: "C", Size: "M", OM: "Ivy", Type: "L" },
        { Site: "HB83", Shop: "新加拿芬道", Regional: "HK", Class: "B", Size: "L", OM: "Ivy", Type: "T" },
        { Site: "HB94", Shop: "康城", Regional: "HK", Class: "C", Size: "S", OM: "Ivy", Type: "L" },

        // Queenie - 15間
        { Site: "HA20", Shop: "新香港仔", Regional: "HK", Class: "C", Size: "M", OM: "Queenie", Type: "L" },
        { Site: "HA39", Shop: "金百利", Regional: "HK", Class: "A", Size: "M", OM: "Queenie", Type: "T" },
        { Site: "HZ81", Shop: "莊士敦道", Regional: "HK", Class: "B", Size: "M", OM: "Queenie", Type: "M" },
        { Site: "HA46", Shop: "莊士敦道2", Regional: "HK", Class: "B", Size: "S", OM: "Queenie", Type: "M" },
        { Site: "HA32", Shop: "皇室堡", Regional: "HK", Class: "B", Size: "L", OM: "Queenie", Type: "M" },
        { Site: "HA33", Shop: "羅素街8號", Regional: "HK", Class: "B", Size: "S", OM: "Queenie", Type: "T" },
        { Site: "HA37", Shop: "新信德", Regional: "HK", Class: "C", Size: "XS", OM: "Queenie", Type: "M" },
        { Site: "HA42", Shop: "啟超道", Regional: "HK", Class: "B", Size: "S", OM: "Queenie", Type: "T" },
        { Site: "HA44", Shop: "黃竹坑", Regional: "HK", Class: "C", Size: "M", OM: "Queenie", Type: "M" },
        { Site: "HA45", Shop: "合和商場", Regional: "HK", Class: "D", Size: "L", OM: "Queenie", Type: "M" },
        { Site: "HC13", Shop: "沙田中心", Regional: "HK", Class: "C", Size: "S", OM: "Queenie", Type: "M" },
        { Site: "HC27", Shop: "大埔超級城", Regional: "HK", Class: "C", Size: "M", OM: "Queenie", Type: "L" },
        { Site: "HC33", Shop: "太和", Regional: "HK", Class: "C", Size: "M", OM: "Queenie", Type: "L" },
        { Site: "HC60", Shop: "新大埔新達", Regional: "HK", Class: "C", Size: "M", OM: "Queenie", Type: "L" },
        { Site: "HC66", Shop: "新沙田", Regional: "HK", Class: "B", Size: "M", OM: "Queenie", Type: "M" },

        // Candy - 12間
        { Site: "HA21", Shop: "柴灣新翠", Regional: "HK", Class: "C", Size: "S", OM: "Candy", Type: "L" },
        { Site: "HA40", Shop: "新山頂", Regional: "HK", Class: "D", Size: "S", OM: "Candy", Type: "T" },
        { Site: "HB25", Shop: "奧海城", Regional: "HK", Class: "C", Size: "M", OM: "Candy", Type: "L" },
        { Site: "HB38", Shop: "新港", Regional: "HK", Class: "C", Size: "M", OM: "Candy", Type: "T" },
        { Site: "HB98", Shop: "星光行2", Regional: "HK", Class: "B", Size: "M", OM: "Candy", Type: "T" },
        { Site: "HC05", Shop: "上水", Regional: "HK", Class: "B", Size: "M", OM: "Candy", Type: "T" },
        { Site: "HC26", Shop: "沙田第一城", Regional: "HK", Class: "C", Size: "M", OM: "Candy", Type: "L" },
        { Site: "HBA4", Shop: "中港城2", Regional: "HK", Class: "C", Size: "M", OM: "Candy", Type: "T" },
        { Site: "HC42", Shop: "上水新都2", Regional: "HK", Class: "C", Size: "M", OM: "Candy", Type: "M" },
        { Site: "HC45", Shop: "新馬鞍山", Regional: "HK", Class: "C", Size: "M", OM: "Candy", Type: "L" },
        { Site: "HC63", Shop: "新東涌", Regional: "HK", Class: "B", Size: "M", OM: "Candy", Type: "M" },
        { Site: "HC68", Shop: "新大圍", Regional: "HK", Class: "C", Size: "XS", OM: "Candy", Type: "L" },

        // Violet - 8間
        { Site: "HA19", Shop: "康山", Regional: "HK", Class: "C", Size: "S", OM: "Violet", Type: "L" },
        { Site: "HB62", Shop: "油塘", Regional: "HK", Class: "C", Size: "L", OM: "Violet", Type: "L" },
        { Site: "HB69", Shop: "西九龍", Regional: "HK", Class: "C", Size: "M", OM: "Violet", Type: "L" },
        { Site: "HB86", Shop: "新都會駅", Regional: "HK", Class: "D", Size: "S", OM: "Violet", Type: "L" },
        { Site: "HB91", Shop: "南昌站V Walk", Regional: "HK", Class: "D", Size: "XS", OM: "Violet", Type: "L" },
        { Site: "HB93", Shop: "新好望角", Regional: "HK", Class: "A", Size: "M", OM: "Violet", Type: "T" },
        { Site: "HB95", Shop: "觀塘APM2", Regional: "HK", Class: "B", Size: "S", OM: "Violet", Type: "M" },
        { Site: "HB97", Shop: "新旺角文華", Regional: "HK", Class: "A", Size: "M", OM: "Violet", Type: "T" },

        // Hippo - 15間
        { Site: "HB11", Shop: "德福", Regional: "HK", Class: "B", Size: "M", OM: "Hippo", Type: "M" },
        { Site: "HB12", Shop: "黃埔", Regional: "HK", Class: "B", Size: "M", OM: "Hippo", Type: "M" },
        { Site: "HB30", Shop: "淘大", Regional: "HK", Class: "C", Size: "S", OM: "Hippo", Type: "L" },
        { Site: "HB41", Shop: "九龍城", Regional: "HK", Class: "D", Size: "M", OM: "Hippo", Type: "L" },
        { Site: "HB49", Shop: "新蒲崗", Regional: "HK", Class: "C", Size: "M", OM: "Hippo", Type: "L" },
        { Site: "HB56", Shop: "旺角160", Regional: "HK", Class: "B", Size: "M", OM: "Hippo", Type: "T" },
        { Site: "HB72", Shop: "黃大仙", Regional: "HK", Class: "C", Size: "M", OM: "Hippo", Type: "M" },
        { Site: "HB77", Shop: "新樂富", Regional: "HK", Class: "C", Size: "XS", OM: "Hippo", Type: "L" },
        { Site: "HB87", Shop: "西九高鐵站", Regional: "HK", Class: "B", Size: "XS", OM: "Hippo", Type: "T" },
        { Site: "HB96", Shop: "啟德", Regional: "HK", Class: "D", Size: "M", OM: "Hippo", Type: "M" },
        { Site: "HBA2", Shop: "廣東道2", Regional: "HK", Class: "B", Size: "M", OM: "Hippo", Type: "T" },
        { Site: "HBA3", Shop: "荷里活廣場2", Regional: "HK", Class: "C", Size: "S", OM: "Hippo", Type: "L" },
        { Site: "HC19", Shop: "錦薈坊", Regional: "HK", Class: "C", Size: "M", OM: "Hippo", Type: "M" },
        { Site: "HC31", Shop: "新屯門", Regional: "HK", Class: "C", Size: "M", OM: "Hippo", Type: "M" },
        { Site: "HC67", Shop: "新V City", Regional: "HK", Class: "C", Size: "M", OM: "Hippo", Type: "M" },

        // Eva - 13間
        { Site: "HB24", Shop: "始創", Regional: "HK", Class: "B", Size: "M", OM: "Eva", Type: "M" },
        { Site: "HB80", Shop: "新世紀Moko", Regional: "HK", Class: "C", Size: "M", OM: "Eva", Type: "M" },
        { Site: "HC02", Shop: "荃灣", Regional: "HK", Class: "B", Size: "M", OM: "Eva", Type: "L" },
        { Site: "HC15", Shop: "悅來坊", Regional: "HK", Class: "C", Size: "M", OM: "Eva", Type: "M" },
        { Site: "HC44", Shop: "新頌富", Regional: "HK", Class: "C", Size: "S", OM: "Eva", Type: "L" },
        { Site: "HC49", Shop: "形點", Regional: "HK", Class: "C", Size: "M", OM: "Eva", Type: "M" },
        { Site: "HC51", Shop: "新荃灣廣場", Regional: "HK", Class: "D", Size: "M", OM: "Eva", Type: "M" },
        { Site: "HC55", Shop: "新新都會", Regional: "HK", Class: "B", Size: "L", OM: "Eva", Type: "L" },
        { Site: "HC61", Shop: "如心廣場", Regional: "HK", Class: "C", Size: "M", OM: "Eva", Type: "M" },
        { Site: "HC62", Shop: "新元朗", Regional: "HK", Class: "C", Size: "S", OM: "Eva", Type: "L" },
        { Site: "HC64", Shop: "嘉湖", Regional: "HK", Class: "C", Size: "M", OM: "Eva", Type: "L" },
        { Site: "HC69", Shop: "元朗廣場2", Regional: "HK", Class: "C", Size: "S", OM: "Eva", Type: "M" },

        // Windy - 9間 (澳門)
        { Site: "HD02", Shop: "高士德", Regional: "MO", Class: "B", Size: "L", OM: "Windy", Type: "L" },
        { Site: "HD03", Shop: "議事亭", Regional: "MO", Class: "A", Size: "XL", OM: "Windy", Type: "T" },
        { Site: "HD09", Shop: "新威尼斯人", Regional: "MO", Class: "A", Size: "L", OM: "Windy", Type: "T" },
        { Site: "HD11", Shop: "新澳門廣場", Regional: "MO", Class: "A", Size: "L", OM: "Windy", Type: "T" },
        { Site: "HD15", Shop: "信達廣場", Regional: "MO", Class: "A", Size: "L", OM: "Windy", Type: "T" },
        { Site: "HD16", Shop: "澳門南灣中心", Regional: "MO", Class: "C", Size: "L", OM: "Windy", Type: "T" },
        { Site: "HD18", Shop: "倫敦人", Regional: "MO", Class: "A", Size: "XL", OM: "Windy", Type: "T" },
        { Site: "HD19", Shop: "板樟堂", Regional: "MO", Class: "A", Size: "L", OM: "Windy", Type: "T" },
        { Site: "HD20", Shop: "澳門銀河2", Regional: "MO", Class: "B", Size: "S", OM: "Windy", Type: "T" }
    ]
};

// Safety Stock 對照表 - 三維結構（Region → Class → Type → Size）
// 根據實際業務需求設定，整合客源類型（T/M/L）
const SAFETY_STOCK_MATRIX = {
    "HK": {
        "A": {
            "T": { "XL": 17, "L": 15, "M": 13, "S": 12, "XS": 10 },
            "M": { "XL": 17, "L": 15, "M": 13, "S": 12, "XS": 10 },
            "L": { "XL": 17, "L": 15, "M": 13, "S": 12, "XS": 10 }
        },
        "B": {
            "T": { "XL": 14, "L": 13, "M": 12, "S": 10, "XS": 9 },
            "M": { "XL": 14, "L": 13, "M": 12, "S": 10, "XS": 9 },
            "L": { "XL": 14, "L": 13, "M": 12, "S": 10, "XS": 9 }
        },
        "C": {
            "T": { "XL": 13, "L": 12, "M": 10, "S": 9, "XS": 9 },
            "M": { "XL": 13, "L": 12, "M": 10, "S": 9, "XS": 9 },
            "L": { "XL": 13, "L": 12, "M": 10, "S": 9, "XS": 9 }
        },
        "D": {
            "T": { "XL": 12, "L": 11, "M": 9, "S": 9, "XS": 8 },
            "M": { "XL": 12, "L": 11, "M": 9, "S": 9, "XS": 8 },
            "L": { "XL": 12, "L": 11, "M": 9, "S": 9, "XS": 8 }
        }
    },
    "MO": {
        "A": {
            "T": { "XL": 27, "L": 25, "M": 16, "S": 13, "XS": 12 },
            "M": { "XL": 27, "L": 25, "M": 16, "S": 13, "XS": 12 },
            "L": { "XL": 27, "L": 25, "M": 16, "S": 13, "XS": 12 }
        },
        "B": {
            "T": { "XL": 17, "L": 16, "M": 14, "S": 12, "XS": 10 },
            "M": { "XL": 17, "L": 16, "M": 14, "S": 12, "XS": 10 },
            "L": { "XL": 17, "L": 16, "M": 14, "S": 12, "XS": 10 }
        },
        "C": {
            "T": { "XL": 14, "L": 13, "M": 12, "S": 10, "XS": 10 },
            "M": { "XL": 14, "L": 13, "M": 12, "S": 10, "XS": 10 },
            "L": { "XL": 14, "L": 13, "M": 12, "S": 10, "XS": 10 }
        },
        "D": {
            "T": { "XL": 13, "L": 12, "M": 10, "S": 10, "XS": 9 },
            "M": { "XL": 13, "L": 12, "M": 10, "S": 10, "XS": 9 },
            "L": { "XL": 13, "L": 12, "M": 10, "S": 10, "XS": 9 }
        }
    }
};

// 計算組合代碼（如 HKAL, HKBM 等）
function getStoreTypeCode(region, category, size) {
    return `${region}${category}${size}`;
}

// 根據店鋪獲取 Safety Stock 值（含 Type）
function getSafetyStockValue(region, category, size, type = 'M') {
    try {
        return SAFETY_STOCK_MATRIX[region][category][type][size] || 0;
    } catch (e) {
        return 0;
    }
}

// 獲取店鋪類型摘要
function getStoreTypeSummary() {
    const summary = {};

    STORES_CONFIG.stores.forEach(store => {
        const code = getStoreTypeCode(store.Regional, store.Class, store.Size);
        if (!summary[code]) {
            summary[code] = {
                region: store.Regional,
                category: store.Class,
                size: store.Size,
                safetyStock: getSafetyStockValue(store.Regional, store.Class, store.Size),
                count: 0,
                stores: []
            };
        }
        summary[code].count++;
        summary[code].stores.push(store.Shop);
    });

    return summary;
}

// 舖類分類定義
const CATEGORY_DEFINITIONS = {
    "A": { name: "A級", description: "高流量旗艦店", color: "#4caf50" },
    "B": { name: "B級", description: "中高流量店舖", color: "#2196f3" },
    "C": { name: "C級", description: "中低流量店舖", color: "#ff9800" },
    "D": { name: "D級", description: "低流量/特殊店舖", color: "#f44336" }
};

// 貨場面積定義
const SIZE_DEFINITIONS = {
    "XL": { name: "XL", description: "超大型", order: 1 },
    "L": { name: "L", description: "大型", order: 2 },
    "M": { name: "M", description: "中型", order: 3 },
    "S": { name: "S", description: "小型", order: 4 },
    "XS": { name: "XS", description: "迷你型", order: 5 }
};

// 區域定義
const REGION_DEFINITIONS = {
    "HK": { name: "香港", color: "#667eea" },
    "MO": { name: "澳門", color: "#e91e63" }
};

// Type 定義（店舖類型）
const TYPE_DEFINITIONS = {
    "T": { name: "遊客區", description: "Tourist - 主要服務遊客的店舖", color: "#ff6b6b" },
    "M": { name: "混合型", description: "Mixed - 遊客與本地客源混合的店舖", color: "#4ecdc4" },
    "L": { name: "本地型", description: "Local - 主要服務本地客源的店舖", color: "#45b7d1" }
};

// 默認的計算配置
const DEFAULT_CALCULATION_CONFIG = {
    method: "matrix", // 使用對照表方式
    autoCalculate: false,
    updateFrequency: "manual"
};

// ==================== 權重設定配置 ====================
// 用於快速計算 Safety Stock 對照表

// 預設權重配置 - 包含 Type（店舖類型）權重
const WEIGHT_CONFIG = {
    class: { A: 1.8, B: 1.4, C: 1, D: 1 },
    size: { XL: 2.0, L: 1.6, M: 1.2, S: 0.8, XS: 0.8 },
    type: { T: 1.2, M: 1.0, L: 0.9 },
    baseValue: 4,
    regionFactor: { HK: 1.0, MO: 1.33 },
    salesTarget: 0,
    safetyStockDays: 7,
    targetTotal: 0
};

// 預設模板 - 提供多種權重設定選項（已整合 Type 權重）
const WEIGHT_TEMPLATES = {
    // 目前設定（平衡型 - 新增 Type 權重）
    current: {
        class: { A: 1.8, B: 1.4, C: 1, D: 1 },
        size: { XL: 2.0, L: 1.6, M: 1.2, S: 0.8, XS: 0.8 },
        type: { T: 1.2, M: 1.0, L: 0.9 },
        baseValue: 4,
        regionFactor: { HK: 1.0, MO: 1.33 }
    },

    // 預設權重（與目前設定相同）
    default: {
        class: { A: 1.8, B: 1.4, C: 1, D: 1 },
        size: { XL: 2.0, L: 1.6, M: 1.2, S: 0.8, XS: 0.8 },
        type: { T: 1.2, M: 1.0, L: 0.9 },
        baseValue: 4,
        regionFactor: { HK: 1.0, MO: 1.33 }
    },

    // 平衡權重（較平均分配，Type 權重較小）
    balanced: {
        class: { A: 1.6, B: 1.3, C: 1, D: 0.9 },
        size: { XL: 1.8, L: 1.5, M: 1.2, S: 0.9, XS: 0.8 },
        type: { T: 1.1, M: 1.0, L: 0.95 },
        baseValue: 4,
        regionFactor: { HK: 1.0, MO: 1.3 }
    },

    // 保守型（較低的庫存配置，Type 差異最小）
    conservative: {
        class: { A: 1.3, B: 1.0, C: 0.8, D: 0.8 },
        size: { XL: 1.5, L: 1.2, M: 1.0, S: 0.7, XS: 0.7 },
        type: { T: 1.05, M: 1.0, L: 0.98 },
        baseValue: 3,
        regionFactor: { HK: 1.0, MO: 1.2 }
    },

    // 積極型（較高的庫存配置，Type 差異明顯）
    aggressive: {
        class: { A: 2.0, B: 1.6, C: 1.2, D: 1 },
        size: { XL: 2.4, L: 2.0, M: 1.5, S: 1.0, XS: 0.9 },
        type: { T: 1.3, M: 1.0, L: 0.85 },
        baseValue: 5,
        regionFactor: { HK: 1.0, MO: 1.4 }
    }
};

// 根據權重計算 Safety Stock
//
// 計算邏輯：Safety Stock = 基礎值 + (Class權重 × Size權重 × Type權重 × 區域係數)
//
// 重要特性：
// - 如果任何權重參數為 0，整個乘法結果為 0，最終 Safety Stock = 基礎值 + 0
// - 如果區域係數為 0，表示該區域不需要庫存，結果直接為 0
// - Type 權重用於調整不同店舖類型的庫存需求（T: 遊客區, M: 混合型, L: 本地型）
// - 常用場景：設定某個區域的係數為 0 可禁用該區域的庫存需求
function calculateSafetyStockWithWeights(region, category, size, type, weights) {
    const classWeight = weights.class[category] || 1;
    const sizeWeight = weights.size[size] || 1;
    const typeWeight = (weights.type && weights.type[type]) || 1;
    const regionFactor = weights.regionFactor[region];
    const baseValue = weights.baseValue || 6;
    
    // 如果區域係數為 0 或未定義，直接返回 0（該區域不需要庫存）
    if (regionFactor === 0 || regionFactor === undefined) {
        return 0;
    }
    
    // 計算公式：基礎值 + (Class權重 × Size權重 × Type權重 × 區域係數)
    // 注意：如果乘法中任何項為 0，整個乘積為 0
    let result = baseValue + (classWeight * sizeWeight * typeWeight * regionFactor);
    
    // 確保最小值為 0
    if (result < 0) result = 0;
    
    // 四捨五入為整數
    return Math.round(result);
}

// 根據權重生成整個對照表（基於混合型 Type=M 作為基準）
function generateMatrixWithWeights(weights) {
    const matrix = {};
    const regions = ['HK', 'MO'];
    const categories = ['A', 'B', 'C', 'D'];
    const sizes = ['XL', 'L', 'M', 'S', 'XS'];
    const baseType = 'M'; // 使用混合型作為對照表基準
    
    regions.forEach(region => {
        matrix[region] = {};
        categories.forEach(category => {
            matrix[region][category] = {};
            sizes.forEach(size => {
                matrix[region][category][size] = calculateSafetyStockWithWeights(
                    region, category, size, baseType, weights
                );
            });
        });
    });
    
    return matrix;
}

// ==================== 配色方案配置 ====================
// 企業預設配色（藍綠色系 - 專業科技感）
const THEME_CORPORATE = {
    name: "企業標準",
    nameEn: "Corporate",
    description: "藍綠漸變專業配色",
    colors: {
        // 主色調
        primary: "#667eea",
        primaryLight: "#5dade2",
        primaryDark: "#5568d3",
        secondary: "#76d7c4",
        accent: "#ff9800",
        
        // 背景色
        bodyBg: "linear-gradient(135deg, #a8d8ea 0%, #d4f1f4 100%)",
        containerBg: "#ffffff",
        sectionBg: "#f9f9f9",
        headerBg: "linear-gradient(135deg, #5dade2 0%, #76d7c4 100%)",
        footerBg: "#f5f5f5",
        
        // 文字顏色
        textPrimary: "#333333",
        textSecondary: "#555555",
        textMuted: "#888888",
        textLight: "#ffffff",
        
        // 邊框顏色
        borderLight: "#ddd",
        borderMedium: "#ccc",
        
        // 區域顏色
        regionHk: "#667eea",
        regionMo: "#e91e63",
        
        // 類別顏色
        categoryA: "#4caf50",
        categoryB: "#2196f3",
        categoryC: "#ff9800",
        categoryD: "#f44336",
        
        // 狀態顏色
        success: "#4caf50",
        warning: "#ff9800",
        danger: "#f44336",
        info: "#2196f3",
        highlight: "#ffeb3b",
        
        // 表格顏色
        tableHeaderBg: "#667eea",
        tableHeaderText: "#ffffff",
        tableRowEven: "#f9f9f9",
        tableRowHover: "#f0f4ff",
        tableTotalBg: "#e8f5e9",
        tableCarryBg: "#fff3e0",
        
        // 按鈕顏色
        btnPrimaryBg: "#667eea",
        btnPrimaryHover: "#5568d3",
        btnSecondaryBg: "#e0e0e0",
        btnSuccessBg: "#4caf50",
        btnWarningBg: "#ff9800",
        btnDangerBg: "#f44336",
        btnInfoBg: "#2196f3",
        
        // 滾動條
        scrollbarTrack: "#f1f1f1",
        scrollbarThumb: "#c1c1c1",
        scrollbarThumbHover: "#a8a8a8"
    }
};

// 深色主題
const THEME_DARK = {
    name: "深色模式",
    nameEn: "Dark Mode",
    description: "護眼深色配色",
    colors: {
        primary: "#5c7cfa",
        primaryLight: "#748ffc",
        primaryDark: "#4c6ef5",
        secondary: "#38d9a9",
        accent: "#ffa94d",
        
        bodyBg: "linear-gradient(135deg, #1a1b26 0%, #24283b 100%)",
        containerBg: "#2a2e3f",
        sectionBg: "#32364a",
        headerBg: "linear-gradient(135deg, #3b4261 0%, #2d3142 100%)",
        footerBg: "#1a1b26",
        
        textPrimary: "#e2e8f0",
        textSecondary: "#94a3b8",
        textMuted: "#64748b",
        textLight: "#f1f5f9",
        
        borderLight: "#3d4451",
        borderMedium: "#4b5563",
        
        regionHk: "#5c7cfa",
        regionMo: "#f06292",
        
        categoryA: "#4ade80",
        categoryB: "#60a5fa",
        categoryC: "#fb923c",
        categoryD: "#f87171",
        
        success: "#4ade80",
        warning: "#fb923c",
        danger: "#f87171",
        info: "#60a5fa",
        highlight: "#fde047",
        
        tableHeaderBg: "#3b4261",
        tableHeaderText: "#e2e8f0",
        tableRowEven: "#2a2e3f",
        tableRowHover: "#374151",
        tableTotalBg: "#1e3a2f",
        tableCarryBg: "#3d2f1e",
        
        btnPrimaryBg: "#5c7cfa",
        btnPrimaryHover: "#4c6ef5",
        btnSecondaryBg: "#4b5563",
        btnSuccessBg: "#22c55e",
        btnWarningBg: "#f59e0b",
        btnDangerBg: "#ef4444",
        btnInfoBg: "#3b82f6",
        
        scrollbarTrack: "#1f2937",
        scrollbarThumb: "#4b5563",
        scrollbarThumbHover: "#6b7280"
    }
};

// 暖色主題
const THEME_WARM = {
    name: "暖色調",
    nameEn: "Warm Tones",
    description: "溫暖橙紅配色",
    colors: {
        primary: "#e07b39",
        primaryLight: "#f4a261",
        primaryDark: "#d4621c",
        secondary: "#e9c46a",
        accent: "#e76f51",
        
        bodyBg: "linear-gradient(135deg, #fef3e2 0%, #fdf6e3 100%)",
        containerBg: "#fffbf5",
        sectionBg: "#fef9f3",
        headerBg: "linear-gradient(135deg, #f4a261 0%, #e9c46a 100%)",
        footerBg: "#f5ebe0",
        
        textPrimary: "#2c3e50",
        textSecondary: "#5d6d7e",
        textMuted: "#95a5a6",
        textLight: "#ffffff",
        
        borderLight: "#e5d5c5",
        borderMedium: "#d4c4b0",
        
        regionHk: "#e07b39",
        regionMo: "#c0392b",
        
        categoryA: "#27ae60",
        categoryB: "#3498db",
        categoryC: "#f39c12",
        categoryD: "#e74c3c",
        
        success: "#27ae60",
        warning: "#f39c12",
        danger: "#e74c3c",
        info: "#3498db",
        highlight: "#ffeaa7",
        
        tableHeaderBg: "#e07b39",
        tableHeaderText: "#ffffff",
        tableRowEven: "#fef9f3",
        tableRowHover: "#fef3e2",
        tableTotalBg: "#e8f6e8",
        tableCarryBg: "#fef5e7",
        
        btnPrimaryBg: "#e07b39",
        btnPrimaryHover: "#d4621c",
        btnSecondaryBg: "#e5d5c5",
        btnSuccessBg: "#27ae60",
        btnWarningBg: "#f39c12",
        btnDangerBg: "#e74c3c",
        btnInfoBg: "#3498db",
        
        scrollbarTrack: "#f5ebe0",
        scrollbarThumb: "#d4c4b0",
        scrollbarThumbHover: "#b8a890"
    }
};

// 高對比度主題（無障礙設計）
const THEME_HIGH_CONTRAST = {
    name: "高對比度",
    nameEn: "High Contrast",
    description: "無障礙高對比配色",
    colors: {
        primary: "#0000ff",
        primaryLight: "#0066ff",
        primaryDark: "#0000cc",
        secondary: "#00cc00",
        accent: "#ff6600",
        
        bodyBg: "#ffffff",
        containerBg: "#ffffff",
        sectionBg: "#f0f0f0",
        headerBg: "#000080",
        footerBg: "#e0e0e0",
        
        textPrimary: "#000000",
        textSecondary: "#333333",
        textMuted: "#666666",
        textLight: "#ffffff",
        
        borderLight: "#000000",
        borderMedium: "#333333",
        
        regionHk: "#0000ff",
        regionMo: "#cc0000",
        
        categoryA: "#008000",
        categoryB: "#0066cc",
        categoryC: "#ff6600",
        categoryD: "#cc0000",
        
        success: "#008000",
        warning: "#ff6600",
        danger: "#cc0000",
        info: "#0066cc",
        highlight: "#ffff00",
        
        tableHeaderBg: "#000080",
        tableHeaderText: "#ffffff",
        tableRowEven: "#f5f5f5",
        tableRowHover: "#e0e0e0",
        tableTotalBg: "#e8f5e8",
        tableCarryBg: "#fff8e1",
        
        btnPrimaryBg: "#0000ff",
        btnPrimaryHover: "#0000cc",
        btnSecondaryBg: "#cccccc",
        btnSuccessBg: "#008000",
        btnWarningBg: "#ff6600",
        btnDangerBg: "#cc0000",
        btnInfoBg: "#0066cc",
        
        scrollbarTrack: "#e0e0e0",
        scrollbarThumb: "#666666",
        scrollbarThumbHover: "#333333"
    }
};

// 紫色優雅主題
const THEME_ELEGANT = {
    name: "優雅紫",
    nameEn: "Elegant Purple",
    description: "優雅紫羅蘭配色",
    colors: {
        primary: "#7c3aed",
        primaryLight: "#8b5cf6",
        primaryDark: "#6d28d9",
        secondary: "#ec4899",
        accent: "#f59e0b",
        
        bodyBg: "linear-gradient(135deg, #f3e8ff 0%, #fae8ff 100%)",
        containerBg: "#ffffff",
        sectionBg: "#faf5ff",
        headerBg: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
        footerBg: "#f3e8ff",
        
        textPrimary: "#1f2937",
        textSecondary: "#4b5563",
        textMuted: "#9ca3af",
        textLight: "#ffffff",
        
        borderLight: "#e5d9f2",
        borderMedium: "#d8b4fe",
        
        regionHk: "#7c3aed",
        regionMo: "#ec4899",
        
        categoryA: "#10b981",
        categoryB: "#3b82f6",
        categoryC: "#f59e0b",
        categoryD: "#ef4444",
        
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#3b82f6",
        highlight: "#fef08a",
        
        tableHeaderBg: "#7c3aed",
        tableHeaderText: "#ffffff",
        tableRowEven: "#faf5ff",
        tableRowHover: "#f3e8ff",
        tableTotalBg: "#ecfdf5",
        tableCarryBg: "#fffbeb",
        
        btnPrimaryBg: "#7c3aed",
        btnPrimaryHover: "#6d28d9",
        btnSecondaryBg: "#e5d9f2",
        btnSuccessBg: "#10b981",
        btnWarningBg: "#f59e0b",
        btnDangerBg: "#ef4444",
        btnInfoBg: "#3b82f6",
        
        scrollbarTrack: "#f3e8ff",
        scrollbarThumb: "#d8b4fe",
        scrollbarThumbHover: "#c084fc"
    }
};

// 極簡白主題
const THEME_MINIMAL = {
    name: "極簡白",
    nameEn: "Minimal White",
    description: "純淨簡約配色",
    colors: {
        primary: "#374151",
        primaryLight: "#4b5563",
        primaryDark: "#1f2937",
        secondary: "#6b7280",
        accent: "#ef4444",
        
        bodyBg: "#fafafa",
        containerBg: "#ffffff",
        sectionBg: "#f9fafb",
        headerBg: "#1f2937",
        footerBg: "#f3f4f6",
        
        textPrimary: "#111827",
        textSecondary: "#4b5563",
        textMuted: "#9ca3af",
        textLight: "#ffffff",
        
        borderLight: "#e5e7eb",
        borderMedium: "#d1d5db",
        
        regionHk: "#374151",
        regionMo: "#6b7280",
        
        categoryA: "#10b981",
        categoryB: "#3b82f6",
        categoryC: "#f59e0b",
        categoryD: "#ef4444",
        
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#3b82f6",
        highlight: "#fef08a",
        
        tableHeaderBg: "#374151",
        tableHeaderText: "#ffffff",
        tableRowEven: "#f9fafb",
        tableRowHover: "#f3f4f6",
        tableTotalBg: "#ecfdf5",
        tableCarryBg: "#fffbeb",
        
        btnPrimaryBg: "#374151",
        btnPrimaryHover: "#1f2937",
        btnSecondaryBg: "#e5e7eb",
        btnSuccessBg: "#10b981",
        btnWarningBg: "#f59e0b",
        btnDangerBg: "#ef4444",
        btnInfoBg: "#3b82f6",
        
        scrollbarTrack: "#f3f4f6",
        scrollbarThumb: "#d1d5db",
        scrollbarThumbHover: "#9ca3af"
    }
};

// 莎莎粉主題（Sasa Brand Colors）
const THEME_SASA = {
    name: "莎莎粉",
    nameEn: "Sasa Pink",
    description: "莎莎品牌粉紅配色 ✓",
    colors: {
        // 主色調 - 莎莎品牌粉紅
        primary: "#E6007E",
        primaryLight: "#FF1493",
        primaryDark: "#C4006B",
        secondary: "#FF69B4",
        accent: "#FF8C00",
        
        // 背景色 - 粉紅漸變
        bodyBg: "linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)",
        containerBg: "#ffffff",
        sectionBg: "#FDF2F8",
        headerBg: "linear-gradient(135deg, #E6007E 0%, #FF1493 100%)",
        footerBg: "#FCE4EC",
        
        // 文字顏色
        textPrimary: "#2D2D2D",
        textSecondary: "#5D5D5D",
        textMuted: "#888888",
        textLight: "#ffffff",
        
        // 邊框顏色
        borderLight: "#F8BBD9",
        borderMedium: "#F48FB1",
        
        // 區域顏色
        regionHk: "#E6007E",
        regionMo: "#C71585",
        
        // 類別顏色
        categoryA: "#22C55E",
        categoryB: "#3B82F6",
        categoryC: "#F59E0B",
        categoryD: "#EF4444",
        
        // 狀態顏色
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
        highlight: "#FECDD3",
        
        // 表格顏色
        tableHeaderBg: "#E6007E",
        tableHeaderText: "#ffffff",
        tableRowEven: "#FDF2F8",
        tableRowHover: "#FCE7F3",
        tableTotalBg: "#DCFCE7",
        tableCarryBg: "#FEF3C7",
        
        // 按鈕顏色
        btnPrimaryBg: "#E6007E",
        btnPrimaryHover: "#C4006B",
        btnSecondaryBg: "#FBCFE8",
        btnSuccessBg: "#22C55E",
        btnWarningBg: "#F59E0B",
        btnDangerBg: "#EF4444",
        btnInfoBg: "#3B82F6",
        
        // 滾動條
        scrollbarTrack: "#FCE4EC",
        scrollbarThumb: "#F48FB1",
        scrollbarThumbHover: "#EC4899"
    }
};

// 所有可用的配色方案 - 只保留三款
const AVAILABLE_THEMES = {
    sasa: THEME_SASA,
    minimal: THEME_MINIMAL,
    dark: THEME_DARK
};

// 默認主題 - 極簡白為預設
const DEFAULT_THEME = "minimal";

// 導出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORES_CONFIG,
        SAFETY_STOCK_MATRIX,
        CATEGORY_DEFINITIONS,
        SIZE_DEFINITIONS,
        REGION_DEFINITIONS,
        DEFAULT_CALCULATION_CONFIG,
        AVAILABLE_THEMES,
        DEFAULT_THEME,
        THEME_SASA,
        THEME_CORPORATE,
        THEME_DARK,
        THEME_WARM,
        THEME_HIGH_CONTRAST,
        THEME_ELEGANT,
        THEME_MINIMAL,
        getStoreTypeCode,
        getSafetyStockValue,
        getStoreTypeSummary
    };
}
