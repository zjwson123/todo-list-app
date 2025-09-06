/**
 * 数据分析引擎模块
 * 为Todo应用提供深度数据分析功能
 */

import { MetricsCalculator, METRICS_CONSTANTS } from './metricsCalculator.js';
import { TimeUtils, TIME_CONSTANTS } from './timeUtils.js';

export class AnalyticsEngine {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5分钟缓存
    }
    
    /**
     * 生成完整的分析报告
     * @param {Array} todos - Todo数组
     * @param {Object} options - 分析选项
     * @returns {Object} 完整的分析报告
     */
    generateAnalysisReport(todos, options = {}) {
        const {
            includePeriods = ['day', 'week', 'month'],
            periodCount = 7,
            includeInsights = true,
            includeRecommendations = true
        } = options;
        
        const cacheKey = this.generateCacheKey('fullReport', { todos, options });
        
        // 检查缓存
        if (this.getCachedResult(cacheKey)) {
            return this.getCachedResult(cacheKey);
        }
        
        const report = {
            metadata: {
                generatedAt: new Date().toISOString(),
                totalTodos: todos.length,
                analysisOptions: options
            },
            overview: this.generateOverview(todos),
            timePeriodAnalysis: {},
            productivityTrend: MetricsCalculator.calculateProductivityTrend(todos),
            procrastinationAnalysis: MetricsCalculator.calculateProcrastinationMetrics(todos),
            optimalWorkPeriods: MetricsCalculator.calculateOptimalWorkPeriods(todos),
            personalizedInsights: includeInsights ? MetricsCalculator.calculatePersonalizedInsights(todos) : null,
            recommendations: includeRecommendations ? this.generateRecommendations(todos) : null
        };
        
        // 生成各时间维度的分析
        includePeriods.forEach(period => {
            report.timePeriodAnalysis[period] = MetricsCalculator.calculateTimePeriodStats(
                todos, 
                period, 
                periodCount
            );
        });
        
        // 缓存结果
        this.setCachedResult(cacheKey, report);
        
        return report;
    }
    
    /**
     * 生成概览统计
     * @param {Array} todos - Todo数组
     * @returns {Object} 概览数据
     */
    generateOverview(todos) {
        const basicStats = MetricsCalculator.calculateCompletionRate(todos);
        const now = new Date();
        
        // 今日统计
        const todayRange = {
            start: TimeUtils.getStartOfDay(now),
            end: TimeUtils.getEndOfDay(now)
        };
        const todayStats = MetricsCalculator.calculateCompletionRate(todos, todayRange);
        
        // 本周统计
        const weekRange = TimeUtils.thisWeekRange();
        const weekStats = MetricsCalculator.calculateCompletionRate(todos, weekRange);
        
        // 本月统计
        const monthRange = TimeUtils.thisMonthRange();
        const monthStats = MetricsCalculator.calculateCompletionRate(todos, monthRange);
        
        return {
            overall: {
                ...basicStats,
                createdToday: todayStats.total,
                completedToday: todayStats.completed
            },
            periods: {
                today: todayStats,
                thisWeek: weekStats,
                thisMonth: monthStats
            },
            milestones: this.calculateMilestones(todos)
        };
    }
    
    /**
     * 计算里程碑成就
     * @param {Array} todos - Todo数组
     * @returns {Array} 里程碑列表
     */
    calculateMilestones(todos) {
        const milestones = [];
        const completedCount = todos.filter(todo => todo.completed).length;
        const totalCount = todos.length;
        
        // 完成数量里程碑
        const completionMilestones = [1, 5, 10, 25, 50, 100, 200, 500, 1000];
        const nextCompletionMilestone = completionMilestones.find(m => m > completedCount);
        
        if (nextCompletionMilestone) {
            milestones.push({
                type: 'completion_count',
                current: completedCount,
                target: nextCompletionMilestone,
                progress: Math.round((completedCount / nextCompletionMilestone) * 100),
                description: `距离完成${nextCompletionMilestone}个任务还差${nextCompletionMilestone - completedCount}个`
            });
        }
        
        // 完成率里程碑
        if (totalCount >= 10) {
            const completionRate = completedCount / totalCount;
            const rateTargets = [0.5, 0.75, 0.9, 0.95];
            const nextRateTarget = rateTargets.find(r => r > completionRate);
            
            if (nextRateTarget) {
                const neededCompletions = Math.ceil(nextRateTarget * totalCount) - completedCount;
                milestones.push({
                    type: 'completion_rate',
                    current: Math.round(completionRate * 100),
                    target: Math.round(nextRateTarget * 100),
                    progress: Math.round((completionRate / nextRateTarget) * 100),
                    description: `距离${Math.round(nextRateTarget * 100)}%完成率还需完成${neededCompletions}个任务`
                });
            }
        }
        
        return milestones;
    }
    
    /**
     * 生成智能推荐建议
     * @param {Array} todos - Todo数组
     * @returns {Object} 推荐建议
     */
    generateRecommendations(todos) {
        const recommendations = {
            immediate: [], // 立即行动建议
            strategic: [], // 策略性建议
            optimization: [] // 优化建议
        };
        
        const procrastinationMetrics = MetricsCalculator.calculateProcrastinationMetrics(todos);
        const workPeriods = MetricsCalculator.calculateOptimalWorkPeriods(todos);
        const productivityTrend = MetricsCalculator.calculateProductivityTrend(todos);
        
        // 基于拖延情况的建议
        if (procrastinationMetrics.procrastinationLevel === 'very_high') {
            recommendations.immediate.push({
                priority: 'high',
                category: 'procrastination',
                title: '紧急处理积压任务',
                description: `您有${procrastinationMetrics.longTermDelayed}个长期拖延任务需要立即处理`,
                actions: [
                    '选择1-2个最重要的积压任务',
                    '设定今日必须完成的最小目标',
                    '消除所有干扰因素'
                ]
            });
        } else if (procrastinationMetrics.delayedTasks > 0) {
            recommendations.strategic.push({
                priority: 'medium',
                category: 'procrastination',
                title: '改善任务完成效率',
                description: `有${procrastinationMetrics.delayedTasks}个任务存在拖延，建议优化工作方法`,
                actions: procrastinationMetrics.recommendations
            });
        }
        
        // 基于工作时段的建议
        if (workPeriods.bestTimeSlot.total > 0) {
            recommendations.optimization.push({
                priority: 'medium',
                category: 'scheduling',
                title: '优化任务安排时间',
                description: `您在${workPeriods.bestTimeSlot.label}效率最高`,
                actions: workPeriods.recommendations
            });
        }
        
        // 基于生产力趋势的建议
        if (productivityTrend.trend === 'decreasing') {
            recommendations.strategic.push({
                priority: 'high',
                category: 'productivity',
                title: '提升生产力趋势',
                description: productivityTrend.description,
                actions: [
                    '分析最近生产力下降的原因',
                    '重新评估任务优先级',
                    '考虑调整工作方法或环境',
                    '设定更现实的日常目标'
                ]
            });
        } else if (productivityTrend.trend === 'increasing') {
            recommendations.optimization.push({
                priority: 'low',
                category: 'productivity',
                title: '保持良好势头',
                description: productivityTrend.description,
                actions: [
                    '继续保持当前的工作节奏',
                    '可以尝试挑战更多任务',
                    '记录成功的工作模式'
                ]
            });
        }
        
        // 任务管理建议
        const overview = this.generateOverview(todos);
        if (overview.overall.total > 0) {
            const pendingRatio = overview.overall.pending / overview.overall.total;
            
            if (pendingRatio > 0.7) {
                recommendations.immediate.push({
                    priority: 'high',
                    category: 'task_management',
                    title: '清理待办任务',
                    description: `您有${overview.overall.pending}个待办任务，建议进行整理`,
                    actions: [
                        '删除不再需要的任务',
                        '将大任务分解为小任务',
                        '重新设定任务优先级'
                    ]
                });
            }
        }
        
        // 创建时间建议
        if (overview.periods.today.total === 0 && todos.length > 0) {
            recommendations.immediate.push({
                priority: 'medium',
                category: 'daily_planning',
                title: '制定今日计划',
                description: '今天还没有创建新任务，建议规划今日工作',
                actions: [
                    '回顾昨日未完成的任务',
                    '设定今日最重要的3个目标',
                    '创建具体可执行的任务'
                ]
            });
        }
        
        return recommendations;
    }
    
    /**
     * 获取特定时期的详细分析
     * @param {Array} todos - Todo数组
     * @param {Date} startDate - 开始日期
     * @param {Date} endDate - 结束日期
     * @returns {Object} 时期分析结果
     */
    getPeriodAnalysis(todos, startDate, endDate) {
        const cacheKey = this.generateCacheKey('periodAnalysis', { 
            todosLength: todos.length, 
            startDate, 
            endDate 
        });
        
        if (this.getCachedResult(cacheKey)) {
            return this.getCachedResult(cacheKey);
        }
        
        const filteredTodos = todos.filter(todo => {
            const createTime = new Date(todo.createTime);
            return createTime >= startDate && createTime <= endDate;
        });
        
        const analysis = {
            period: {
                start: TimeUtils.formatDate(startDate),
                end: TimeUtils.formatDate(endDate),
                duration: TimeUtils.getDaysDifference(startDate, endDate) + 1
            },
            overview: MetricsCalculator.calculateCompletionRate(filteredTodos),
            dailyBreakdown: this.getDailyBreakdown(filteredTodos, startDate, endDate),
            workPatterns: this.analyzeWorkPatterns(filteredTodos),
            comparisons: this.generatePeriodComparisons(todos, filteredTodos, startDate, endDate)
        };
        
        this.setCachedResult(cacheKey, analysis);
        return analysis;
    }
    
    /**
     * 获取每日明细数据
     * @param {Array} todos - 筛选后的Todo数组
     * @param {Date} startDate - 开始日期
     * @param {Date} endDate - 结束日期
     * @returns {Array} 每日数据
     */
    getDailyBreakdown(todos, startDate, endDate) {
        const dailyData = [];
        const dateRange = TimeUtils.getDateRange(startDate, endDate, 'day');
        
        dateRange.forEach(date => {
            const dayStart = TimeUtils.getStartOfDay(date);
            const dayEnd = TimeUtils.getEndOfDay(date);
            
            const dayTodos = todos.filter(todo => {
                const createTime = new Date(todo.createTime);
                return createTime >= dayStart && createTime <= dayEnd;
            });
            
            const completedTodos = todos.filter(todo => {
                if (!todo.completed || !todo.updateTime) return false;
                const completeTime = new Date(todo.updateTime);
                return completeTime >= dayStart && completeTime <= dayEnd;
            });
            
            dailyData.push({
                date: TimeUtils.formatDate(date),
                dayOfWeek: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
                isWeekend: TimeUtils.isWeekend(date),
                created: dayTodos.length,
                completed: completedTodos.length,
                todoDetails: dayTodos.map(todo => ({
                    id: todo.id,
                    title: todo.title,
                    completed: todo.completed,
                    createTime: todo.createTime
                }))
            });
        });
        
        return dailyData;
    }
    
    /**
     * 分析工作模式
     * @param {Array} todos - Todo数组
     * @returns {Object} 工作模式分析
     */
    analyzeWorkPatterns(todos) {
        const hourlyDistribution = new Array(24).fill(0);
        const weeklyDistribution = new Array(7).fill(0);
        
        todos.forEach(todo => {
            const createTime = new Date(todo.createTime);
            hourlyDistribution[createTime.getHours()]++;
            weeklyDistribution[createTime.getDay()]++;
        });
        
        // 找出活跃时段
        const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
        const peakDay = weeklyDistribution.indexOf(Math.max(...weeklyDistribution));
        
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        
        return {
            hourlyDistribution: hourlyDistribution.map((count, hour) => ({
                hour,
                count,
                percentage: todos.length > 0 ? Math.round((count / todos.length) * 100) : 0
            })),
            weeklyDistribution: weeklyDistribution.map((count, day) => ({
                day,
                dayName: dayNames[day],
                count,
                percentage: todos.length > 0 ? Math.round((count / todos.length) * 100) : 0
            })),
            peakHour: {
                hour: peakHour,
                count: hourlyDistribution[peakHour],
                timeSlot: TimeUtils.getTimeSlot(new Date(0, 0, 0, peakHour))
            },
            peakDay: {
                day: peakDay,
                name: dayNames[peakDay],
                count: weeklyDistribution[peakDay]
            }
        };
    }
    
    /**
     * 生成时期对比数据
     * @param {Array} allTodos - 所有Todo数据
     * @param {Array} periodTodos - 当期Todo数据
     * @param {Date} startDate - 开始日期
     * @param {Date} endDate - 结束日期
     * @returns {Object} 对比数据
     */
    generatePeriodComparisons(allTodos, periodTodos, startDate, endDate) {
        const periodDays = TimeUtils.getDaysDifference(startDate, endDate) + 1;
        
        // 计算前一个相同时长的时期
        const previousStart = new Date(startDate);
        previousStart.setDate(previousStart.getDate() - periodDays);
        const previousEnd = new Date(endDate);
        previousEnd.setDate(previousEnd.getDate() - periodDays);
        
        const previousTodos = allTodos.filter(todo => {
            const createTime = new Date(todo.createTime);
            return createTime >= previousStart && createTime <= previousEnd;
        });
        
        const currentStats = MetricsCalculator.calculateCompletionRate(periodTodos);
        const previousStats = MetricsCalculator.calculateCompletionRate(previousTodos);
        
        return {
            previous: {
                period: {
                    start: TimeUtils.formatDate(previousStart),
                    end: TimeUtils.formatDate(previousEnd)
                },
                stats: previousStats
            },
            changes: {
                totalTasks: currentStats.total - previousStats.total,
                completedTasks: currentStats.completed - previousStats.completed,
                completionRate: currentStats.completionRate - previousStats.completionRate,
                trend: this.calculateTrend(currentStats, previousStats)
            }
        };
    }
    
    /**
     * 计算趋势方向
     * @private
     */
    calculateTrend(current, previous) {
        const completionChange = current.completionRate - previous.completionRate;
        const volumeChange = current.total - previous.total;
        
        if (Math.abs(completionChange) <= 5 && Math.abs(volumeChange) <= 1) {
            return 'stable';
        }
        
        if (completionChange > 5 || (completionChange >= 0 && volumeChange > 0)) {
            return 'improving';
        }
        
        if (completionChange < -5 || (completionChange <= 0 && volumeChange < 0)) {
            return 'declining';
        }
        
        return 'mixed';
    }
    
    /**
     * 获取实时统计数据
     * @param {Array} todos - Todo数组
     * @returns {Object} 实时统计
     */
    getRealTimeStats(todos) {
        const now = new Date();
        
        return {
            timestamp: now.toISOString(),
            overview: MetricsCalculator.calculateCompletionRate(todos),
            today: MetricsCalculator.calculateCompletionRate(todos, {
                start: TimeUtils.getStartOfDay(now),
                end: TimeUtils.getEndOfDay(now)
            }),
            thisWeek: MetricsCalculator.calculateCompletionRate(todos, TimeUtils.thisWeekRange()),
            recentActivity: this.getRecentActivity(todos),
            quickInsights: this.generateQuickInsights(todos)
        };
    }
    
    /**
     * 获取最近活动
     * @param {Array} todos - Todo数组
     * @returns {Array} 最近活动列表
     */
    getRecentActivity(todos) {
        const activities = [];
        const now = new Date();
        const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // 最近创建的任务
        const recentCreated = todos
            .filter(todo => new Date(todo.createTime) >= past24Hours)
            .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
            .slice(0, 5);
            
        recentCreated.forEach(todo => {
            activities.push({
                type: 'created',
                timestamp: todo.createTime,
                description: `创建任务: ${todo.title}`,
                relativeTime: TimeUtils.getRelativeTime(todo.createTime)
            });
        });
        
        // 最近完成的任务
        const recentCompleted = todos
            .filter(todo => todo.completed && todo.updateTime && new Date(todo.updateTime) >= past24Hours)
            .sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime))
            .slice(0, 5);
            
        recentCompleted.forEach(todo => {
            activities.push({
                type: 'completed',
                timestamp: todo.updateTime,
                description: `完成任务: ${todo.title}`,
                relativeTime: TimeUtils.getRelativeTime(todo.updateTime)
            });
        });
        
        return activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
    }
    
    /**
     * 生成快速洞察
     * @param {Array} todos - Todo数组
     * @returns {Array} 快速洞察列表
     */
    generateQuickInsights(todos) {
        const insights = [];
        const now = new Date();
        
        // 今日表现
        const todayStats = MetricsCalculator.calculateCompletionRate(todos, {
            start: TimeUtils.getStartOfDay(now),
            end: TimeUtils.getEndOfDay(now)
        });
        
        if (todayStats.completed > 0) {
            insights.push({
                type: 'achievement',
                icon: '✅',
                message: `今天已完成 ${todayStats.completed} 个任务，继续保持！`
            });
        }
        
        // 拖延提醒
        const procrastination = MetricsCalculator.calculateProcrastinationMetrics(todos);
        if (procrastination.longTermDelayed > 0) {
            insights.push({
                type: 'warning',
                icon: '⏰',
                message: `有 ${procrastination.longTermDelayed} 个任务拖延超过7天，建议优先处理`
            });
        }
        
        // 工作时段建议
        const workPeriods = MetricsCalculator.calculateOptimalWorkPeriods(todos);
        if (workPeriods.bestTimeSlot.total > 0) {
            const currentHour = now.getHours();
            const bestSlot = workPeriods.bestTimeSlot.timeSlot;
            const currentSlot = TimeUtils.getTimeSlot(now);
            
            if (currentSlot === bestSlot) {
                insights.push({
                    type: 'tip',
                    icon: '💡',
                    message: '现在正是您的高效时段，适合处理重要任务！'
                });
            }
        }
        
        return insights;
    }
    
    /**
     * 导出分析数据
     * @param {Object} analysisData - 分析数据
     * @param {string} format - 导出格式 'json' | 'csv' | 'summary'
     * @returns {string} 导出内容
     */
    exportAnalysisData(analysisData, format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(analysisData, null, 2);
                
            case 'csv':
                return this.convertToCSV(analysisData);
                
            case 'summary':
                return this.generateTextSummary(analysisData);
                
            default:
                throw new Error(`不支持的导出格式: ${format}`);
        }
    }
    
    /**
     * 转换为CSV格式
     * @private
     */
    convertToCSV(data) {
        // 简化版CSV导出，主要导出时间序列数据
        const rows = ['日期,创建任务数,完成任务数,完成率'];
        
        if (data.timePeriodAnalysis && data.timePeriodAnalysis.day) {
            data.timePeriodAnalysis.day.forEach(period => {
                rows.push(`${period.label},${period.total},${period.completed},${period.completionRate}%`);
            });
        }
        
        return rows.join('\n');
    }
    
    /**
     * 生成文本摘要
     * @private
     */
    generateTextSummary(data) {
        const lines = [];
        lines.push('=== Todo 数据分析报告 ===');
        lines.push(`生成时间: ${new Date(data.metadata.generatedAt).toLocaleString()}`);
        lines.push('');
        
        // 概览
        if (data.overview) {
            lines.push('【总体概览】');
            const { overall } = data.overview;
            lines.push(`总任务数: ${overall.total}`);
            lines.push(`已完成: ${overall.completed} (${overall.completionRate}%)`);
            lines.push(`待完成: ${overall.pending} (${overall.pendingRate}%)`);
            lines.push('');
        }
        
        // 生产力趋势
        if (data.productivityTrend) {
            lines.push('【生产力趋势】');
            lines.push(data.productivityTrend.description);
            lines.push(`平均每日完成: ${data.productivityTrend.dailyAverage} 个任务`);
            lines.push('');
        }
        
        // 拖延分析
        if (data.procrastinationAnalysis) {
            const proc = data.procrastinationAnalysis;
            lines.push('【拖延情况】');
            lines.push(`拖延等级: ${proc.procrastinationLevel}`);
            lines.push(`拖延任务: ${proc.delayedTasks} 个`);
            lines.push(`长期拖延: ${proc.longTermDelayed} 个`);
            lines.push('');
        }
        
        // 推荐建议
        if (data.recommendations) {
            lines.push('【推荐建议】');
            data.recommendations.immediate.forEach(rec => {
                lines.push(`• ${rec.title}: ${rec.description}`);
            });
            lines.push('');
        }
        
        return lines.join('\n');
    }
    
    // 缓存管理方法
    generateCacheKey(prefix, data) {
        return `${prefix}_${JSON.stringify(data).slice(0, 50)}_${Date.now()}`;
    }
    
    setCachedResult(key, data) {
        this.cache.set(key, data);
        this.cacheExpiry.set(key, Date.now() + this.cacheDuration);
    }
    
    getCachedResult(key) {
        const expiry = this.cacheExpiry.get(key);
        if (expiry && Date.now() < expiry) {
            return this.cache.get(key);
        }
        
        // 清理过期缓存
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
        return null;
    }
    
    clearCache() {
        this.cache.clear();
        this.cacheExpiry.clear();
    }
}

// 导出单例实例
export const analyticsEngine = new AnalyticsEngine();

// 导出分析常量
export const ANALYTICS_CONSTANTS = {
    CACHE_DURATION: 5 * 60 * 1000, // 5分钟
    EXPORT_FORMATS: {
        JSON: 'json',
        CSV: 'csv', 
        SUMMARY: 'summary'
    },
    RECOMMENDATION_PRIORITIES: {
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low'
    },
    TREND_TYPES: {
        IMPROVING: 'improving',
        DECLINING: 'declining',
        STABLE: 'stable',
        MIXED: 'mixed'
    }
};