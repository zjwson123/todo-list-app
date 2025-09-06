/**
 * 图表管理器
 * 统一管理图表创建、更新和销毁，与分析引擎对接
 */

import { ChartEngine } from './chartEngine.js';
import { TrendChart, CompletionBars, HeatMap, ProgressPie, InsightCards } from './chartTypes.js';
import { DataFormatter } from './chartUtils.js';

export class ChartManager {
    constructor() {
        this.charts = new Map();
        this.engines = new Map();
        this.containers = new Map();
    }
    
    /**
     * 初始化所有图表
     * @param {Object} analysisData - 来自AnalyticsEngine的分析数据
     * @param {Object} containerIds - 各个图表的容器ID映射
     */
    initializeCharts(analysisData, containerIds = {}) {
        const defaultContainers = {
            trend: 'trend-chart',
            completion: 'completion-bars',
            heatmap: 'heatmap-chart',
            progress: 'progress-pie',
            insights: 'insight-cards'
        };
        
        const containers = { ...defaultContainers, ...containerIds };
        
        // 创建效率趋势图
        if (containers.trend && analysisData.productivityTrend) {
            this.createTrendChart(containers.trend, analysisData.productivityTrend);
        }
        
        // 创建完成情况柱状图
        if (containers.completion && analysisData.timePeriodAnalysis) {
            this.createCompletionBars(containers.completion, analysisData.timePeriodAnalysis);
        }
        
        // 创建工作时段热力图
        if (containers.heatmap && analysisData.optimalWorkPeriods) {
            this.createHeatMap(containers.heatmap, analysisData.optimalWorkPeriods);
        }
        
        // 创建任务分类饼图
        if (containers.progress && analysisData.personalizedInsights) {
            this.createProgressPie(containers.progress, analysisData.personalizedInsights);
        }
        
        // 创建洞察卡片
        if (containers.insights && analysisData) {
            this.createInsightCards(containers.insights, analysisData);
        }
    }
    
    /**
     * 创建效率趋势折线图
     */
    createTrendChart(containerId, productivityData) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`趋势图容器 ${containerId} 不存在`);
                return null;
            }
            
            // 清理现有图表
            this.destroyChart(containerId);
            
            // 创建图表引擎
            const engine = new ChartEngine(container, {
                width: container.clientWidth || 800,
                height: 300,
                responsive: true,
                theme: 'auto',
                renderMode: 'canvas'
            });
            
            // 格式化数据
            const formattedData = DataFormatter.formatProductivityTrend(productivityData);
            
            // 创建图表实例
            const chart = new TrendChart(engine, formattedData, {
                showGrid: true,
                showPoints: true,
                smoothCurve: true,
                gradientFill: true,
                lineWidth: 3,
                showTooltip: true
            });
            
            // 渲染图表
            engine.render(chart);
            
            // 保存引用
            this.engines.set(containerId, engine);
            this.charts.set(containerId, chart);
            this.containers.set(containerId, container);
            
            // 添加容器标题和描述
            this.addChartHeader(container, '效率趋势', '显示您的任务完成效率随时间的变化趋势');
            
            return chart;
        } catch (error) {
            console.error('创建趋势图失败:', error);
            return null;
        }
    }
    
    /**
     * 创建完成情况柱状图
     */
    createCompletionBars(containerId, timePeriodData) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`柱状图容器 ${containerId} 不存在`);
                return null;
            }
            
            this.destroyChart(containerId);
            
            const engine = new ChartEngine(container, {
                width: container.clientWidth || 800,
                height: 350,
                responsive: true,
                theme: 'auto'
            });
            
            // 格式化数据
            const formattedData = DataFormatter.formatTimePeriodData(timePeriodData);
            
            const chart = new CompletionBars(engine, formattedData, {
                showGrid: true,
                showValues: true,
                barPadding: 0.1,
                groupPadding: 0.2,
                showTooltip: true
            });
            
            engine.render(chart);
            
            this.engines.set(containerId, engine);
            this.charts.set(containerId, chart);
            this.containers.set(containerId, container);
            
            this.addChartHeader(container, '完成情况对比', '不同时间段的任务完成情况统计');
            
            return chart;
        } catch (error) {
            console.error('创建柱状图失败:', error);
            return null;
        }
    }
    
    /**
     * 创建工作时段热力图
     */
    createHeatMap(containerId, optimalWorkData) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`热力图容器 ${containerId} 不存在`);
                return null;
            }
            
            this.destroyChart(containerId);
            
            const engine = new ChartEngine(container, {
                width: container.clientWidth || 800,
                height: 280,
                responsive: true,
                theme: 'auto'
            });
            
            // 格式化数据
            const formattedData = DataFormatter.formatHeatMapData(optimalWorkData);
            
            const chart = new HeatMap(engine, formattedData, {
                cellPadding: 2,
                showLabels: true,
                colorScale: this.getHeatMapColors(),
                showTooltip: true
            });
            
            engine.render(chart);
            
            this.engines.set(containerId, engine);
            this.charts.set(containerId, chart);
            this.containers.set(containerId, container);
            
            this.addChartHeader(container, '工作时段热力图', '显示一周内不同时段的工作活跃度');
            
            return chart;
        } catch (error) {
            console.error('创建热力图失败:', error);
            return null;
        }
    }
    
    /**
     * 创建任务分类饼图
     */
    createProgressPie(containerId, insightsData) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`饼图容器 ${containerId} 不存在`);
                return null;
            }
            
            this.destroyChart(containerId);
            
            const engine = new ChartEngine(container, {
                width: container.clientWidth || 400,
                height: 400,
                responsive: true,
                theme: 'auto'
            });
            
            // 格式化数据
            const formattedData = DataFormatter.formatPieData(insightsData);
            
            const chart = new ProgressPie(engine, formattedData, {
                innerRadius: 0,
                showLabels: true,
                showPercentages: true,
                labelOffset: 25,
                showTooltip: true
            });
            
            engine.render(chart);
            
            this.engines.set(containerId, engine);
            this.charts.set(containerId, chart);
            this.containers.set(containerId, container);
            
            this.addChartHeader(container, '任务分类分布', '显示不同类型任务的完成情况分布');
            
            return chart;
        } catch (error) {
            console.error('创建饼图失败:', error);
            return null;
        }
    }
    
    /**
     * 创建洞察卡片
     */
    createInsightCards(containerId, analysisData) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`洞察卡片容器 ${containerId} 不存在`);
                return null;
            }
            
            this.destroyChart(containerId);
            
            const engine = new ChartEngine(container, {
                width: container.clientWidth || 800,
                height: 200,
                responsive: true,
                theme: 'auto'
            });
            
            // 生成洞察卡片数据
            const cardsData = this.generateInsightCards(analysisData);
            
            const chart = new InsightCards(engine, cardsData, {
                cardPadding: 16,
                cardSpacing: 12,
                animateCards: true,
                showIcons: true
            });
            
            engine.render(chart);
            
            this.engines.set(containerId, engine);
            this.charts.set(containerId, chart);
            this.containers.set(containerId, container);
            
            // 洞察卡片不需要额外的标题，因为每个卡片都有自己的标题
            
            return chart;
        } catch (error) {
            console.error('创建洞察卡片失败:', error);
            return null;
        }
    }
    
    /**
     * 更新指定图表的数据
     */
    updateChart(containerId, newData) {
        const chart = this.charts.get(containerId);
        const engine = this.engines.get(containerId);
        
        if (chart && engine) {
            chart.data = newData;
            engine.render(chart);
        }
    }
    
    /**
     * 更新所有图表
     */
    updateAllCharts(analysisData) {
        // 更新趋势图
        if (this.charts.has('trend-chart') && analysisData.productivityTrend) {
            const formattedData = DataFormatter.formatProductivityTrend(analysisData.productivityTrend);
            this.updateChart('trend-chart', formattedData);
        }
        
        // 更新柱状图
        if (this.charts.has('completion-bars') && analysisData.timePeriodAnalysis) {
            const formattedData = DataFormatter.formatTimePeriodData(analysisData.timePeriodAnalysis);
            this.updateChart('completion-bars', formattedData);
        }
        
        // 更新热力图
        if (this.charts.has('heatmap-chart') && analysisData.optimalWorkPeriods) {
            const formattedData = DataFormatter.formatHeatMapData(analysisData.optimalWorkPeriods);
            this.updateChart('heatmap-chart', formattedData);
        }
        
        // 更新饼图
        if (this.charts.has('progress-pie') && analysisData.personalizedInsights) {
            const formattedData = DataFormatter.formatPieData(analysisData.personalizedInsights);
            this.updateChart('progress-pie', formattedData);
        }
        
        // 更新洞察卡片
        if (this.charts.has('insight-cards')) {
            const cardsData = this.generateInsightCards(analysisData);
            this.updateChart('insight-cards', cardsData);
        }
    }
    
    /**
     * 销毁指定图表
     */
    destroyChart(containerId) {
        const engine = this.engines.get(containerId);
        const chart = this.charts.get(containerId);
        
        if (chart) {
            chart.destroy();
            this.charts.delete(containerId);
        }
        
        if (engine) {
            engine.destroy();
            this.engines.delete(containerId);
        }
        
        this.containers.delete(containerId);
    }
    
    /**
     * 销毁所有图表
     */
    destroyAllCharts() {
        for (const containerId of this.charts.keys()) {
            this.destroyChart(containerId);
        }
    }
    
    /**
     * 导出图表为图片
     */
    async exportChart(containerId, format = 'png', quality = 0.9) {
        const engine = this.engines.get(containerId);
        if (engine) {
            return await engine.exportAsImage(format, quality);
        }
        return null;
    }
    
    /**
     * 生成洞察卡片数据
     */
    generateInsightCards(analysisData) {
        const cards = [];
        
        // 总任务数卡片
        if (analysisData.overview) {
            cards.push({
                title: '总任务数',
                value: analysisData.overview.totalTasks || 0,
                unit: '个',
                trend: this.calculateTrend(analysisData.overview.totalTasks, analysisData.overview.prevTotalTasks),
                description: '累计创建的任务总数'
            });
        }
        
        // 完成率卡片
        if (analysisData.overview) {
            const completionRate = ((analysisData.overview.completedTasks / analysisData.overview.totalTasks) * 100) || 0;
            cards.push({
                title: '完成率',
                value: completionRate.toFixed(1),
                unit: '%',
                trend: this.calculateTrend(completionRate, analysisData.overview.prevCompletionRate),
                description: '任务完成情况统计'
            });
        }
        
        // 生产力得分卡片
        if (analysisData.productivityTrend) {
            cards.push({
                title: '生产力得分',
                value: (analysisData.productivityTrend.weeklyAverage || 0).toFixed(1),
                unit: '分',
                trend: this.calculateTrend(analysisData.productivityTrend.weeklyAverage, analysisData.productivityTrend.prevWeeklyAverage),
                description: '基于完成效率的生产力评分'
            });
        }
        
        // 拖延指数卡片
        if (analysisData.procrastinationAnalysis) {
            const procrastinationScore = analysisData.procrastinationAnalysis.overallScore || 0;
            cards.push({
                title: '拖延指数',
                value: procrastinationScore.toFixed(1),
                unit: '分',
                trend: this.calculateTrend(procrastinationScore, analysisData.procrastinationAnalysis.prevScore, true),
                description: '数值越低表示拖延程度越轻'
            });
        }
        
        return cards;
    }
    
    /**
     * 计算趋势方向和变化值
     */
    calculateTrend(current, previous, invert = false) {
        if (previous === undefined || previous === null || current === undefined || current === null) {
            return { direction: 'neutral', value: '-- ' };
        }
        
        const change = current - previous;
        const percentChange = previous !== 0 ? Math.abs(change / previous * 100) : 0;
        
        let direction = 'neutral';
        if (Math.abs(change) > 0.1) {
            if (invert) {
                direction = change < 0 ? 'up' : 'down'; // 对于拖延指数，降低是好的
            } else {
                direction = change > 0 ? 'up' : 'down';
            }
        }
        
        return {
            direction,
            value: `${percentChange.toFixed(1)}%`
        };
    }
    
    /**
     * 获取热力图颜色配置
     */
    getHeatMapColors() {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (isDark) {
            return ['#1e293b', '#0ea5e9']; // 深色主题
        } else {
            return ['#f0f9ff', '#0ea5e9']; // 浅色主题
        }
    }
    
    /**
     * 添加图表标题和描述
     */
    addChartHeader(container, title, description) {
        // 检查是否已经存在标题
        let header = container.querySelector('.chart-header');
        if (!header) {
            header = document.createElement('div');
            header.className = 'chart-header';
            container.insertBefore(header, container.firstChild);
        }
        
        header.innerHTML = `
            <h3 class="chart-title">
                <span class="chart-title-icon">📊</span>
                ${title}
            </h3>
            <p class="chart-description">${description}</p>
        `;
    }
    
    /**
     * 获取图表实例
     */
    getChart(containerId) {
        return this.charts.get(containerId);
    }
    
    /**
     * 获取图表引擎
     */
    getEngine(containerId) {
        return this.engines.get(containerId);
    }
    
    /**
     * 检查图表是否存在
     */
    hasChart(containerId) {
        return this.charts.has(containerId);
    }
    
    /**
     * 获取所有图表ID
     */
    getChartIds() {
        return Array.from(this.charts.keys());
    }
}