/**
 * 时间处理工具模块
 * 提供日期格式化、时间范围计算、工作日识别等功能
 */

export class TimeUtils {
    // 日期格式化
    static formatDate(date, format = 'YYYY-MM-DD') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        switch (format) {
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'YYYY-MM-DD HH:mm':
                return `${year}-${month}-${day} ${hours}:${minutes}`;
            case 'YYYY-MM-DD HH:mm:ss':
                return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            case 'HH:mm':
                return `${hours}:${minutes}`;
            default:
                return d.toISOString();
        }
    }
    
    // 获取日期的开始时间 (00:00:00)
    static getStartOfDay(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    
    // 获取日期的结束时间 (23:59:59.999)
    static getEndOfDay(date) {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    }
    
    // 获取周的开始时间 (周一 00:00:00)
    static getStartOfWeek(date) {
        const d = new Date(date);
        const dayOfWeek = d.getDay();
        const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    
    // 获取周的结束时间 (周日 23:59:59.999)
    static getEndOfWeek(date) {
        const d = new Date(date);
        const dayOfWeek = d.getDay();
        const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? 0 : 7);
        d.setDate(diff);
        d.setHours(23, 59, 59, 999);
        return d;
    }
    
    // 获取月的开始时间
    static getStartOfMonth(date) {
        const d = new Date(date);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    
    // 获取月的结束时间
    static getEndOfMonth(date) {
        const d = new Date(date);
        d.setMonth(d.getMonth() + 1);
        d.setDate(0);
        d.setHours(23, 59, 59, 999);
        return d;
    }
    
    // 计算两个日期间的天数差
    static getDaysDifference(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const timeDiff = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    
    // 计算两个日期间的小时差
    static getHoursDifference(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const timeDiff = Math.abs(d2.getTime() - d1.getTime());
        return Math.round(timeDiff / (1000 * 3600 * 100)) / 100; // 保留两位小数
    }
    
    // 判断是否为工作日 (周一到周五)
    static isWeekday(date) {
        const d = new Date(date);
        const dayOfWeek = d.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5;
    }
    
    // 判断是否为周末
    static isWeekend(date) {
        return !this.isWeekday(date);
    }
    
    // 获取时间段标签
    static getTimeSlot(date) {
        const d = new Date(date);
        const hour = d.getHours();
        
        if (hour >= 6 && hour < 12) {
            return 'morning'; // 上午
        } else if (hour >= 12 && hour < 18) {
            return 'afternoon'; // 下午
        } else if (hour >= 18 && hour < 22) {
            return 'evening'; // 傍晚
        } else {
            return 'night'; // 夜晚
        }
    }
    
    // 获取时间段描述
    static getTimeSlotLabel(slot) {
        const labels = {
            'morning': '上午 (06:00-12:00)',
            'afternoon': '下午 (12:00-18:00)', 
            'evening': '傍晚 (18:00-22:00)',
            'night': '夜晚 (22:00-06:00)'
        };
        return labels[slot] || slot;
    }
    
    // 生成日期范围数组
    static getDateRange(startDate, endDate, step = 'day') {
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        let current = new Date(start);
        
        while (current <= end) {
            dates.push(new Date(current));
            
            switch (step) {
                case 'day':
                    current.setDate(current.getDate() + 1);
                    break;
                case 'week':
                    current.setDate(current.getDate() + 7);
                    break;
                case 'month':
                    current.setMonth(current.getMonth() + 1);
                    break;
                default:
                    current.setDate(current.getDate() + 1);
            }
        }
        
        return dates;
    }
    
    // 获取相对时间描述
    static getRelativeTime(date) {
        const now = new Date();
        const target = new Date(date);
        const diffMs = now - target;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMs < 0) {
            return '未来时间';
        } else if (diffHours < 1) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return diffMinutes < 1 ? '刚刚' : `${diffMinutes}分钟前`;
        } else if (diffHours < 24) {
            return `${diffHours}小时前`;
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else if (diffDays < 30) {
            const diffWeeks = Math.floor(diffDays / 7);
            return `${diffWeeks}周前`;
        } else if (diffDays < 365) {
            const diffMonths = Math.floor(diffDays / 30);
            return `${diffMonths}个月前`;
        } else {
            const diffYears = Math.floor(diffDays / 365);
            return `${diffYears}年前`;
        }
    }
    
    // 获取周数 (一年中的第几周)
    static getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
    
    // 时区转换 (简化版本，仅处理本地时区)
    static toLocalTime(isoString) {
        return new Date(isoString);
    }
    
    // 验证日期格式
    static isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }
    
    // 获取今天的日期字符串
    static today() {
        return this.formatDate(new Date(), 'YYYY-MM-DD');
    }
    
    // 获取昨天的日期字符串
    static yesterday() {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return this.formatDate(date, 'YYYY-MM-DD');
    }
    
    // 获取本周的日期范围
    static thisWeekRange() {
        const now = new Date();
        return {
            start: this.getStartOfWeek(now),
            end: this.getEndOfWeek(now)
        };
    }
    
    // 获取本月的日期范围
    static thisMonthRange() {
        const now = new Date();
        return {
            start: this.getStartOfMonth(now),
            end: this.getEndOfMonth(now)
        };
    }
}

// 时间常量
export const TIME_CONSTANTS = {
    MILLISECONDS_IN_SECOND: 1000,
    SECONDS_IN_MINUTE: 60,
    MINUTES_IN_HOUR: 60,
    HOURS_IN_DAY: 24,
    DAYS_IN_WEEK: 7,
    DAYS_IN_MONTH: 30, // 平均值
    DAYS_IN_YEAR: 365,
    WORK_HOURS_START: 9,
    WORK_HOURS_END: 18,
    TIME_SLOTS: {
        MORNING: 'morning',
        AFTERNOON: 'afternoon', 
        EVENING: 'evening',
        NIGHT: 'night'
    }
};
