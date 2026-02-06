// ==================== 高級功能擴展 ====================
// 此文件包含可選的高級功能，可根據需要啟用

class AdvancedCalculator {
    constructor(calculator) {
        this.calc = calculator;
    }

    // ==================== 多個計算公式支持 ====================
    
    /**
     * 公式1: 基本 Safety Stock 公式
     * SS = Z * σ * √L
     */
    calculateBasicSafetyStock(params) {
        const z = params.service_level || 1.65;
        const dailyDemand = params.average_daily_demand || 50;
        const cv = params.demand_variability || 1.5;
        const sigma = dailyDemand * cv;
        const leadTime = Math.sqrt(params.lead_time || 14);
        return Math.ceil(z * sigma * leadTime);
    }

    /**
     * 公式2: ABC分析基礎的 Safety Stock
     * 根據商品 ABC 等級調整 Safety Stock
     */
    calculateABCSafetyStock(params, storeLevel) {
        const baseStock = this.calculateBasicSafetyStock(params);
        
        // 根據店鋪等級調整係數
        const adjustmentFactors = {
            'A': 1.2,    // A 級店鋪增加 20%
            'B': 1.0,    // B 級店鋪保持不變
            'C': 0.8,    // C 級店鋪減少 20%
            'D': 0.6     // D 級店鋪減少 40%
        };
        
        const factor = adjustmentFactors[storeLevel] || 1.0;
        return Math.ceil(baseStock * factor);
    }

    /**
     * 公式3: 基於點頻率的 Safety Stock
     * 適用於低頻率、高價值商品
     */
    calculatePointFrequencySafetyStock(params) {
        const demandPerPeriod = params.average_daily_demand * 7; // 週需求
        const z = params.service_level || 1.65;
        const cv = params.demand_variability || 1.5;
        const leadTimeWeeks = Math.ceil((params.lead_time || 14) / 7);
        
        return Math.ceil(z * Math.sqrt(demandPerPeriod) * cv * leadTimeWeeks);
    }

    /**
     * 公式4: 最大-最小法則
     * 最大庫存 = 平均日需求 * (前置時間 + 訂單週期) + Safety Stock
     */
    calculateMinMaxMethod(params) {
        const avgDailyDemand = params.average_daily_demand || 50;
        const leadTime = params.lead_time || 14;
        const orderCycle = params.order_cycle || 7; // 訂單週期
        const safetyStock = this.calculateBasicSafetyStock(params);
        
        const maxStock = Math.ceil(avgDailyDemand * (leadTime + orderCycle) + safetyStock);
        const minStock = Math.ceil(avgDailyDemand * leadTime);
        
        return {
            max: maxStock,
            min: minStock,
            safetyStock: safetyStock
        };
    }

    // ==================== 季節性調整 ====================
    
    /**
     * 根據季節性因素調整 Safety Stock
     * 淡季減少、旺季增加
     */
    adjustForSeasonality(baseStock, seasonalFactor = 1.0) {
        // 季節性因素範圍：0.5 (最低) 至 2.0 (最高)
        if (seasonalFactor < 0.5 || seasonalFactor > 2.0) {
            console.warn('季節性因素應在 0.5 至 2.0 之間');
            seasonalFactor = Math.max(0.5, Math.min(2.0, seasonalFactor));
        }
        return Math.ceil(baseStock * seasonalFactor);
    }

    // ==================== 店鋪規模調整 ====================
    
    /**
     * 根據店鋪規模調整 Safety Stock
     */
    adjustForStoreSize(baseStock, storeSize) {
        const sizeFactors = {
            'XS': 0.6,   // 超小型
            'S': 0.8,    // 小型
            'M': 1.0,    // 中型（基準）
            'L': 1.3,    // 大型
            'XL': 1.6    // 超大型
        };
        
        const factor = sizeFactors[storeSize] || 1.0;
        return Math.ceil(baseStock * factor);
    }

    // ==================== 成本分析 ====================
    
    /**
     * 計算庫存持有成本
     */
    calculateHoldingCost(averageStock, unitCost, holdingCostRate) {
        // 持有成本率通常為單位成本的 20-30%
        return averageStock * unitCost * holdingCostRate;
    }

    /**
     * 計算缺貨成本
     */
    calculateStockoutCost(demandLost, profitPerUnit) {
        return demandLost * profitPerUnit;
    }

    /**
     * 計算訂單成本
     */
    calculateOrderingCost(numberOfOrders, costPerOrder) {
        return numberOfOrders * costPerOrder;
    }

    /**
     * 計算總庫存成本
     */
    calculateTotalInventoryCost(params) {
        const averageStock = params.average_daily_demand * params.lead_time;
        const holdingCost = this.calculateHoldingCost(
            averageStock,
            params.unit_cost || 100,
            params.holding_cost_rate || 0.25
        );
        
        const annualDemand = params.average_daily_demand * 365;
        const orderSize = params.economic_order_quantity || 100;
        const numberOfOrders = Math.ceil(annualDemand / orderSize);
        const orderingCost = this.calculateOrderingCost(
            numberOfOrders,
            params.cost_per_order || 50
        );
        
        return {
            holdingCost: Math.ceil(holdingCost),
            orderingCost: Math.ceil(orderingCost),
            totalCost: Math.ceil(holdingCost + orderingCost)
        };
    }

    // ==================== 數據分析和統計 ====================
    
    /**
     * 計算統計信息
     */
    calculateStatistics(results) {
        if (results.length === 0) return null;
        
        const stocks = results.map(r => r.calculatedStock);
        
        const sum = stocks.reduce((a, b) => a + b, 0);
        const average = sum / stocks.length;
        const min = Math.min(...stocks);
        const max = Math.max(...stocks);
        
        // 標準差
        const variance = stocks.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / stocks.length;
        const stdDev = Math.sqrt(variance);
        
        // 中位數
        const sorted = [...stocks].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0 
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        
        return {
            average: Math.ceil(average),
            min: min,
            max: max,
            median: median,
            stdDev: Math.ceil(stdDev),
            total: sum,
            count: stocks.length
        };
    }

    /**
     * 按類別分組統計
     */
    groupStatistics(results, groupBy = 'size') {
        const groups = {};
        
        results.forEach(result => {
            const key = result[groupBy];
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(result.calculatedStock);
        });
        
        const stats = {};
        Object.keys(groups).forEach(key => {
            const stocks = groups[key];
            const sum = stocks.reduce((a, b) => a + b, 0);
            stats[key] = {
                count: stocks.length,
                total: sum,
                average: Math.ceil(sum / stocks.length),
                min: Math.min(...stocks),
                max: Math.max(...stocks)
            };
        });
        
        return stats;
    }

    // ==================== 異常檢測 ====================
    
    /**
     * 檢測異常的 Safety Stock 值
     * 返回超出正常範圍的店鋪
     */
    detectAnomalies(results, threshold = 1.5) {
        const stats = this.calculateStatistics(results);
        if (!stats) return [];
        
        const lower = stats.average - (threshold * stats.stdDev);
        const upper = stats.average + (threshold * stats.stdDev);
        
        return results.filter(r => r.calculatedStock < lower || r.calculatedStock > upper);
    }

    // ==================== 導出增強功能 ====================
    
    /**
     * 導出為多種格式
     */
    exportToJSON(results, parameters) {
        return JSON.stringify({
            exportDate: new Date().toISOString(),
            parameters: parameters,
            results: results,
            statistics: this.calculateStatistics(results),
            groupStats: this.groupStatistics(results)
        }, null, 2);
    }

    /**
     * 導出為 HTML 表格（用於打印）
     */
    exportToHTML(results, parameters) {
        const stats = this.calculateStatistics(results);
        const groupStats = this.groupStatistics(results);
        
        let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Safety Stock 報告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #667eea; color: white; }
        tr:nth-child(even) { background: #f5f5f5; }
        .stats { margin: 20px 0; padding: 15px; background: #f0f4ff; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Safety Stock 計算報告</h1>
    <p>生成日期：${new Date().toLocaleString('zh-TW')}</p>
    
    <h2>計算參數</h2>
    <div class="stats">
        <p>前置時間：${parameters.lead_time} 天</p>
        <p>需求變異系數：${parameters.demand_variability.toFixed(2)}</p>
        <p>服務水準：${parameters.service_level.toFixed(2)} (Z值)</p>
        <p>平均日需求：${parameters.average_daily_demand} 件</p>
    </div>
    
    <h2>統計摘要</h2>
    <div class="stats">
        <p>總店鋪數：${stats.count}</p>
        <p>總庫存需求：${stats.total} 件</p>
        <p>平均每店：${stats.average} 件</p>
        <p>最小值：${stats.min} 件 | 最大值：${stats.max} 件</p>
        <p>中位數：${stats.median} 件 | 標準差：${stats.stdDev}</p>
    </div>
    
    <h2>按規模分類統計</h2>
    <table>
        <tr><th>規模</th><th>店數</th><th>總需求</th><th>平均</th><th>最小</th><th>最大</th></tr>
        ${Object.entries(groupStats).map(([size, data]) => `
            <tr>
                <td>${size}</td>
                <td>${data.count}</td>
                <td>${data.total}</td>
                <td>${data.average}</td>
                <td>${data.min}</td>
                <td>${data.max}</td>
            </tr>
        `).join('')}
    </table>
    
    <h2>詳細結果</h2>
    <table>
        <tr>
            <th>店鋪</th>
            <th>規模</th>
            <th>等級</th>
            <th>計算庫存</th>
        </tr>
        ${results.map(r => `
            <tr>
                <td>${r.store}</td>
                <td>${r.size}</td>
                <td>${r.level}</td>
                <td>${r.calculatedStock}</td>
            </tr>
        `).join('')}
    </table>
</body>
</html>
        `;
        return html;
    }

    // ==================== 預測和優化 ====================
    
    /**
     * 基於歷史數據預測所需 Safety Stock
     */
    predictOptimalSafetyStock(historicalData) {
        if (!historicalData || historicalData.length === 0) {
            return null;
        }
        
        // 簡單的移動平均預測
        const avg = historicalData.reduce((a, b) => a + b, 0) / historicalData.length;
        const variance = historicalData.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / historicalData.length;
        
        return {
            predicted: Math.ceil(avg),
            variance: Math.ceil(variance),
            confidence: 'medium'
        };
    }
}

// 導出高級計算器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedCalculator;
}
