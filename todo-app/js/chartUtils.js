/**
 * 图表工具函数
 * 提供颜色主题、数据转换、坐标计算、动画效果等工具函数
 */

/**
 * 颜色主题系统
 */
export class ColorTheme {
    static themes = {
        light: {
            primary: '#3B82F6',
            secondary: '#10B981',
            accent: '#F59E0B',
            danger: '#EF4444',
            warning: '#F97316',
            success: '#22C55E',
            info: '#06B6D4',
            background: '#FFFFFF',
            surface: '#F8FAFC',
            text: '#1F2937',
            textSecondary: '#6B7280',
            border: '#E5E7EB',
            grid: '#F3F4F6'
        },
        dark: {
            primary: '#60A5FA',
            secondary: '#34D399',
            accent: '#FBBF24',
            danger: '#F87171',
            warning: '#FB923C',
            success: '#4ADE80',
            info: '#22D3EE',
            background: '#111827',
            surface: '#1F2937',
            text: '#F9FAFB',
            textSecondary: '#9CA3AF',
            border: '#374151',
            grid: '#2D3748'
        }
    };
    
    static gradients = {
        light: {
            primary: ['#3B82F6', '#1D4ED8'],
            secondary: ['#10B981', '#047857'],
            accent: ['#F59E0B', '#D97706'],
            warm: ['#F59E0B', '#EF4444'],
            cool: ['#06B6D4', '#3B82F6'],
            success: ['#22C55E', '#16A34A']
        },
        dark: {
            primary: ['#60A5FA', '#2563EB'],
            secondary: ['#34D399', '#059669'],
            accent: ['#FBBF24', '#F59E0B'],
            warm: ['#FBBF24', '#F87171'],
            cool: ['#22D3EE', '#60A5FA'],
            success: ['#4ADE80', '#22C55E']
        }
    };
    
    static getTheme(isDark = false) {
        return isDark ? this.themes.dark : this.themes.light;
    }
    
    static getGradients(isDark = false) {
        return isDark ? this.gradients.dark : this.gradients.light;
    }
    
    static createGradient(ctx, x1, y1, x2, y2, colors) {
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
        });
        return gradient;
    }
    
    static hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    static generateColorPalette(baseColor, count) {
        const colors = [];
        const hsl = this.hexToHsl(baseColor);
        
        for (let i = 0; i < count; i++) {
            const hue = (hsl.h + (i * 360 / count)) % 360;
            colors.push(this.hslToHex(hue, hsl.s, hsl.l));
        }
        
        return colors;
    }
    
    static hexToHsl(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h: h * 360, s: s * 100, l: l * 100 };
    }
    
    static hslToHex(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
}

/**
 * 数据格式转换工具
 */
export class DataFormatter {
    /**
     * 格式化时间周期数据为图表数据
     */
    static formatTimePeriodData(timePeriodAnalysis) {
        const formattedData = [];
        
        Object.keys(timePeriodAnalysis).forEach(period => {
            const data = timePeriodAnalysis[period];
            if (Array.isArray(data)) {
                formattedData.push({
                    period,
                    data: data.map(item => ({
                        label: item.label,
                        value: item.completionRate || 0,
                        total: item.totalTodos || 0,
                        completed: item.completedTodos || 0,
                        date: item.startDate
                    }))
                });
            }
        });
        
        return formattedData;
    }
    
    /**
     * 格式化生产力趋势数据
     */
    static formatProductivityTrend(productivityTrend) {
        return {
            overall: productivityTrend.overallTrend || 'stable',
            weeklyAverage: productivityTrend.weeklyAverage || 0,
            dailyData: (productivityTrend.dailyProductivity || []).map(item => ({
                date: item.date,
                productivity: item.productivityScore || 0,
                tasksCompleted: item.completedTasks || 0,
                timeSpent: item.totalTimeSpent || 0
            }))
        };
    }
    
    /**
     * 格式化工作时段热力图数据
     */
    static formatHeatMapData(optimalWorkPeriods) {
        const heatMapData = [];
        const hours = Array.from({length: 24}, (_, i) => i);
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        days.forEach((day, dayIndex) => {
            hours.forEach(hour => {
                const key = `${day}_${hour}`;
                const activity = optimalWorkPeriods.hourlyActivity?.[key] || 0;
                
                heatMapData.push({
                    day: dayIndex,
                    hour,
                    dayLabel: day,
                    value: activity,
                    intensity: this.calculateIntensity(activity, optimalWorkPeriods.maxActivity || 1)
                });
            });
        });
        
        return heatMapData;
    }
    
    /**
     * 格式化饼图数据
     */
    static formatPieData(personalizedInsights) {
        const categories = personalizedInsights.taskPatterns?.categories || {};
        
        return Object.keys(categories).map(category => ({
            label: category,
            value: categories[category].count || 0,
            percentage: categories[category].percentage || 0,
            color: categories[category].color
        }));
    }
    
    /**
     * 计算强度值
     */
    static calculateIntensity(value, maxValue) {
        return maxValue > 0 ? Math.min(value / maxValue, 1) : 0;
    }
    
    /**
     * 聚合数据
     */
    static aggregateData(data, aggregateBy = 'sum') {
        if (!Array.isArray(data)) return 0;
        
        switch (aggregateBy) {
            case 'sum':
                return data.reduce((sum, item) => sum + (item.value || 0), 0);
            case 'average':
                return data.length > 0 ? data.reduce((sum, item) => sum + (item.value || 0), 0) / data.length : 0;
            case 'max':
                return Math.max(...data.map(item => item.value || 0));
            case 'min':
                return Math.min(...data.map(item => item.value || 0));
            default:
                return 0;
        }
    }
}

/**
 * 坐标计算工具
 */
export class CoordinateUtils {
    /**
     * 创建线性比例尺
     */
    static createLinearScale(domain, range) {
        const [domainMin, domainMax] = domain;
        const [rangeMin, rangeMax] = range;
        const domainSpan = domainMax - domainMin;
        const rangeSpan = rangeMax - rangeMin;
        
        return (value) => {
            if (domainSpan === 0) return rangeMin;
            return rangeMin + (value - domainMin) * rangeSpan / domainSpan;
        };
    }
    
    /**
     * 创建带状比例尺
     */
    static createBandScale(domain, range, padding = 0.1) {
        const [rangeMin, rangeMax] = range;
        const rangeSpan = rangeMax - rangeMin;
        const bandWidth = rangeSpan / (domain.length + padding * (domain.length - 1));
        const step = bandWidth * (1 + padding);
        
        return {
            scale: (value) => {
                const index = domain.indexOf(value);
                return index >= 0 ? rangeMin + index * step : rangeMin;
            },
            bandwidth: bandWidth
        };
    }
    
    /**
     * 计算极坐标
     */
    static polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }
    
    /**
     * 计算两点间距离
     */
    static distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    /**
     * 检查点是否在矩形内
     */
    static isPointInRect(x, y, rectX, rectY, rectWidth, rectHeight) {
        return x >= rectX && x <= rectX + rectWidth && 
               y >= rectY && y <= rectY + rectHeight;
    }
    
    /**
     * 检查点是否在圆形内
     */
    static isPointInCircle(x, y, centerX, centerY, radius) {
        return this.distance(x, y, centerX, centerY) <= radius;
    }
}

/**
 * 动画效果工具
 */
export class AnimationUtils {
    /**
     * 缓动函数
     */
    static easingFunctions = {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeOutElastic: t => Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1,
        easeOutBounce: t => {
            if (t < 1/2.75) {
                return 7.5625 * t * t;
            } else if (t < 2/2.75) {
                return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
            } else if (t < 2.5/2.75) {
                return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
            } else {
                return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
            }
        }
    };
    
    /**
     * 插值函数
     */
    static interpolate(start, end, t) {
        return start + (end - start) * t;
    }
    
    /**
     * 颜色插值
     */
    static interpolateColor(color1, color2, t) {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        
        const r = Math.round(this.interpolate(r1, r2, t));
        const g = Math.round(this.interpolate(g1, g2, t));
        const b = Math.round(this.interpolate(b1, b2, t));
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    /**
     * 创建动画序列
     */
    static createAnimationSequence(animations, options = {}) {
        const {
            duration = 1000,
            delay = 0,
            easing = 'easeOutCubic'
        } = options;
        
        return {
            animations,
            duration,
            delay,
            easing,
            currentTime: 0,
            
            update(deltaTime) {
                this.currentTime += deltaTime;
                const progress = Math.min((this.currentTime - this.delay) / this.duration, 1);
                
                if (progress <= 0) return false;
                
                const easedProgress = AnimationUtils.easingFunctions[this.easing](progress);
                
                this.animations.forEach(animation => {
                    if (animation.update) {
                        animation.update(easedProgress);
                    }
                });
                
                return progress >= 1;
            }
        };
    }
}

/**
 * 文本测量和渲染工具
 */
export class TextUtils {
    /**
     * 测量文本尺寸
     */
    static measureText(ctx, text, font) {
        ctx.save();
        if (font) ctx.font = font;
        const metrics = ctx.measureText(text);
        ctx.restore();
        
        return {
            width: metrics.width,
            height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
        };
    }
    
    /**
     * 绘制多行文本
     */
    static drawMultilineText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        
        ctx.fillText(line, x, currentY);
        return currentY + lineHeight - y;
    }
    
    /**
     * 截断文本
     */
    static truncateText(ctx, text, maxWidth, ellipsis = '...') {
        if (ctx.measureText(text).width <= maxWidth) {
            return text;
        }
        
        let truncated = text;
        while (ctx.measureText(truncated + ellipsis).width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        
        return truncated + ellipsis;
    }
}

/**
 * 数学工具函数
 */
export class MathUtils {
    /**
     * 限制数值范围
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    /**
     * 生成随机数
     */
    static random(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    /**
     * 计算平均值
     */
    static average(numbers) {
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }
    
    /**
     * 计算中位数
     */
    static median(numbers) {
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    
    /**
     * 四舍五入到指定小数位
     */
    static roundTo(number, decimals) {
        return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
}
