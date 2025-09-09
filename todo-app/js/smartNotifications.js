/**
 * 智能提醒系统
 * 基于用户行为和任务数据的智能通知与提醒功能
 */

class SmartNotificationSystem {
    constructor() {
        this.isEnabled = false;
        this.permission = 'default';
        this.notificationQueue = [];
        this.activeTimers = new Map();
        this.userSettings = {
            enabled: true,
            workingHours: { start: '09:00', end: '18:00' },
            reminderInterval: 30, // 分钟
            maxDailyReminders: 10,
            intelligentTiming: true,
            soundEnabled: true,
            taskDeadlineReminders: true,
            inactivityReminders: true,
            motivationalMessages: true,
            pomodoroReminders: true
        };
        
        this.reminderStats = {
            dailyCount: 0,
            lastReminderDate: null,
            userInteractions: 0,
            dismissedCount: 0
        };

        this.motivationalMessages = [
            '🌟 每一个小步都是向目标前进！',
            '💪 坚持就是胜利，继续加油！',
            '🎯 专注于当前任务，你能做到！',
            '⚡ 保持动力，成功在向你招手！',
            '🚀 今天又是充满可能性的一天！',
            '✨ 相信自己，你比想象中更强大！',
            '🌈 每完成一个任务都是进步！',
            '🔥 点燃你的效率引擎！',
            '🎨 创造属于你的高效一天！',
            '💎 优质的工作来自持续的努力！'
        ];

        this.initialize();
    }

    // 初始化提醒系统
    async initialize() {
        await this.requestPermission();
        this.loadSettings();
        this.loadStats();
        this.bindEvents();
        this.startIntelligentMonitoring();
        this.schedulePeriodicReminders();
        
        console.log('智能提醒系统初始化完成');
    }

    // 请求通知权限
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('此浏览器不支持通知功能');
            return false;
        }

        this.permission = await Notification.requestPermission();
        this.isEnabled = this.permission === 'granted';
        
        if (this.isEnabled) {
            console.log('通知权限已获得');
        } else {
            console.warn('通知权限被拒绝');
        }

        return this.isEnabled;
    }

    // 绑定事件
    bindEvents() {
        // 监听用户活动
        ['click', 'keydown', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
                this.updateUserActivity();
            }, { passive: true });
        });

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // 监听任务相关事件
        document.addEventListener('todoCompleted', (e) => {
            this.handleTodoCompleted(e.detail);
        });

        document.addEventListener('todoCreated', (e) => {
            this.handleTodoCreated(e.detail);
        });

        // 监听番茄工作法事件
        document.addEventListener('pomodoroCompleted', (e) => {
            this.handlePomodoroCompleted(e.detail);
        });
    }

    // 开始智能监控
    startIntelligentMonitoring() {
        // 每5分钟检查一次用户状态
        setInterval(() => {
            this.performIntelligentCheck();
        }, 5 * 60 * 1000);

        // 每小时检查任务截止日期
        setInterval(() => {
            this.checkTaskDeadlines();
        }, 60 * 60 * 1000);

        // 启动后立即检查一次
        setTimeout(() => {
            this.performIntelligentCheck();
            this.checkTaskDeadlines();
        }, 2000);
    }

    // 安排定期提醒
    schedulePeriodicReminders() {
        if (!this.userSettings.enabled) return;

        const interval = this.userSettings.reminderInterval * 60 * 1000;
        
        setInterval(() => {
            if (this.shouldSendPeriodicReminder()) {
                this.sendPeriodicReminder();
            }
        }, interval);
    }

    // 执行智能检查
    performIntelligentCheck() {
        if (!this.isEnabled || !this.userSettings.enabled) return;

        const todos = this.getTodos();
        const activeTodos = todos.filter(todo => !todo.completed);

        // 检查用户非活跃状态
        if (this.userSettings.inactivityReminders && this.isUserInactive()) {
            this.sendInactivityReminder(activeTodos);
        }

        // 检查是否有紧急任务
        const urgentTasks = this.getUrgentTasks(activeTodos);
        if (urgentTasks.length > 0) {
            this.sendUrgentTaskReminder(urgentTasks);
        }

        // 检查工作时间内的激励消息
        if (this.isWorkingHours() && this.userSettings.motivationalMessages) {
            this.considerMotivationalMessage();
        }
    }

    // 检查任务截止日期
    checkTaskDeadlines() {
        if (!this.userSettings.taskDeadlineReminders) return;

        const todos = this.getTodos();
        const now = new Date();

        todos.forEach(todo => {
            if (todo.completed || !todo.dueDate) return;

            const dueDate = new Date(todo.dueDate);
            const timeDiff = dueDate.getTime() - now.getTime();
            const hoursDiff = timeDiff / (1000 * 3600);

            // 24小时内到期的任务
            if (hoursDiff > 0 && hoursDiff <= 24) {
                this.sendDeadlineReminder(todo, hoursDiff);
            }
        });
    }

    // 发送截止日期提醒
    sendDeadlineReminder(todo, hoursLeft) {
        const timeText = hoursLeft < 1 ? 
            `${Math.round(hoursLeft * 60)}分钟` : 
            `${Math.round(hoursLeft)}小时`;

        this.sendNotification({
            title: '⏰ 任务即将到期',
            body: `"${todo.title}" 将在${timeText}后到期`,
            icon: '⏰',
            tag: `deadline-${todo.id}`,
            priority: 'high',
            actions: [
                { action: 'complete', title: '标记完成' },
                { action: 'postpone', title: '延期' }
            ],
            data: { type: 'deadline', todoId: todo.id }
        });
    }

    // 发送非活跃提醒
    sendInactivityReminder(activeTodos) {
        if (activeTodos.length === 0) return;

        const randomTodo = activeTodos[Math.floor(Math.random() * activeTodos.length)];
        
        this.sendNotification({
            title: '💭 休息够了吗？',
            body: `还有${activeTodos.length}个任务等着你。要不要继续 "${randomTodo.title}"？`,
            icon: '💭',
            tag: 'inactivity-reminder',
            priority: 'normal',
            actions: [
                { action: 'focus', title: '开始工作' },
                { action: 'later', title: '稍后提醒' }
            ],
            data: { type: 'inactivity', todoId: randomTodo.id }
        });
    }

    // 发送紧急任务提醒
    sendUrgentTaskReminder(urgentTasks) {
        const task = urgentTasks[0];
        
        this.sendNotification({
            title: '🚨 紧急任务提醒',
            body: `高优先级任务"${task.title}"需要您的注意`,
            icon: '🚨',
            tag: 'urgent-task',
            priority: 'high',
            actions: [
                { action: 'start', title: '立即开始' },
                { action: 'snooze', title: '10分钟后提醒' }
            ],
            data: { type: 'urgent', todoId: task.id }
        });
    }

    // 发送定期提醒
    sendPeriodicReminder() {
        const todos = this.getTodos();
        const activeTodos = todos.filter(todo => !todo.completed);
        
        if (activeTodos.length === 0) {
            this.sendMotivationalMessage('🎉 所有任务都完成了！给自己一个赞吧！');
            return;
        }

        const message = this.generateSmartReminderMessage(activeTodos);
        this.sendNotification({
            title: '📋 任务提醒',
            body: message,
            icon: '📋',
            tag: 'periodic-reminder',
            priority: 'normal',
            actions: [
                { action: 'view', title: '查看任务' },
                { action: 'dismiss', title: '知道了' }
            ],
            data: { type: 'periodic' }
        });
    }

    // 生成智能提醒消息
    generateSmartReminderMessage(activeTodos) {
        const count = activeTodos.length;
        const timeOfDay = this.getTimeOfDayGreeting();
        
        if (count === 1) {
            return `${timeOfDay}！还有一个任务"${activeTodos[0].title}"待完成`;
        } else if (count <= 3) {
            return `${timeOfDay}！还有${count}个任务待完成，加油！`;
        } else {
            return `${timeOfDay}！今天有${count}个任务，建议先完成优先级高的任务`;
        }
    }

    // 获取时段问候语
    getTimeOfDayGreeting() {
        const hour = new Date().getHours();
        
        if (hour < 6) return '深夜好';
        if (hour < 9) return '早上好';
        if (hour < 12) return '上午好';
        if (hour < 14) return '中午好';
        if (hour < 18) return '下午好';
        if (hour < 22) return '晚上好';
        return '夜深了';
    }

    // 发送激励消息
    sendMotivationalMessage(customMessage = null) {
        const message = customMessage || 
            this.motivationalMessages[Math.floor(Math.random() * this.motivationalMessages.length)];

        this.sendNotification({
            title: '💪 加油鼓励',
            body: message,
            icon: '💪',
            tag: 'motivational',
            priority: 'low',
            data: { type: 'motivational' }
        });
    }

    // 考虑发送激励消息
    considerMotivationalMessage() {
        // 随机决定是否发送激励消息（较低概率）
        if (Math.random() < 0.1 && this.canSendMoreReminders()) {
            this.sendMotivationalMessage();
        }
    }

    // 处理任务完成事件
    handleTodoCompleted(todo) {
        // 发送庆祝通知
        this.sendCelebrationNotification(todo);
        
        // 如果是连续完成，发送连击提醒
        this.checkForStreakBonus();
    }

    // 处理任务创建事件
    handleTodoCreated(todo) {
        // 如果设置了截止日期，安排提醒
        if (todo.dueDate) {
            this.scheduleDeadlineReminder(todo);
        }
    }

    // 处理番茄工作法完成事件
    handlePomodoroCompleted(session) {
        if (!this.userSettings.pomodoroReminders) return;

        this.sendNotification({
            title: '🍅 番茄时段完成！',
            body: session.type === 'work' ? '干得好！是时候休息一下了' : '休息结束，准备开始新的工作吧！',
            icon: '🍅',
            tag: 'pomodoro-complete',
            priority: 'normal',
            data: { type: 'pomodoro', session: session.type }
        });
    }

    // 发送庆祝通知
    sendCelebrationNotification(todo) {
        const celebrations = [
            '🎉 太棒了！又完成一个任务！',
            '⭐ 干得漂亮！继续保持！',
            '🏆 任务完成！你真厉害！',
            '✨ 完美！离目标又近了一步！',
            '🚀 效率满分！继续加油！'
        ];

        const message = celebrations[Math.floor(Math.random() * celebrations.length)];

        this.sendNotification({
            title: message,
            body: `"${todo.title}" 已完成`,
            icon: '🎉',
            tag: 'celebration',
            priority: 'normal',
            data: { type: 'celebration', todoId: todo.id }
        });
    }

    // 检查连击奖励
    checkForStreakBonus() {
        // 这里可以检查最近完成任务的频率，给予连击奖励
        // 简单实现：如果在10分钟内完成了多个任务
        const recentCompletions = this.getRecentCompletions(10);
        
        if (recentCompletions >= 3) {
            this.sendNotification({
                title: '🔥 连击奖励！',
                body: `10分钟内完成${recentCompletions}个任务，效率爆表！`,
                icon: '🔥',
                tag: 'streak-bonus',
                priority: 'normal',
                data: { type: 'streak', count: recentCompletions }
            });
        }
    }

    // 发送通知
    async sendNotification(options) {
        if (!this.isEnabled || !this.canSendMoreReminders()) {
            return;
        }

        try {
            // 检查是否在工作时间内（如果启用了智能时机）
            if (this.userSettings.intelligentTiming && !this.isAppropriateTime()) {
                this.queueNotification(options);
                return;
            }

            const notification = new Notification(options.title, {
                body: options.body,
                icon: this.getNotificationIcon(options.icon),
                badge: this.getNotificationIcon(options.icon),
                tag: options.tag || 'smart-notification',
                requireInteraction: options.priority === 'high',
                silent: !this.userSettings.soundEnabled,
                data: options.data || {}
            });

            // 设置点击事件
            notification.onclick = (e) => {
                this.handleNotificationClick(e, options);
            };

            // 设置关闭事件
            notification.onclose = () => {
                this.handleNotificationClose(options);
            };

            // 自动关闭（除非是高优先级）
            if (options.priority !== 'high') {
                setTimeout(() => {
                    notification.close();
                }, 5000);
            }

            // 更新统计
            this.updateReminderStats();
            
            console.log('智能提醒已发送:', options.title);
            
        } catch (error) {
            console.error('发送通知失败:', error);
        }
    }

    // 处理通知点击
    handleNotificationClick(event, options) {
        event.preventDefault();
        window.focus();
        
        // 根据不同类型的通知执行不同操作
        const { type, todoId } = options.data || {};
        
        switch (type) {
            case 'deadline':
            case 'urgent':
            case 'inactivity':
                if (todoId) {
                    this.focusOnTodo(todoId);
                }
                break;
            case 'pomodoro':
                // 可以打开番茄钟界面
                break;
            default:
                // 默认行为：聚焦到应用
                break;
        }

        this.reminderStats.userInteractions++;
        this.saveStats();
    }

    // 处理通知关闭
    handleNotificationClose(options) {
        this.reminderStats.dismissedCount++;
        this.saveStats();
    }

    // 聚焦到特定任务
    focusOnTodo(todoId) {
        // 切换到主页
        window.location.hash = '#home';
        
        // 查找并高亮任务
        setTimeout(() => {
            const todoElement = document.querySelector(`[data-todo-id="${todoId}"]`);
            if (todoElement) {
                todoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                todoElement.classList.add('highlighted');
                setTimeout(() => {
                    todoElement.classList.remove('highlighted');
                }, 3000);
            }
        }, 500);
    }

    // 获取通知图标
    getNotificationIcon(emoji) {
        // 在实际应用中，这里应该返回图标文件的URL
        // 现在返回一个数据URL或默认图标
        return '/favicon.ico';
    }

    // 更新用户活动时间
    updateUserActivity() {
        this.lastActivity = Date.now();
    }

    // 检查用户是否非活跃
    isUserInactive() {
        if (!this.lastActivity) return false;
        
        const inactiveThreshold = 30 * 60 * 1000; // 30分钟
        return Date.now() - this.lastActivity > inactiveThreshold;
    }

    // 检查是否在工作时间内
    isWorkingHours() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTime = hour * 60 + minute;
        
        const [startHour, startMinute] = this.userSettings.workingHours.start.split(':').map(Number);
        const [endHour, endMinute] = this.userSettings.workingHours.end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;
        
        return currentTime >= startTime && currentTime <= endTime;
    }

    // 检查是否是合适的提醒时间
    isAppropriateTime() {
        const now = new Date();
        const hour = now.getHours();
        
        // 避免在深夜或清晨发送提醒
        return hour >= 7 && hour <= 22;
    }

    // 检查是否可以发送更多提醒
    canSendMoreReminders() {
        const today = new Date().toDateString();
        
        // 重置每日计数
        if (this.reminderStats.lastReminderDate !== today) {
            this.reminderStats.dailyCount = 0;
            this.reminderStats.lastReminderDate = today;
        }
        
        return this.reminderStats.dailyCount < this.userSettings.maxDailyReminders;
    }

    // 是否应该发送定期提醒
    shouldSendPeriodicReminder() {
        return this.canSendMoreReminders() && 
               this.isWorkingHours() && 
               !this.isUserInactive() &&
               Math.random() < 0.3; // 30%概率
    }

    // 更新提醒统计
    updateReminderStats() {
        this.reminderStats.dailyCount++;
        this.reminderStats.lastReminderDate = new Date().toDateString();
        this.saveStats();
    }

    // 处理页面可见性变化
    handleVisibilityChange() {
        if (document.hidden) {
            // 页面隐藏时，可以增加提醒频率
            this.isPageHidden = true;
        } else {
            // 页面显示时，减少提醒频率
            this.isPageHidden = false;
            this.updateUserActivity();
        }
    }

    // 队列化通知（在不合适的时间）
    queueNotification(options) {
        this.notificationQueue.push({
            ...options,
            queuedAt: Date.now()
        });
        
        // 清理过期的队列通知
        this.cleanupNotificationQueue();
    }

    // 清理通知队列
    cleanupNotificationQueue() {
        const maxAge = 60 * 60 * 1000; // 1小时
        const now = Date.now();
        
        this.notificationQueue = this.notificationQueue.filter(
            notification => now - notification.queuedAt < maxAge
        );
    }

    // 获取紧急任务
    getUrgentTasks(todos) {
        // 这里可以根据优先级、截止日期等判断紧急程度
        return todos.filter(todo => {
            if (todo.priority >= 4) return true; // 高优先级
            
            if (todo.dueDate) {
                const dueDate = new Date(todo.dueDate);
                const now = new Date();
                const hoursDiff = (dueDate.getTime() - now.getTime()) / (1000 * 3600);
                return hoursDiff > 0 && hoursDiff <= 2; // 2小时内到期
            }
            
            return false;
        });
    }

    // 获取最近完成任务数
    getRecentCompletions(minutes) {
        // 这里需要从任务数据中统计
        // 简化实现：返回随机数用于演示
        return Math.floor(Math.random() * 5);
    }

    // 安排截止日期提醒
    scheduleDeadlineReminder(todo) {
        if (!todo.dueDate) return;

        const dueDate = new Date(todo.dueDate);
        const now = new Date();
        const timeDiff = dueDate.getTime() - now.getTime();

        // 在截止日期前24小时、1小时和30分钟提醒
        const reminderTimes = [
            timeDiff - 24 * 60 * 60 * 1000, // 24小时前
            timeDiff - 60 * 60 * 1000,      // 1小时前
            timeDiff - 30 * 60 * 1000       // 30分钟前
        ];

        reminderTimes.forEach((timeout, index) => {
            if (timeout > 0) {
                const timerId = setTimeout(() => {
                    this.sendDeadlineReminder(todo, [24, 1, 0.5][index]);
                    this.activeTimers.delete(`deadline-${todo.id}-${index}`);
                }, timeout);
                
                this.activeTimers.set(`deadline-${todo.id}-${index}`, timerId);
            }
        });
    }

    // 获取Todo数据
    getTodos() {
        try {
            const stored = localStorage.getItem('todos');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('获取任务数据失败:', error);
            return [];
        }
    }

    // 加载设置
    loadSettings() {
        try {
            const saved = localStorage.getItem('smart-notification-settings');
            if (saved) {
                this.userSettings = { ...this.userSettings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('加载智能提醒设置失败:', error);
        }
    }

    // 保存设置
    saveSettings() {
        try {
            localStorage.setItem('smart-notification-settings', JSON.stringify(this.userSettings));
        } catch (error) {
            console.error('保存智能提醒设置失败:', error);
        }
    }

    // 加载统计数据
    loadStats() {
        try {
            const saved = localStorage.getItem('smart-notification-stats');
            if (saved) {
                this.reminderStats = { ...this.reminderStats, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('加载智能提醒统计失败:', error);
        }
    }

    // 保存统计数据
    saveStats() {
        try {
            localStorage.setItem('smart-notification-stats', JSON.stringify(this.reminderStats));
        } catch (error) {
            console.error('保存智能提醒统计失败:', error);
        }
    }

    // 更新设置
    updateSettings(newSettings) {
        this.userSettings = { ...this.userSettings, ...newSettings };
        this.saveSettings();
    }

    // 启用/禁用提醒系统
    setEnabled(enabled) {
        this.userSettings.enabled = enabled;
        this.saveSettings();
    }

    // 获取统计信息
    getStats() {
        return {
            ...this.reminderStats,
            settings: this.userSettings,
            permission: this.permission,
            queueLength: this.notificationQueue.length,
            activeTimers: this.activeTimers.size
        };
    }

    // 清理资源
    destroy() {
        // 清除所有定时器
        this.activeTimers.forEach(timerId => {
            clearTimeout(timerId);
        });
        this.activeTimers.clear();
        
        // 清空通知队列
        this.notificationQueue = [];
        
        console.log('智能提醒系统已销毁');
    }
}

// 添加任务高亮样式
const style = document.createElement('style');
style.textContent = `
    .todo-item.highlighted {
        background: linear-gradient(90deg, var(--primary-color-light, rgba(76, 175, 80, 0.2)) 0%, transparent 100%);
        border-left: 4px solid var(--primary-color);
        animation: highlightPulse 2s ease-in-out;
        transform: translateX(4px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    @keyframes highlightPulse {
        0%, 100% {
            background: var(--primary-color-light, rgba(76, 175, 80, 0.1));
        }
        50% {
            background: var(--primary-color-light, rgba(76, 175, 80, 0.3));
        }
    }
`;
document.head.appendChild(style);

// 创建全局实例
const smartNotificationSystem = new SmartNotificationSystem();

// 导出模块
export { SmartNotificationSystem, smartNotificationSystem };