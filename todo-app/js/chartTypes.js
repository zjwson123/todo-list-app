/**
 * 图表类型实现
 * 包含趋势图、柱状图、热力图、饼图等具体图表类型
 */

import { BaseChart } from './chartEngine.js';
import { ColorTheme, DataFormatter, CoordinateUtils, TextUtils, MathUtils } from './chartUtils.js';

/**
 * 效率趋势折线图
 * 显示任务完成效率的时间趋势
 */
export class TrendChart extends BaseChart {
    constructor(engine, data, options = {}) {
        super(engine, data, {
            showGrid: true,
            showAxes: true,
            showPoints: true,
            smoothCurve: false,
            lineWidth: 2,
            pointRadius: 4,
            gradientFill: true,
            ...options
        });
        
        this.hoveredPoint = null;
    }
    
    render(animationProgress = 1) {
        const { ctx } = this.engine;
        const { width, height, margin } = this.engine.options;
        const theme = ColorTheme.getTheme(this.engine.getCurrentTheme() === 'dark');
        
        // 计算绘制区域
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        const chartLeft = margin.left;
        const chartTop = margin.top;
        
        ctx.clearRect(0, 0, width, height);
        
        // 绘制背景
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, width, height);
        
        if (!this.data || !this.data.dailyData || this.data.dailyData.length === 0) {
            this.drawNoDataMessage(ctx, width / 2, height / 2, theme);
            return;
        }
        
        // 准备数据
        const dailyData = this.data.dailyData.slice(-30); // 最近30天
        const values = dailyData.map(d => d.productivity);
        const maxValue = Math.max(...values, 100);
        const minValue = Math.min(...values, 0);
        
        // 创建比例尺
        const xScale = CoordinateUtils.createLinearScale([0, dailyData.length - 1], [chartLeft, chartLeft + chartWidth]);
        const yScale = CoordinateUtils.createLinearScale([minValue, maxValue], [chartTop + chartHeight, chartTop]);
        
        // 绘制网格
        if (this.options.showGrid) {
            this.drawGrid(ctx, chartLeft, chartTop, chartWidth, chartHeight, theme);
        }
        
        // 绘制坐标轴
        if (this.options.showAxes) {
            this.drawAxes(ctx, chartLeft, chartTop, chartWidth, chartHeight, dailyData, minValue, maxValue, theme);
        }
        
        // 绘制渐变填充
        if (this.options.gradientFill) {
            this.drawGradientFill(ctx, dailyData, xScale, yScale, animationProgress, theme);
        }
        
        // 绘制折线
        this.drawTrendLine(ctx, dailyData, xScale, yScale, animationProgress, theme);
        
        // 绘制数据点
        if (this.options.showPoints) {
            this.drawDataPoints(ctx, dailyData, xScale, yScale, animationProgress, theme);
        }
        
        // 绘制悬停效果
        if (this.hoveredPoint) {
            this.drawHoverEffect(ctx, this.hoveredPoint, theme);
        }
    }
    
    drawGrid(ctx, left, top, width, height, theme) {
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        // 垂直网格线
        for (let i = 0; i <= 6; i++) {
            const x = left + (width / 6) * i;
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, top + height);
            ctx.stroke();
        }
        
        // 水平网格线
        for (let i = 0; i <= 5; i++) {
            const y = top + (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(left + width, y);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }
    
    drawAxes(ctx, left, top, width, height, data, minValue, maxValue, theme) {
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = theme.textSecondary;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // X轴标签 - 日期
        const labelInterval = Math.ceil(data.length / 6);
        for (let i = 0; i < data.length; i += labelInterval) {
            const x = left + (width / (data.length - 1)) * i;
            const date = new Date(data[i].date);
            const label = `${date.getMonth() + 1}/${date.getDate()}`;
            ctx.fillText(label, x, top + height + 8);
        }
        
        // Y轴标签 - 生产力值
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const y = top + (height / 5) * i;
            const value = MathUtils.roundTo(maxValue - (maxValue - minValue) * (i / 5), 1);
            ctx.fillText(value.toString(), left - 8, y);
        }
    }
    
    drawGradientFill(ctx, data, xScale, yScale, progress, theme) {
        if (data.length < 2) return;
        
        const gradient = ColorTheme.createGradient(
            ctx, 
            0, yScale(Math.max(...data.map(d => d.productivity))),
            0, yScale(Math.min(...data.map(d => d.productivity))),
            [ColorTheme.hexToRgba(theme.primary, 0.2), ColorTheme.hexToRgba(theme.primary, 0.05)]
        );
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        
        // 绘制填充路径
        const animatedLength = Math.floor(data.length * progress);
        
        ctx.moveTo(xScale(0), yScale(0));
        for (let i = 0; i < animatedLength; i++) {
            ctx.lineTo(xScale(i), yScale(data[i].productivity));
        }
        
        if (animatedLength > 0) {
            ctx.lineTo(xScale(animatedLength - 1), yScale(0));
        }
        ctx.closePath();
        ctx.fill();
    }
    
    drawTrendLine(ctx, data, xScale, yScale, progress, theme) {
        if (data.length < 2) return;
        
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = this.options.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const animatedLength = Math.floor(data.length * progress);
        
        ctx.beginPath();
        ctx.moveTo(xScale(0), yScale(data[0].productivity));
        
        if (this.options.smoothCurve) {
            // 绘制平滑曲线
            for (let i = 1; i < animatedLength; i++) {
                const prevPoint = { x: xScale(i - 1), y: yScale(data[i - 1].productivity) };
                const currPoint = { x: xScale(i), y: yScale(data[i].productivity) };
                const controlPoint = {
                    x: prevPoint.x + (currPoint.x - prevPoint.x) * 0.5,
                    y: prevPoint.y
                };
                
                ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, currPoint.x, currPoint.y);
            }
        } else {
            // 绘制直线
            for (let i = 1; i < animatedLength; i++) {
                ctx.lineTo(xScale(i), yScale(data[i].productivity));
            }
        }
        
        ctx.stroke();
    }
    
    drawDataPoints(ctx, data, xScale, yScale, progress, theme) {
        const animatedLength = Math.floor(data.length * progress);
        
        for (let i = 0; i < animatedLength; i++) {
            const x = xScale(i);
            const y = yScale(data[i].productivity);
            
            // 数据点背景
            ctx.fillStyle = theme.background;
            ctx.beginPath();
            ctx.arc(x, y, this.options.pointRadius + 1, 0, 2 * Math.PI);
            ctx.fill();
            
            // 数据点
            ctx.fillStyle = theme.primary;
            ctx.beginPath();
            ctx.arc(x, y, this.options.pointRadius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    drawHoverEffect(ctx, point, theme) {
        const { x, y, data } = point;
        
        // 悬停圆圈
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, this.options.pointRadius + 3, 0, 2 * Math.PI);
        ctx.stroke();
        
        // 悬停线
        ctx.strokeStyle = ColorTheme.hexToRgba(theme.primary, 0.5);
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, this.engine.options.margin.top);
        ctx.lineTo(x, this.engine.options.height - this.engine.options.margin.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    drawNoDataMessage(ctx, x, y, theme) {
        ctx.fillStyle = theme.textSecondary;
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('暂无数据', x, y);
    }
    
    handleInteraction(event) {
        super.handleInteraction(event);
        
        if (event.type === 'mousemove' || event.type === 'click') {
            const point = this.getPointAtPosition(event.x, event.y);
            
            if (point) {
                this.hoveredPoint = point;
                const tooltipContent = `
                    <div><strong>日期:</strong> ${new Date(point.data.date).toLocaleDateString()}</div>
                    <div><strong>生产力:</strong> ${point.data.productivity.toFixed(1)}</div>
                    <div><strong>完成任务:</strong> ${point.data.tasksCompleted}</div>
                    <div><strong>总时间:</strong> ${Math.round(point.data.timeSpent / 60)}分钟</div>
                `;
                this.showTooltip(event.x, event.y, tooltipContent);
                this.engine.render(this); // 重绘以显示悬停效果
            } else {
                this.hoveredPoint = null;
                this.hideTooltip();
                this.engine.render(this);
            }
        }
    }
    
    getPointAtPosition(x, y) {
        if (!this.data || !this.data.dailyData) return null;
        
        const { width, height, margin } = this.engine.options;
        const chartWidth = width - margin.left - margin.right;
        const chartLeft = margin.left;
        
        const dailyData = this.data.dailyData.slice(-30);
        const xScale = CoordinateUtils.createLinearScale([0, dailyData.length - 1], [chartLeft, chartLeft + chartWidth]);
        const yScale = CoordinateUtils.createLinearScale(
            [Math.min(...dailyData.map(d => d.productivity), 0), Math.max(...dailyData.map(d => d.productivity), 100)], 
            [margin.top + height - margin.top - margin.bottom, margin.top]
        );
        
        for (let i = 0; i < dailyData.length; i++) {
            const pointX = xScale(i);
            const pointY = yScale(dailyData[i].productivity);
            
            if (CoordinateUtils.isPointInCircle(x, y, pointX, pointY, this.options.pointRadius + 5)) {
                return { x: pointX, y: pointY, data: dailyData[i], index: i };
            }
        }
        
        return null;
    }
}

/**
 * 完成情况柱状图
 * 显示不同时间段的任务完成情况对比
 */
export class CompletionBars extends BaseChart {
    constructor(engine, data, options = {}) {
        super(engine, data, {
            barPadding: 0.1,
            showValues: true,
            showGrid: true,
            showAxes: true,
            groupPadding: 0.2,
            ...options
        });
        
        this.hoveredBar = null;
    }
    
    render(animationProgress = 1) {
        const { ctx } = this.engine;
        const { width, height, margin } = this.engine.options;
        const theme = ColorTheme.getTheme(this.engine.getCurrentTheme() === 'dark');
        
        // 计算绘制区域
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        const chartLeft = margin.left;
        const chartTop = margin.top;
        
        ctx.clearRect(0, 0, width, height);
        
        // 绘制背景
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, width, height);
        
        if (!this.data || this.data.length === 0) {
            this.drawNoDataMessage(ctx, width / 2, height / 2, theme);
            return;
        }
        
        // 准备数据
        const categories = this.data.map(d => d.period);
        const maxValue = Math.max(...this.data.flatMap(d => d.data.map(item => item.total))) || 100;
        
        // 创建比例尺
        const bandScale = CoordinateUtils.createBandScale(categories, [chartLeft, chartLeft + chartWidth], this.options.groupPadding);
        const yScale = CoordinateUtils.createLinearScale([0, maxValue], [chartTop + chartHeight, chartTop]);
        
        // 绘制网格
        if (this.options.showGrid) {
            this.drawGrid(ctx, chartLeft, chartTop, chartWidth, chartHeight, maxValue, theme);
        }
        
        // 绘制坐标轴
        if (this.options.showAxes) {
            this.drawAxes(ctx, chartLeft, chartTop, chartWidth, chartHeight, categories, maxValue, theme);
        }
        
        // 绘制柱状图
        this.drawBars(ctx, bandScale, yScale, animationProgress, theme);
        
        // 绘制数值标签
        if (this.options.showValues) {
            this.drawValueLabels(ctx, bandScale, yScale, animationProgress, theme);
        }
        
        // 绘制悬停效果
        if (this.hoveredBar) {
            this.drawHoverEffect(ctx, this.hoveredBar, theme);
        }
        
        // 绘制图例
        this.renderBarsLegend(theme);
    }
    
    drawGrid(ctx, left, top, width, height, maxValue, theme) {
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        // 水平网格线
        for (let i = 0; i <= 5; i++) {
            const y = top + (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(left + width, y);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }
    
    drawAxes(ctx, left, top, width, height, categories, maxValue, theme) {
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = theme.textSecondary;
        
        // X轴标签 - 类别
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        categories.forEach((category, index) => {
            const x = left + (width / categories.length) * (index + 0.5);
            ctx.fillText(category, x, top + height + 8);
        });
        
        // Y轴标签 - 数值
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const y = top + (height / 5) * i;
            const value = Math.round(maxValue * (1 - i / 5));
            ctx.fillText(value.toString(), left - 8, y);
        }
    }
    
    drawBars(ctx, bandScale, yScale, progress, theme) {
        const colors = [theme.primary, theme.secondary, theme.success];
        
        this.data.forEach((group, groupIndex) => {
            const groupX = bandScale.scale(group.period);
            const barWidth = bandScale.bandwidth / Math.max(group.data.length, 1);
            
            group.data.forEach((item, itemIndex) => {
                const barX = groupX + itemIndex * barWidth;
                const barHeight = (yScale(0) - yScale(item.total)) * progress;
                const barY = yScale(0) - barHeight;
                
                // 绘制完成部分
                const completedHeight = (barHeight * item.completed / item.total) || 0;
                ctx.fillStyle = colors[itemIndex % colors.length];
                ctx.fillRect(barX, barY + barHeight - completedHeight, barWidth * 0.8, completedHeight);
                
                // 绘制未完成部分
                const uncompletedHeight = barHeight - completedHeight;
                ctx.fillStyle = ColorTheme.hexToRgba(colors[itemIndex % colors.length], 0.3);
                ctx.fillRect(barX, barY, barWidth * 0.8, uncompletedHeight);
                
                // 存储柱子信息用于交互
                if (!this.barInfo) this.barInfo = [];
                this.barInfo.push({
                    x: barX,
                    y: barY,
                    width: barWidth * 0.8,
                    height: barHeight,
                    data: item,
                    groupIndex,
                    itemIndex
                });
            });
        });
    }
    
    drawValueLabels(ctx, bandScale, yScale, progress, theme) {
        ctx.fillStyle = theme.text;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        this.data.forEach((group, groupIndex) => {
            const groupX = bandScale.scale(group.period);
            const barWidth = bandScale.bandwidth / Math.max(group.data.length, 1);
            
            group.data.forEach((item, itemIndex) => {
                const barX = groupX + itemIndex * barWidth + (barWidth * 0.8) / 2;
                const barHeight = (yScale(0) - yScale(item.total)) * progress;
                const barY = yScale(0) - barHeight;
                
                if (barHeight > 20) {
                    ctx.fillText(item.completed + '/' + item.total, barX, barY - 4);
                }
            });
        });
    }
    
    drawHoverEffect(ctx, bar, theme) {
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 2;
        ctx.strokeRect(bar.x - 1, bar.y - 1, bar.width + 2, bar.height + 2);
    }
    
    drawNoDataMessage(ctx, x, y, theme) {
        ctx.fillStyle = theme.textSecondary;
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('暂无数据', x, y);
    }
    
    renderBarsLegend(theme) {
        const legendItems = [
            { label: '已完成', color: theme.primary },
            { label: '未完成', color: ColorTheme.hexToRgba(theme.primary, 0.3) }
        ];
        this.renderLegend(legendItems);
    }
    
    handleInteraction(event) {
        super.handleInteraction(event);
        
        if (event.type === 'mousemove' || event.type === 'click') {
            const bar = this.getBarAtPosition(event.x, event.y);
            
            if (bar) {
                this.hoveredBar = bar;
                const completionRate = ((bar.data.completed / bar.data.total) * 100).toFixed(1);
                const tooltipContent = `
                    <div><strong>时期:</strong> ${this.data[bar.groupIndex].period}</div>
                    <div><strong>完成:</strong> ${bar.data.completed}/${bar.data.total}</div>
                    <div><strong>完成率:</strong> ${completionRate}%</div>
                `;
                this.showTooltip(event.x, event.y, tooltipContent);
                this.engine.render(this);
            } else {
                this.hoveredBar = null;
                this.hideTooltip();
                this.engine.render(this);
            }
        }
    }
    
    getBarAtPosition(x, y) {
        if (!this.barInfo) return null;
        
        return this.barInfo.find(bar => 
            CoordinateUtils.isPointInRect(x, y, bar.x, bar.y, bar.width, bar.height)
        );
    }
}

/**
 * 工作时段热力图
 * 显示一周内不同时段的工作活跃度
 */
export class HeatMap extends BaseChart {
    constructor(engine, data, options = {}) {
        super(engine, data, {
            cellPadding: 2,
            showLabels: true,
            colorScale: ['#f0f9ff', '#0ea5e9'],
            ...options
        });
        
        this.hoveredCell = null;
    }
    
    render(animationProgress = 1) {
        const { ctx } = this.engine;
        const { width, height, margin } = this.engine.options;
        const theme = ColorTheme.getTheme(this.engine.getCurrentTheme() === 'dark');
        
        // 计算绘制区域
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        const chartLeft = margin.left;
        const chartTop = margin.top;
        
        ctx.clearRect(0, 0, width, height);
        
        // 绘制背景
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, width, height);
        
        if (!this.data || this.data.length === 0) {
            this.drawNoDataMessage(ctx, width / 2, height / 2, theme);
            return;
        }
        
        // 计算网格尺寸
        const daysCount = 7; // 一周
        const hoursCount = 24; // 24小时
        const cellWidth = (chartWidth - 80) / hoursCount; // 留出标签空间
        const cellHeight = (chartHeight - 60) / daysCount;
        
        // 绘制标签
        if (this.options.showLabels) {
            this.drawLabels(ctx, chartLeft, chartTop, cellWidth, cellHeight, theme);
        }
        
        // 绘制热力图网格
        this.drawHeatMapCells(ctx, chartLeft + 60, chartTop + 20, cellWidth, cellHeight, animationProgress, theme);
        
        // 绘制悬停效果
        if (this.hoveredCell) {
            this.drawHoverEffect(ctx, this.hoveredCell, theme);
        }
        
        // 绘制颜色图例
        this.drawColorLegend(ctx, chartLeft + chartWidth - 80, chartTop, theme);
    }
    
    drawLabels(ctx, left, top, cellWidth, cellHeight, theme) {
        ctx.fillStyle = theme.textSecondary;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        
        // 绘制星期标签
        const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        dayLabels.forEach((day, index) => {
            const y = top + 20 + index * cellHeight + cellHeight / 2;
            ctx.fillText(day, left + 50, y);
        });
        
        // 绘制小时标签
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        for (let hour = 0; hour < 24; hour += 3) {
            const x = left + 60 + hour * cellWidth + cellWidth / 2;
            ctx.fillText(hour + ':00', x, top);
        }
    }
    
    drawHeatMapCells(ctx, startX, startY, cellWidth, cellHeight, progress, theme) {
        const maxIntensity = Math.max(...this.data.map(d => d.intensity), 0.1);
        
        this.data.forEach((cell, index) => {
            const x = startX + cell.hour * cellWidth;
            const y = startY + cell.day * cellHeight;
            
            // 计算颜色强度
            const normalizedIntensity = cell.intensity / maxIntensity;
            const animatedIntensity = normalizedIntensity * progress;
            const color = this.interpolateColor(this.options.colorScale[0], this.options.colorScale[1], animatedIntensity);
            
            // 绘制单元格
            ctx.fillStyle = color;
            ctx.fillRect(
                x + this.options.cellPadding, 
                y + this.options.cellPadding, 
                cellWidth - this.options.cellPadding * 2, 
                cellHeight - this.options.cellPadding * 2
            );
            
            // 存储单元格信息用于交互
            if (!this.cellInfo) this.cellInfo = [];
            this.cellInfo.push({
                x: x + this.options.cellPadding,
                y: y + this.options.cellPadding,
                width: cellWidth - this.options.cellPadding * 2,
                height: cellHeight - this.options.cellPadding * 2,
                data: cell
            });
        });
    }
    
    drawHoverEffect(ctx, cell, theme) {
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 2;
        ctx.strokeRect(cell.x - 1, cell.y - 1, cell.width + 2, cell.height + 2);
    }
    
    drawColorLegend(ctx, x, y, theme) {
        const legendWidth = 60;
        const legendHeight = 10;
        
        // 绘制渐变条
        const gradient = ColorTheme.createGradient(ctx, x, y, x + legendWidth, y, this.options.colorScale);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, legendWidth, legendHeight);
        
        // 绘制边框
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, legendWidth, legendHeight);
        
        // 绘制标签
        ctx.fillStyle = theme.textSecondary;
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('低', x, y + legendHeight + 4);
        
        ctx.textAlign = 'right';
        ctx.fillText('高', x + legendWidth, y + legendHeight + 4);
    }
    
    drawNoDataMessage(ctx, x, y, theme) {
        ctx.fillStyle = theme.textSecondary;
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('暂无数据', x, y);
    }
    
    interpolateColor(color1, color2, t) {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    handleInteraction(event) {
        super.handleInteraction(event);
        
        if (event.type === 'mousemove' || event.type === 'click') {
            const cell = this.getCellAtPosition(event.x, event.y);
            
            if (cell) {
                this.hoveredCell = cell;
                const tooltipContent = `
                    <div><strong>时间:</strong> ${cell.data.dayLabel} ${cell.data.hour}:00</div>
                    <div><strong>活跃度:</strong> ${(cell.data.intensity * 100).toFixed(1)}%</div>
                    <div><strong>任务数:</strong> ${cell.data.value}</div>
                `;
                this.showTooltip(event.x, event.y, tooltipContent);
                this.engine.render(this);
            } else {
                this.hoveredCell = null;
                this.hideTooltip();
                this.engine.render(this);
            }
        }
    }
    
    getCellAtPosition(x, y) {
        if (!this.cellInfo) return null;
        
        return this.cellInfo.find(cell => 
            CoordinateUtils.isPointInRect(x, y, cell.x, cell.y, cell.width, cell.height)
        );
    }
}

/**
 * 任务分类饼图
 * 显示不同类型任务的分布情况
 */
export class ProgressPie extends BaseChart {
    constructor(engine, data, options = {}) {
        super(engine, data, {
            innerRadius: 0,
            showLabels: true,
            showPercentages: true,
            labelOffset: 20,
            ...options
        });
        
        this.hoveredSlice = null;
        this.startAngle = -Math.PI / 2; // 从顶部开始
    }
    
    render(animationProgress = 1) {
        const { ctx } = this.engine;
        const { width, height, margin } = this.engine.options;
        const theme = ColorTheme.getTheme(this.engine.getCurrentTheme() === 'dark');
        
        ctx.clearRect(0, 0, width, height);
        
        // 绘制背景
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, width, height);
        
        if (!this.data || this.data.length === 0) {
            this.drawNoDataMessage(ctx, width / 2, height / 2, theme);
            return;
        }
        
        // 计算饼图参数
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - Math.max(...Object.values(margin)) - 40;
        
        // 计算总值
        const totalValue = this.data.reduce((sum, item) => sum + item.value, 0);
        
        if (totalValue === 0) {
            this.drawNoDataMessage(ctx, centerX, centerY, theme);
            return;
        }
        
        // 绘制饼图扇形
        this.drawPieSlices(ctx, centerX, centerY, radius, totalValue, animationProgress, theme);
        
        // 绘制标签
        if (this.options.showLabels) {
            this.drawLabels(ctx, centerX, centerY, radius, totalValue, animationProgress, theme);
        }
        
        // 绘制悬停效果
        if (this.hoveredSlice) {
            this.drawHoverEffect(ctx, centerX, centerY, radius, this.hoveredSlice, theme);
        }
        
        // 绘制图例
        this.renderPieLegend(theme);
    }
    
    drawPieSlices(ctx, centerX, centerY, radius, totalValue, progress, theme) {
        const colors = ColorTheme.generateColorPalette(theme.primary, this.data.length);
        let currentAngle = this.startAngle;
        
        this.data.forEach((item, index) => {
            const sliceAngle = (item.value / totalValue) * 2 * Math.PI * progress;
            const endAngle = currentAngle + sliceAngle;
            
            // 绘制扇形
            ctx.fillStyle = colors[index] || theme.primary;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, endAngle);
            ctx.closePath();
            ctx.fill();
            
            // 绘制边框
            ctx.strokeStyle = theme.background;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 存储扇形信息用于交互
            if (!this.sliceInfo) this.sliceInfo = [];
            this.sliceInfo.push({
                startAngle: currentAngle,
                endAngle: endAngle,
                data: item,
                color: colors[index] || theme.primary,
                index
            });
            
            currentAngle = endAngle;
        });
    }
    
    drawLabels(ctx, centerX, centerY, radius, totalValue, progress, theme) {
        ctx.fillStyle = theme.text;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (!this.sliceInfo) return;
        
        this.sliceInfo.forEach(slice => {
            if (slice.endAngle - slice.startAngle < 0.1) return; // 跳过太小的扇形
            
            const midAngle = (slice.startAngle + slice.endAngle) / 2;
            const labelRadius = radius + this.options.labelOffset;
            const x = centerX + Math.cos(midAngle) * labelRadius;
            const y = centerY + Math.sin(midAngle) * labelRadius;
            
            let label = slice.data.label;
            if (this.options.showPercentages) {
                const percentage = ((slice.data.value / totalValue) * 100).toFixed(1);
                label += `\n${percentage}%`;
            }
            
            // 绘制多行文本
            const lines = label.split('\n');
            lines.forEach((line, lineIndex) => {
                ctx.fillText(line, x, y + lineIndex * 16 - (lines.length - 1) * 8);
            });
        });
    }
    
    drawHoverEffect(ctx, centerX, centerY, radius, slice, theme) {
        const hoverRadius = radius + 10;
        
        ctx.fillStyle = slice.color;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, hoverRadius, slice.startAngle, slice.endAngle);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = theme.background;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    drawNoDataMessage(ctx, x, y, theme) {
        ctx.fillStyle = theme.textSecondary;
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('暂无数据', x, y);
    }
    
    renderPieLegend(theme) {
        if (!this.sliceInfo) return;
        
        const legendItems = this.sliceInfo.map(slice => ({
            label: `${slice.data.label} (${slice.data.value})`,
            color: slice.color
        }));
        
        this.renderLegend(legendItems);
    }
    
    handleInteraction(event) {
        super.handleInteraction(event);
        
        if (event.type === 'mousemove' || event.type === 'click') {
            const slice = this.getSliceAtPosition(event.x, event.y);
            
            if (slice) {
                this.hoveredSlice = slice;
                const percentage = ((slice.data.value / this.data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
                const tooltipContent = `
                    <div><strong>类别:</strong> ${slice.data.label}</div>
                    <div><strong>数量:</strong> ${slice.data.value}</div>
                    <div><strong>占比:</strong> ${percentage}%</div>
                `;
                this.showTooltip(event.x, event.y, tooltipContent);
                this.engine.render(this);
            } else {
                this.hoveredSlice = null;
                this.hideTooltip();
                this.engine.render(this);
            }
        }
    }
    
    getSliceAtPosition(x, y) {
        if (!this.sliceInfo) return null;
        
        const { width, height } = this.engine.options;
        const centerX = width / 2;
        const centerY = height / 2;
        const distance = CoordinateUtils.distance(x, y, centerX, centerY);
        const radius = Math.min(width, height) / 2 - Math.max(...Object.values(this.engine.options.margin)) - 40;
        
        if (distance > radius) return null;
        
        const angle = Math.atan2(y - centerY, x - centerX);
        const normalizedAngle = angle < this.startAngle ? angle + 2 * Math.PI : angle;
        
        return this.sliceInfo.find(slice => 
            normalizedAngle >= slice.startAngle && normalizedAngle <= slice.endAngle
        );
    }
}

/**
 * 洞察展示卡片
 * 显示关键指标和洞察信息
 */
export class InsightCards extends BaseChart {
    constructor(engine, data, options = {}) {
        super(engine, data, {
            cardPadding: 16,
            cardSpacing: 12,
            showIcons: true,
            animateCards: true,
            ...options
        });
    }
    
    render(animationProgress = 1) {
        const { ctx } = this.engine;
        const { width, height } = this.engine.options;
        const theme = ColorTheme.getTheme(this.engine.getCurrentTheme() === 'dark');
        
        ctx.clearRect(0, 0, width, height);
        
        // 绘制背景
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, width, height);
        
        if (!this.data || this.data.length === 0) {
            this.drawNoDataMessage(ctx, width / 2, height / 2, theme);
            return;
        }
        
        // 计算卡片布局
        const cardWidth = (width - (this.data.length + 1) * this.options.cardSpacing) / this.data.length;
        const cardHeight = height - this.options.cardSpacing * 2;
        
        // 绘制卡片
        this.data.forEach((card, index) => {
            const x = this.options.cardSpacing + index * (cardWidth + this.options.cardSpacing);
            const y = this.options.cardSpacing;
            
            this.drawInsightCard(ctx, x, y, cardWidth, cardHeight, card, animationProgress, theme, index);
        });
    }
    
    drawInsightCard(ctx, x, y, width, height, card, progress, theme, index) {
        // 计算动画延迟
        const delay = index * 0.1;
        const cardProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
        
        if (cardProgress <= 0) return;
        
        // 动画效果：从下方滑入
        const animatedY = y + (1 - cardProgress) * 20;
        const animatedAlpha = cardProgress;
        
        ctx.save();
        ctx.globalAlpha = animatedAlpha;
        
        // 绘制卡片背景
        ctx.fillStyle = theme.surface;
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        
        this.drawRoundedRect(ctx, x, animatedY, width, height, 8);
        ctx.fill();
        ctx.stroke();
        
        // 绘制卡片内容
        this.drawCardContent(ctx, x, animatedY, width, height, card, theme);
        
        ctx.restore();
    }
    
    drawCardContent(ctx, x, y, width, height, card, theme) {
        const padding = this.options.cardPadding;
        
        // 绘制标题
        ctx.fillStyle = theme.textSecondary;
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const titleY = y + padding;
        TextUtils.drawMultilineText(ctx, card.title, x + padding, titleY, width - padding * 2, 18);
        
        // 绘制数值
        ctx.fillStyle = theme.text;
        ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const valueY = y + height * 0.4;
        ctx.fillText(card.value, x + width / 2, valueY);
        
        // 绘制单位
        if (card.unit) {
            ctx.fillStyle = theme.textSecondary;
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(card.unit, x + width / 2, valueY + 25);
        }
        
        // 绘制变化趋势
        if (card.trend) {
            this.drawTrend(ctx, x + width / 2, y + height * 0.7, card.trend, theme);
        }
        
        // 绘制描述
        if (card.description) {
            ctx.fillStyle = theme.textSecondary;
            ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            
            TextUtils.drawMultilineText(ctx, card.description, x + padding, y + height - padding - 20, width - padding * 2, 14);
        }
    }
    
    drawTrend(ctx, x, y, trend, theme) {
        const trendColor = trend.direction === 'up' ? theme.success : 
                          trend.direction === 'down' ? theme.danger : theme.textSecondary;
        
        ctx.fillStyle = trendColor;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const symbol = trend.direction === 'up' ? '↗' : 
                      trend.direction === 'down' ? '↘' : '→';
        
        ctx.fillText(`${symbol} ${trend.value}`, x, y);
    }
    
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    drawNoDataMessage(ctx, x, y, theme) {
        ctx.fillStyle = theme.textSecondary;
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('暂无洞察数据', x, y);
    }
}