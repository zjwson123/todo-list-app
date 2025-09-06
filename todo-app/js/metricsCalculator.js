/**
 * 指标计算器模块
 * 提供各种数据分析指标的计算功能
 */

import { TimeUtils, TIME_CONSTANTS } from './timeUtils.js';

export class MetricsCalculator {
    
    /**
     * 计算完成率指标
     * @param {Array} todos - Todo数组
     * @param {Object} timeRange - 时间范围 {start, end}
     * @returns {Object} 完成率相关指标
     */
    static calculateCompletionRate(todos, timeRange = null) {
        const filteredTodos = timeRange 
            ? todos.filter(todo => {
                const createTime = new Date(todo.createTime);
                return createTime >= timeRange.start && createTime <= timeRange.end;
            })
            : todos;
            
        const total = filteredTodos.length;
        if (total === 0) {
            return {
                total: 0,
                completed: 0,
                pending: 0,
                completionRate: 0,
                pendingRate: 0
            };
        }
        
        const completed = filteredTodos.filter(todo => todo.completed).length;
        const pending = total - completed;
        
        return {
            total,
            completed,
            pending,
            completionRate: Math.round((completed / total) * 100),
            pendingRate: Math.round((pending / total) * 100)
        };
    }
    
    /**
     * 计算时间维度的统计数据
     * @param {Array} todos - Todo数组
     * @param {string} period - 统计周期 'day' | 'week' | 'month'
     * @param {number} periodCount - 统计的周期数量
     * @returns {Array} 每个周期的统计数据
     */
    static calculateTimePeriodStats(todos, period = 'day', periodCount = 7) {
        const now = new Date();
        const periods = [];
        
        for (let i = 0; i < periodCount; i++) {
            let periodStart, periodEnd, label;
            
            switch (period) {
                case 'day':
                    periodStart = new Date(now);
                    periodStart.setDate(now.getDate() - i);
                    periodStart = TimeUtils.getStartOfDay(periodStart);
                    periodEnd = TimeUtils.getEndOfDay(periodStart);
                    label = TimeUtils.formatDate(periodStart, 'MM/DD');
                    break;
                    
                case 'week':
                    periodStart = new Date(now);
                    periodStart.setDate(now.getDate() - (i * 7));
                    periodStart = TimeUtils.getStartOfWeek(periodStart);
                    periodEnd = TimeUtils.getEndOfWeek(periodStart);
                    label = `W${TimeUtils.getWeekNumber(periodStart)}`;
                    break;
                    
                case 'month':
                    periodStart = new Date(now);
                    periodStart.setMonth(now.getMonth() - i);
                    periodStart = TimeUtils.getStartOfMonth(periodStart);
                    periodEnd = TimeUtils.getEndOfMonth(periodStart);
                    label = TimeUtils.formatDate(periodStart, 'YYYY-MM');
                    break;
                    
                default:
                    throw new Error(`不支持的周期类型: ${period}`);
            }
            
            const periodStats = this.calculateCompletionRate(todos, {
                start: periodStart,
                end: periodEnd
            });
            
            periods.unshift({
                label,
                period,
                startDate: periodStart,
                endDate: periodEnd,
                ...periodStats
            });
        }
        
        return periods;
    }
    
    /**
     * 计算生产力趋势
     * @param {Array} todos - Todo数组
     * @param {number} days - 分析的天数
     * @returns {Object} 趋势分析结果
     */
    static calculateProductivityTrend(todos, days = 30) {
        const dailyStats = this.calculateTimePeriodStats(todos, 'day', days);
        
        if (dailyStats.length < 2) {
            return {
                trend: 'stable',
                change: 0,
                dailyAverage: 0,
                description: '数据不足，无法分析趋势'
            };
        }
        
        // 计算趋势（简单线性回归斜率）
        const n = dailyStats.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        dailyStats.forEach((stat, index) => {
            const x = index; // 天数索引
            const y = stat.completed; // 完成任务数
            
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        });
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const dailyAverage = sumY / n;
        
        let trend, description;
        if (Math.abs(slope) < 0.1) {
            trend = 'stable';
            description = '生产力保持稳定';
        } else if (slope > 0) {
            trend = 'increasing';
            description = `生产力呈上升趋势，每日平均增加 ${slope.toFixed(1)} 个任务`;
        } else {
            trend = 'decreasing';
            description = `生产力呈下降趋势，每日平均减少 ${Math.abs(slope).toFixed(1)} 个任务`;
        }
        
        return {
            trend,
            change: slope,
            dailyAverage: Math.round(dailyAverage * 10) / 10,
            description,
            periods: dailyStats
        };
    }
    
    /**
     * 计算拖延行为分析
     * @param {Array} todos - Todo数组
     * @returns {Object} 拖延行为指标
     */
    static calculateProcrastinationMetrics(todos) {
        const now = new Date();
        let totalDelayDays = 0;
        let delayedTasks = 0;
        let longTermDelayed = 0; // 超过7天未完成
        let veryLongTermDelayed = 0; // 超过30天未完成
        
        // 分析未完成任务的拖延情况
        const pendingTasks = todos.filter(todo => !todo.completed);
        
        pendingTasks.forEach(todo => {
            const createTime = new Date(todo.createTime);
            const delayDays = TimeUtils.getDaysDifference(createTime, now);
            
            if (delayDays > 1) { // 超过1天算拖延
                delayedTasks++;
                totalDelayDays += delayDays;
                
                if (delayDays > 7) {
                    longTermDelayed++;
                }
                if (delayDays > 30) {
                    veryLongTermDelayed++;
                }
            }
        });
        
        // 分析已完成任务的完成时间
        const completedTasks = todos.filter(todo => todo.completed && todo.updateTime);
        let avgCompletionDays = 0;
        
        if (completedTasks.length > 0) {
            const totalCompletionTime = completedTasks.reduce((sum, todo) => {
                const createTime = new Date(todo.createTime);
                const completeTime = new Date(todo.updateTime);
                return sum + TimeUtils.getDaysDifference(createTime, completeTime);
            }, 0);
            
            avgCompletionDays = Math.round((totalCompletionTime / completedTasks.length) * 10) / 10;
        }
        
        // 计算拖延等级
        const procrastinationLevel = this.calculateProcrastinationLevel({
            totalTasks: todos.length,
            delayedTasks,
            longTermDelayed,
            veryLongTermDelayed,
            avgCompletionDays
        });
        
        return {
            totalPendingTasks: pendingTasks.length,
            delayedTasks,
            longTermDelayed,
            veryLongTermDelayed,
            avgDelayDays: delayedTasks > 0 ? Math.round((totalDelayDays / delayedTasks) * 10) / 10 : 0,
            avgCompletionDays,
            procrastinationLevel,
            recommendations: this.generateProcrastinationRecommendations(procrastinationLevel)
        };
    }
    
    /**
     * 计算拖延等级
     * @private
     */
    static calculateProcrastinationLevel(metrics) {
        let score = 0;
        
        // 拖延任务比例得分 (0-30分)
        if (metrics.totalTasks > 0) {
            const delayedRatio = metrics.delayedTasks / metrics.totalTasks;
            score += Math.min(delayedRatio * 30, 30);
        }
        
        // 长期拖延得分 (0-25分)
        if (metrics.delayedTasks > 0) {
            const longTermRatio = metrics.longTermDelayed / metrics.delayedTasks;
            score += Math.min(longTermRatio * 25, 25);
        }
        
        // 超长期拖延得分 (0-25分)
        if (metrics.delayedTasks > 0) {
            const veryLongTermRatio = metrics.veryLongTermDelayed / metrics.delayedTasks;
            score += Math.min(veryLongTermRatio * 25, 25);
        }
        
        // 平均完成时间得分 (0-20分)
        if (metrics.avgCompletionDays > 7) {
            score += Math.min((metrics.avgCompletionDays - 7) * 2, 20);
        }
        
        // 根据得分确定等级
        if (score < 20) return 'low';
        if (score < 40) return 'moderate';
        if (score < 70) return 'high';
        return 'very_high';
    }
    
    /**
     * 生成拖延建议
     * @private
     */
    static generateProcrastinationRecommendations(level) {
        const recommendations = {
            low: [
                '保持当前良好的工作节奏',
                '可以尝试挑战更多任务',
                '定期回顾和优化工作方法'
            ],
            moderate: [
                '尝试将大任务分解为小任务',
                '设定具体的截止时间',
                '使用番茄工作法提高专注度'
            ],
            high: [
                '优先处理最紧急的任务',
                '每天设定最多3个重要任务',
                '消除工作环境中的干扰因素',
                '寻求他人的监督和支持'
            ],
            very_high: [
                '立即处理积压任务',
                '每天只专注1-2个最重要的任务',
                '考虑寻求专业的时间管理指导',
                '分析拖延的根本原因',
                '建立奖惩机制'
            ]
        };
        
        return recommendations[level] || [];
    }
    
    /**
     * 计算最佳工作时段
     * @param {Array} todos - Todo数组
     * @returns {Object} 工作时段分析结果
     */
    static calculateOptimalWorkPeriods(todos) {
        const timeSlotStats = {
            morning: { total: 0, completed: 0 },
            afternoon: { total: 0, completed: 0 },
            evening: { total: 0, completed: 0 },
            night: { total: 0, completed: 0 }
        };
        
        const weekdayStats = {
            weekday: { total: 0, completed: 0 },
            weekend: { total: 0, completed: 0 }
        };
        
        // 分析创建任务的时间分布
        todos.forEach(todo => {
            const createTime = new Date(todo.createTime);
            const timeSlot = TimeUtils.getTimeSlot(createTime);
            const isWeekday = TimeUtils.isWeekday(createTime);
            
            // 时段统计
            timeSlotStats[timeSlot].total++;
            if (todo.completed) {
                timeSlotStats[timeSlot].completed++;
            }
            
            // 工作日/周末统计
            const dayType = isWeekday ? 'weekday' : 'weekend';
            weekdayStats[dayType].total++;
            if (todo.completed) {
                weekdayStats[dayType].completed++;
            }
        });
        
        // 计算各时段的完成率和效率
        const timeSlotAnalysis = Object.entries(timeSlotStats).map(([slot, stats]) => ({
            timeSlot: slot,
            label: TimeUtils.getTimeSlotLabel(slot),
            total: stats.total,
            completed: stats.completed,
            completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
            productivity: this.calculateProductivityScore(stats)
        }));
        
        // 找出最佳时段
        const bestTimeSlot = timeSlotAnalysis.reduce((best, current) => 
            current.productivity > best.productivity ? current : best
        );
        
        // 工作日/周末分析
        const dayTypeAnalysis = Object.entries(weekdayStats).map(([type, stats]) => ({
            dayType: type,
            label: type === 'weekday' ? '工作日' : '周末',
            total: stats.total,
            completed: stats.completed,
            completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
            productivity: this.calculateProductivityScore(stats)
        }));
        
        return {
            timeSlotAnalysis,
            dayTypeAnalysis,
            bestTimeSlot,
            recommendations: this.generateWorkPeriodRecommendations(bestTimeSlot, timeSlotAnalysis)
        };
    }
    
    /**
     * 计算生产力得分
     * @private
     */
    static calculateProductivityScore(stats) {
        if (stats.total === 0) return 0;
        
        const completionRate = stats.completed / stats.total;
        const volume = Math.min(stats.total / 10, 1); // 任务量权重，最大权重为1
        
        return Math.round((completionRate * 0.7 + volume * 0.3) * 100);
    }
    
    /**
     * 生成工作时段建议
     * @private
     */
    static generateWorkPeriodRecommendations(bestTimeSlot, analysis) {
        const recommendations = [];
        
        if (bestTimeSlot.total > 0) {
            recommendations.push(`您在${bestTimeSlot.label}的工作效率最高（完成率${bestTimeSlot.completionRate}%）`);
            recommendations.push(`建议将重要任务安排在${bestTimeSlot.label}完成`);
        }
        
        // 找出效率较低的时段
        const lowProductivitySlots = analysis
            .filter(slot => slot.total > 0 && slot.productivity < 30)
            .map(slot => slot.label);
            
        if (lowProductivitySlots.length > 0) {
            recommendations.push(`避免在以下时段安排重要任务：${lowProductivitySlots.join('、')}`);
        }
        
        // 分析任务分布均匀性
        const totalTasks = analysis.reduce((sum, slot) => sum + slot.total, 0);
        const avgTasksPerSlot = totalTasks / 4;
        const unevenDistribution = analysis.some(slot => 
            Math.abs(slot.total - avgTasksPerSlot) > avgTasksPerSlot * 0.5
        );
        
        if (unevenDistribution) {
            recommendations.push('建议更均匀地分配任务到不同时段');
        }
        
        return recommendations;
    }
    
    /**
     * 计算个性化洞察
     * @param {Array} todos - Todo数组
     * @returns {Object} 个性化分析结果
     */
    static calculatePersonalizedInsights(todos) {
        const insights = {
            workingStyle: this.analyzeWorkingStyle(todos),
            taskPatterns: this.analyzeTaskPatterns(todos),
            streaks: this.calculateStreaks(todos),
            achievements: this.calculateAchievements(todos)
        };
        
        return {
            ...insights,
            summary: this.generateInsightsSummary(insights)
        };
    }
    
    /**
     * 分析工作风格
     * @private
     */
    static analyzeWorkingStyle(todos) {
        const completedTodos = todos.filter(todo => todo.completed && todo.updateTime);
        
        if (completedTodos.length === 0) {
            return {
                style: 'unknown',
                description: '暂无足够数据分析工作风格'
            };
        }
        
        // 计算平均任务完成时间
        const avgCompletionTime = completedTodos.reduce((sum, todo) => {
            const createTime = new Date(todo.createTime);
            const completeTime = new Date(todo.updateTime);
            return sum + TimeUtils.getDaysDifference(createTime, completeTime);
        }, 0) / completedTodos.length;
        
        // 分析完成任务的时间分布
        const quickTasks = completedTodos.filter(todo => {
            const createTime = new Date(todo.createTime);
            const completeTime = new Date(todo.updateTime);
            return TimeUtils.getDaysDifference(createTime, completeTime) < 1;
        }).length;
        
        const quickRatio = quickTasks / completedTodos.length;
        
        let style, description;
        
        if (avgCompletionTime < 1 && quickRatio > 0.7) {
            style = 'sprint';
            description = '冲刺型：偏好快速完成任务，执行力强';
        } else if (avgCompletionTime > 3) {
            style = 'marathon';
            description = '马拉松型：习惯长期规划，深度思考';
        } else if (quickRatio > 0.5) {
            style = 'mixed_fast';
            description = '混合偏快型：快慢结合，偏向快速执行';
        } else {
            style = 'balanced';
            description = '平衡型：快慢适中，节奏稳定';
        }
        
        return {
            style,
            description,
            avgCompletionDays: Math.round(avgCompletionTime * 10) / 10,
            quickTaskRatio: Math.round(quickRatio * 100)
        };
    }
    
    /**
     * 分析任务模式
     * @private
     */
    static analyzeTaskPatterns(todos) {
        // 任务标题长度分析
        const titleLengths = todos.map(todo => todo.title.length);
        const avgTitleLength = titleLengths.reduce((sum, len) => sum + len, 0) / titleLengths.length;
        
        // 描述使用情况
        const withDescription = todos.filter(todo => todo.description && todo.description.trim()).length;
        const descriptionUsage = Math.round((withDescription / todos.length) * 100);
        
        // 创建时间模式
        const creationHours = todos.map(todo => new Date(todo.createTime).getHours());
        const peakCreationHour = this.findMostFrequentValue(creationHours);
        
        return {
            avgTitleLength: Math.round(avgTitleLength),
            descriptionUsage,
            peakCreationHour,
            taskComplexity: avgTitleLength > 30 ? 'complex' : 'simple',
            planningHabit: descriptionUsage > 50 ? 'detailed' : 'minimal'
        };
    }
    
    /**
     * 计算连续完成记录
     * @private
     */
    static calculateStreaks(todos) {
        const completedTodos = todos
            .filter(todo => todo.completed && todo.updateTime)
            .sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime));
            
        let currentStreak = 0;
        let maxStreak = 0;
        let streakDates = [];
        
        if (completedTodos.length > 0) {
            const today = TimeUtils.getStartOfDay(new Date());
            let checkDate = today;
            
            // 检查连续完成天数
            while (checkDate >= TimeUtils.getStartOfDay(new Date(completedTodos[0].updateTime))) {
                const dayTasks = completedTodos.filter(todo => {
                    const completeDate = TimeUtils.getStartOfDay(new Date(todo.updateTime));
                    return completeDate.getTime() === checkDate.getTime();
                });
                
                if (dayTasks.length > 0) {
                    currentStreak++;
                    streakDates.unshift(new Date(checkDate));
                } else {
                    break;
                }
                
                checkDate.setDate(checkDate.getDate() - 1);
            }
            
            maxStreak = currentStreak; // 简化版本，实际应该计算历史最大连续天数
        }
        
        return {
            currentStreak,
            maxStreak,
            streakDates: streakDates.map(date => TimeUtils.formatDate(date))
        };
    }
    
    /**
     * 计算成就
     * @private
     */
    static calculateAchievements(todos) {
        const achievements = [];
        
        const completedCount = todos.filter(todo => todo.completed).length;
        const totalCount = todos.length;
        
        // 完成任务数成就
        if (completedCount >= 100) {
            achievements.push({
                name: '百任务达人',
                description: '累计完成100个任务',
                icon: '🏆'
            });
        } else if (completedCount >= 50) {
            achievements.push({
                name: '半百英雄',
                description: '累计完成50个任务',
                icon: '🥇'
            });
        } else if (completedCount >= 10) {
            achievements.push({
                name: '十全十美',
                description: '累计完成10个任务',
                icon: '🥉'
            });
        }
        
        // 完成率成就
        if (totalCount >= 10) {
            const completionRate = completedCount / totalCount;
            if (completionRate >= 0.9) {
                achievements.push({
                    name: '完美主义者',
                    description: '任务完成率达到90%以上',
                    icon: '💎'
                });
            } else if (completionRate >= 0.75) {
                achievements.push({
                    name: '高效执行者',
                    description: '任务完成率达到75%以上',
                    icon: '⚡'
                });
            }
        }
        
        // 连续完成成就
        const streaks = this.calculateStreaks(todos);
        if (streaks.currentStreak >= 7) {
            achievements.push({
                name: '七日奇迹',
                description: `连续${streaks.currentStreak}天完成任务`,
                icon: '🔥'
            });
        } else if (streaks.currentStreak >= 3) {
            achievements.push({
                name: '持续力量',
                description: `连续${streaks.currentStreak}天完成任务`,
                icon: '💪'
            });
        }
        
        return achievements;
    }
    
    /**
     * 生成洞察总结
     * @private
     */
    static generateInsightsSummary(insights) {
        const summary = [];
        
        // 工作风格总结
        summary.push(`工作风格：${insights.workingStyle.description}`);
        
        // 任务模式总结
        const { taskPatterns } = insights;
        summary.push(`任务规划：${taskPatterns.planningHabit === 'detailed' ? '详细规划型' : '简洁高效型'}`);
        
        // 连续记录总结
        if (insights.streaks.currentStreak > 0) {
            summary.push(`当前连续完成${insights.streaks.currentStreak}天任务`);
        }
        
        // 成就总结
        if (insights.achievements.length > 0) {
            summary.push(`已获得${insights.achievements.length}个成就徽章`);
        }
        
        return summary;
    }
    
    /**
     * 查找出现频率最高的值
     * @private
     */
    static findMostFrequentValue(array) {
        const frequency = {};
        let maxCount = 0;
        let mostFrequent = null;
        
        array.forEach(value => {
            frequency[value] = (frequency[value] || 0) + 1;
            if (frequency[value] > maxCount) {
                maxCount = frequency[value];
                mostFrequent = value;
            }
        });
        
        return mostFrequent;
    }
}

// 导出分析常量
export const METRICS_CONSTANTS = {
    PROCRASTINATION_LEVELS: {
        LOW: 'low',
        MODERATE: 'moderate', 
        HIGH: 'high',
        VERY_HIGH: 'very_high'
    },
    WORK_STYLES: {
        SPRINT: 'sprint',
        MARATHON: 'marathon',
        MIXED_FAST: 'mixed_fast',
        BALANCED: 'balanced'
    },
    TIME_PERIODS: {
        DAY: 'day',
        WEEK: 'week',
        MONTH: 'month'
    }
};