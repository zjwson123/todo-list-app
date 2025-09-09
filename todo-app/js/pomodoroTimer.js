/**
 * 番茄工作法计时器
 * 为Todo应用提供时间管理功能，帮助用户建立有效工作节奏
 */

class PomodoroTimer {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentSession = 'work'; // work, shortBreak, longBreak
        this.sessionCount = 0;
        this.currentTime = 0; // 当前时间（秒）
        this.intervalId = null;
        this.endTime = null; // 会话结束时间
        
        // 默认设置（分钟）
        this.settings = {
            workDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            longBreakInterval: 4, // 每4个工作番茄后长休息
            autoStartBreaks: true,
            autoStartWork: false,
            notifications: true,
            sounds: true,
            tickingSound: false
        };

        // 加载用户设置
        this.loadSettings();
        
        // 初始化UI和事件
        this.initialize();
    }

    // 初始化计时器
    initialize() {
        this.createTimerUI();
        this.bindEvents();
        this.updateDisplay();
        this.requestNotificationPermission();
    }

    // 创建计时器UI
    createTimerUI() {
        // 检查是否已存在计时器UI
        if (document.getElementById('pomodoro-timer')) {
            return;
        }

        const timerContainer = document.createElement('div');
        timerContainer.id = 'pomodoro-timer';
        timerContainer.className = 'pomodoro-timer';
        
        timerContainer.innerHTML = `
            <div class="timer-header">
                <h3 class="timer-title">🍅 番茄工作法</h3>
                <button class="timer-settings-btn" title="设置">⚙️</button>
            </div>
            
            <div class="timer-session-info">
                <span class="session-type">工作时间</span>
                <span class="session-count">第 1 个番茄</span>
            </div>
            
            <div class="timer-display">
                <div class="time-circle">
                    <svg class="progress-ring" width="120" height="120">
                        <circle class="progress-ring-bg" cx="60" cy="60" r="54" 
                                stroke="#e0e0e0" stroke-width="4" fill="transparent"/>
                        <circle class="progress-ring-progress" cx="60" cy="60" r="54" 
                                stroke="var(--primary-color)" stroke-width="4" fill="transparent"
                                stroke-linecap="round" transform="rotate(-90 60 60)"/>
                    </svg>
                    <div class="time-text">
                        <span class="time-minutes">25</span>
                        <span class="time-separator">:</span>
                        <span class="time-seconds">00</span>
                    </div>
                </div>
            </div>
            
            <div class="timer-controls">
                <button class="timer-btn start-btn" data-action="start">
                    <span class="btn-icon">▶️</span>
                    <span class="btn-text">开始</span>
                </button>
                <button class="timer-btn pause-btn" data-action="pause" style="display: none;">
                    <span class="btn-icon">⏸️</span>
                    <span class="btn-text">暂停</span>
                </button>
                <button class="timer-btn reset-btn" data-action="reset">
                    <span class="btn-icon">🔄</span>
                    <span class="btn-text">重置</span>
                </button>
                <button class="timer-btn skip-btn" data-action="skip">
                    <span class="btn-icon">⏭️</span>
                    <span class="btn-text">跳过</span>
                </button>
            </div>
            
            <div class="timer-stats">
                <div class="stat-item">
                    <span class="stat-label">今日完成</span>
                    <span class="stat-value" id="daily-sessions">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">总计番茄</span>
                    <span class="stat-value" id="total-sessions">0</span>
                </div>
            </div>
        `;

        // 添加样式
        this.addTimerStyles();
        
        // 插入到页面中
        const targetContainer = document.querySelector('.app-header') || document.body;
        targetContainer.appendChild(timerContainer);
    }

    // 添加计时器样式
    addTimerStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .pomodoro-timer {
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                padding: var(--spacing-3);
                margin: var(--spacing-2) 0;
                text-align: center;
                max-width: 300px;
                margin: var(--spacing-2) auto;
            }

            .timer-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--spacing-2);
            }

            .timer-title {
                margin: 0;
                color: var(--text-primary);
                font-size: 16px;
            }

            .timer-settings-btn {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                padding: var(--spacing-1);
                border-radius: var(--border-radius-sm);
                transition: background-color 0.2s;
            }

            .timer-settings-btn:hover {
                background: var(--bg-hover);
            }

            .timer-session-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: var(--spacing-3);
                font-size: 14px;
                color: var(--text-secondary);
            }

            .session-type {
                font-weight: 500;
                color: var(--primary-color);
            }

            .timer-display {
                margin: var(--spacing-3) 0;
                position: relative;
            }

            .time-circle {
                position: relative;
                display: inline-block;
            }

            .progress-ring {
                transform: rotate(-90deg);
            }

            .progress-ring-bg {
                stroke: #e0e0e0;
                opacity: 0.8;
            }

            [data-theme="dark"] .progress-ring-bg {
                stroke: #4a5568;
                opacity: 1;
            }

            .progress-ring-progress {
                stroke-dasharray: 339.292;
                stroke-dashoffset: 339.292;
                transition: stroke-dashoffset 0.3s;
            }

            .time-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 24px;
                font-weight: bold;
                color: var(--text-primary);
                font-family: 'Courier New', monospace;
                white-space: nowrap;
                width: max-content;
                display: flex;
                align-items: center;
                gap: 2px;
            }

            .time-minutes, .time-seconds {
                display: inline-block;
                min-width: 32px;
                text-align: center;
            }

            .time-separator {
                animation: blink 1s infinite;
                margin: 0 2px;
            }

            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.3; }
            }

            .timer-controls {
                display: flex;
                gap: var(--spacing-2);
                justify-content: center;
                margin: var(--spacing-3) 0;
                flex-wrap: wrap;
            }

            .timer-btn {
                display: flex;
                align-items: center;
                gap: var(--spacing-1);
                padding: var(--spacing-2) var(--spacing-3);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-sm);
                background: var(--bg-primary);
                color: var(--text-primary);
                cursor: pointer;
                transition: all 0.2s;
                font-size: 12px;
            }

            .timer-btn:hover {
                background: var(--bg-hover);
                transform: translateY(-1px);
            }

            .timer-btn:active {
                transform: translateY(0);
            }

            .timer-btn.start-btn {
                background: var(--primary-color);
                color: white;
                border-color: var(--primary-color);
            }

            .timer-btn.start-btn:hover {
                background: var(--primary-color-dark, #45a049);
            }

            .timer-btn.pause-btn {
                background: var(--warning-color, #ff9800);
                color: white;
                border-color: var(--warning-color, #ff9800);
            }

            .timer-btn.reset-btn {
                background: var(--error-color, #f44336);
                color: white;
                border-color: var(--error-color, #f44336);
            }

            .timer-stats {
                display: flex;
                justify-content: space-around;
                margin-top: var(--spacing-3);
                padding-top: var(--spacing-2);
                border-top: 1px solid var(--border-color);
            }

            .stat-item {
                text-align: center;
            }

            .stat-label {
                display: block;
                font-size: 12px;
                color: var(--text-secondary);
                margin-bottom: var(--spacing-1);
            }

            .stat-value {
                display: block;
                font-size: 18px;
                font-weight: bold;
                color: var(--primary-color);
            }

            /* 会话状态样式 */
            .pomodoro-timer.work-session {
                border-color: var(--primary-color);
            }

            .pomodoro-timer.break-session {
                border-color: var(--success-color, #4caf50);
            }

            .pomodoro-timer.break-session .progress-ring-progress {
                stroke: var(--success-color, #4caf50);
            }

            .pomodoro-timer.break-session .session-type {
                color: var(--success-color, #4caf50);
            }

            /* 运行状态样式 */
            .pomodoro-timer.running .time-circle {
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
            }

            /* 移动端适配 */
            @media (max-width: 768px) {
                .pomodoro-timer {
                    max-width: 280px;
                    padding: var(--spacing-2);
                }

                .timer-controls {
                    gap: var(--spacing-1);
                }

                .timer-btn {
                    padding: var(--spacing-1) var(--spacing-2);
                    font-size: 11px;
                }

                .time-text {
                    font-size: 20px;
                }
            }

            /* 设置弹窗样式 */
            .timer-settings-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
            }

            .timer-settings-content {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                padding: var(--spacing-4);
                max-width: 400px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            }

            .timer-settings-content {
                background: #ffffff !important;
                border-color: #e2e8f0 !important;
            }

            [data-theme="dark"] .timer-settings-content {
                background: #2d3748 !important;
                border-color: #4a5568 !important;
            }

            .timer-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--spacing-3);
            }

            .timer-settings-header h3 {
                color: #1f2937;
                margin: 0;
            }

            [data-theme="dark"] .timer-settings-header h3 {
                color: #ffffff;
            }

            .close-settings {
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
                padding: var(--spacing-1);
                border-radius: var(--border-radius-sm);
                transition: background-color 0.2s, color 0.2s;
            }

            .close-settings:hover {
                background: #f3f4f6;
                color: #374151;
            }

            [data-theme="dark"] .close-settings {
                color: #9ca3af;
            }

            [data-theme="dark"] .close-settings:hover {
                background: #4b5563;
                color: #e5e7eb;
            }

            .timer-settings-group {
                margin-bottom: var(--spacing-3);
            }

            .timer-settings-group label {
                display: block;
                margin-bottom: var(--spacing-1);
                color: #374151;
                font-weight: 500;
            }

            [data-theme="dark"] .timer-settings-group label {
                color: #e5e7eb;
            }

            .timer-settings-group input,
            .timer-settings-group select {
                width: 100%;
                padding: var(--spacing-2);
                border: 1px solid #d1d5db;
                border-radius: var(--border-radius-sm);
                background: #ffffff;
                color: #374151;
            }

            [data-theme="dark"] .timer-settings-group input,
            [data-theme="dark"] .timer-settings-group select {
                border-color: #4b5563;
                background: #374151;
                color: #e5e7eb;
            }

            .timer-settings-group input[type="checkbox"] {
                width: auto;
                margin-right: var(--spacing-1);
            }

            .timer-settings-actions {
                display: flex;
                gap: var(--spacing-2);
                justify-content: flex-end;
            }
        `;
        document.head.appendChild(style);
    }

    // 绑定事件
    bindEvents() {
        const timer = document.getElementById('pomodoro-timer');
        if (!timer) return;

        // 控制按钮事件
        timer.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (!action) return;

            switch (action) {
                case 'start':
                    this.start();
                    break;
                case 'pause':
                    this.pause();
                    break;
                case 'reset':
                    this.reset();
                    break;
                case 'skip':
                    this.skipSession();
                    break;
            }
        });

        // 设置按钮事件
        const settingsBtn = timer.querySelector('.timer-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }

        // 页面可见性变化监听
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning) {
                this.handleBackgroundTimer();
            } else if (!document.hidden && this.isRunning) {
                this.handleForegroundTimer();
            }
        });
    }

    // 开始计时
    start() {
        if (this.isRunning && !this.isPaused) return;

        if (!this.isPaused) {
            // 新会话开始
            this.currentTime = this.getSessionDuration() * 60;
            this.endTime = Date.now() + this.currentTime * 1000;
        } else {
            // 恢复暂停的会话
            this.endTime = Date.now() + this.currentTime * 1000;
        }

        this.isRunning = true;
        this.isPaused = false;

        // 启动计时器
        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);

        this.updateControlButtons();
        this.updateTimerClass();
        
        console.log(`${this.currentSession}会话开始`);
    }

    // 暂停计时
    pause() {
        if (!this.isRunning || this.isPaused) return;

        this.isPaused = true;
        clearInterval(this.intervalId);
        
        this.updateControlButtons();
        this.updateTimerClass();
        
        console.log('计时器已暂停');
    }

    // 重置计时器
    reset() {
        this.stop();
        this.currentTime = this.getSessionDuration() * 60;
        this.updateDisplay();
        this.updateControlButtons();
        this.updateTimerClass();
        
        console.log('计时器已重置');
    }

    // 停止计时器
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.intervalId);
        this.endTime = null;
    }

    // 跳过当前会话
    skipSession() {
        this.stop();
        this.completeSession();
    }

    // 计时器滴答
    tick() {
        if (this.currentTime <= 0) {
            this.completeSession();
            return;
        }

        this.currentTime--;
        this.updateDisplay();

        // 最后10秒的提示音
        if (this.currentTime <= 10 && this.currentTime > 0 && this.settings.sounds) {
            this.playTickSound();
        }
    }

    // 完成会话
    completeSession() {
        this.stop();
        
        // 记录统计数据
        this.recordSession();
        
        // 播放完成音效
        if (this.settings.sounds) {
            this.playCompletionSound();
        }

        // 发送通知
        if (this.settings.notifications) {
            this.sendNotification();
        }

        // 切换到下一个会话
        this.switchToNextSession();
    }

    // 切换到下一个会话
    switchToNextSession() {
        if (this.currentSession === 'work') {
            this.sessionCount++;
            
            // 检查是否应该长休息
            if (this.sessionCount % this.settings.longBreakInterval === 0) {
                this.currentSession = 'longBreak';
            } else {
                this.currentSession = 'shortBreak';
            }
            
            // 自动开始休息
            if (this.settings.autoStartBreaks) {
                setTimeout(() => this.start(), 1000);
            }
        } else {
            this.currentSession = 'work';
            
            // 自动开始工作
            if (this.settings.autoStartWork) {
                setTimeout(() => this.start(), 1000);
            }
        }

        this.currentTime = this.getSessionDuration() * 60;
        this.updateDisplay();
        this.updateControlButtons();
        this.updateTimerClass();
        this.updateSessionInfo();
    }

    // 获取当前会话持续时间（分钟）
    getSessionDuration() {
        switch (this.currentSession) {
            case 'work':
                return this.settings.workDuration;
            case 'shortBreak':
                return this.settings.shortBreakDuration;
            case 'longBreak':
                return this.settings.longBreakDuration;
            default:
                return this.settings.workDuration;
        }
    }

    // 更新显示
    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;

        const minutesEl = document.querySelector('.time-minutes');
        const secondsEl = document.querySelector('.time-seconds');

        if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
        if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');

        // 更新进度圆环
        this.updateProgressRing();
    }

    // 更新进度圆环
    updateProgressRing() {
        const progressRing = document.querySelector('.progress-ring-progress');
        if (!progressRing) return;

        const totalDuration = this.getSessionDuration() * 60;
        const progress = (totalDuration - this.currentTime) / totalDuration;
        const circumference = 2 * Math.PI * 54; // 圆周长
        const offset = circumference - (progress * circumference);

        progressRing.style.strokeDashoffset = offset;
    }

    // 更新控制按钮
    updateControlButtons() {
        const startBtn = document.querySelector('.start-btn');
        const pauseBtn = document.querySelector('.pause-btn');

        if (!startBtn || !pauseBtn) return;

        if (this.isRunning && !this.isPaused) {
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'flex';
        } else {
            startBtn.style.display = 'flex';
            pauseBtn.style.display = 'none';
            
            // 更新开始按钮文本
            const btnText = startBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = this.isPaused ? '继续' : '开始';
            }
        }
    }

    // 更新计时器样式类
    updateTimerClass() {
        const timer = document.getElementById('pomodoro-timer');
        if (!timer) return;

        timer.classList.remove('work-session', 'break-session', 'running');
        
        if (this.currentSession === 'work') {
            timer.classList.add('work-session');
        } else {
            timer.classList.add('break-session');
        }

        if (this.isRunning && !this.isPaused) {
            timer.classList.add('running');
        }
    }

    // 更新会话信息
    updateSessionInfo() {
        const sessionTypeEl = document.querySelector('.session-type');
        const sessionCountEl = document.querySelector('.session-count');

        if (sessionTypeEl) {
            switch (this.currentSession) {
                case 'work':
                    sessionTypeEl.textContent = '工作时间';
                    break;
                case 'shortBreak':
                    sessionTypeEl.textContent = '短休息';
                    break;
                case 'longBreak':
                    sessionTypeEl.textContent = '长休息';
                    break;
            }
        }

        if (sessionCountEl) {
            if (this.currentSession === 'work') {
                sessionCountEl.textContent = `第 ${this.sessionCount + 1} 个番茄`;
            } else {
                sessionCountEl.textContent = `已完成 ${this.sessionCount} 个番茄`;
            }
        }
    }

    // 记录会话统计
    recordSession() {
        if (this.currentSession !== 'work') return;

        const today = new Date().toDateString();
        const stats = this.loadStats();

        if (!stats.daily[today]) {
            stats.daily[today] = 0;
        }

        stats.daily[today]++;
        stats.total++;

        this.saveStats(stats);
        this.updateStatsDisplay();

        // 触发番茄工作法完成事件（成就系统）
        document.dispatchEvent(new CustomEvent('pomodoroCompleted', { 
            detail: { type: 'work', sessionCount: stats.total }
        }));
    }

    // 加载统计数据
    loadStats() {
        try {
            const saved = localStorage.getItem('pomodoro-stats');
            return saved ? JSON.parse(saved) : { total: 0, daily: {} };
        } catch (error) {
            console.error('加载番茄钟统计失败:', error);
            return { total: 0, daily: {} };
        }
    }

    // 保存统计数据
    saveStats(stats) {
        try {
            localStorage.setItem('pomodoro-stats', JSON.stringify(stats));
        } catch (error) {
            console.error('保存番茄钟统计失败:', error);
        }
    }

    // 更新统计显示
    updateStatsDisplay() {
        const stats = this.loadStats();
        const today = new Date().toDateString();

        const dailyEl = document.getElementById('daily-sessions');
        const totalEl = document.getElementById('total-sessions');

        if (dailyEl) dailyEl.textContent = stats.daily[today] || 0;
        if (totalEl) totalEl.textContent = stats.total || 0;
    }

    // 播放提示音
    playTickSound() {
        this.playSound('tick', 0.1);
    }

    // 播放完成音效
    playCompletionSound() {
        this.playSound('complete', 0.3);
    }

    // 播放音效
    playSound(type, volume = 0.2) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            if (type === 'tick') {
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.1);
            } else if (type === 'complete') {
                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
                oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2); // E5
                oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.4); // G5
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.6);
            }
        } catch (error) {
            console.warn('音效播放失败:', error);
        }
    }

    // 发送通知
    sendNotification() {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        let title, body;
        
        if (this.currentSession === 'work') {
            title = '🍅 工作时间结束！';
            body = '休息一下，你已经完成了一个番茄工作时段。';
        } else {
            title = '☕ 休息时间结束！';
            body = '准备开始下一个工作时段吧！';
        }

        const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'pomodoro-timer',
            requireInteraction: true
        });

        // 点击通知时聚焦窗口
        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // 5秒后自动关闭
        setTimeout(() => notification.close(), 5000);
    }

    // 请求通知权限
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('此浏览器不支持通知');
            return;
        }

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            console.log('通知权限:', permission);
        }
    }

    // 处理后台计时
    handleBackgroundTimer() {
        if (!this.isRunning || !this.endTime) return;

        // 记录进入后台的时间
        this.backgroundStartTime = Date.now();
    }

    // 处理前台恢复
    handleForegroundTimer() {
        if (!this.isRunning || !this.endTime || !this.backgroundStartTime) return;

        // 计算应该过去的时间
        const now = Date.now();
        const backgroundDuration = Math.floor((now - this.backgroundStartTime) / 1000);
        
        // 更新当前时间
        this.currentTime = Math.max(0, Math.floor((this.endTime - now) / 1000));
        
        if (this.currentTime <= 0) {
            this.completeSession();
        } else {
            this.updateDisplay();
        }

        this.backgroundStartTime = null;
    }

    // 显示设置弹窗
    showSettings() {
        // 创建设置弹窗
        const modal = document.createElement('div');
        modal.className = 'timer-settings-modal';
        modal.innerHTML = `
            <div class="timer-settings-content">
                <div class="timer-settings-header">
                    <h3>番茄钟设置</h3>
                    <button class="close-settings">×</button>
                </div>
                
                <div class="timer-settings-group">
                    <label>工作时长（分钟）</label>
                    <input type="number" id="work-duration" min="1" max="60" value="${this.settings.workDuration}">
                </div>
                
                <div class="timer-settings-group">
                    <label>短休息时长（分钟）</label>
                    <input type="number" id="short-break-duration" min="1" max="30" value="${this.settings.shortBreakDuration}">
                </div>
                
                <div class="timer-settings-group">
                    <label>长休息时长（分钟）</label>
                    <input type="number" id="long-break-duration" min="1" max="60" value="${this.settings.longBreakDuration}">
                </div>
                
                <div class="timer-settings-group">
                    <label>长休息间隔（番茄数）</label>
                    <input type="number" id="long-break-interval" min="2" max="8" value="${this.settings.longBreakInterval}">
                </div>
                
                <div class="timer-settings-group">
                    <label>
                        <input type="checkbox" id="auto-start-breaks" ${this.settings.autoStartBreaks ? 'checked' : ''}>
                        自动开始休息
                    </label>
                </div>
                
                <div class="timer-settings-group">
                    <label>
                        <input type="checkbox" id="auto-start-work" ${this.settings.autoStartWork ? 'checked' : ''}>
                        自动开始工作
                    </label>
                </div>
                
                <div class="timer-settings-group">
                    <label>
                        <input type="checkbox" id="notifications" ${this.settings.notifications ? 'checked' : ''}>
                        桌面通知
                    </label>
                </div>
                
                <div class="timer-settings-group">
                    <label>
                        <input type="checkbox" id="sounds" ${this.settings.sounds ? 'checked' : ''}>
                        音效提醒
                    </label>
                </div>
                
                <div class="timer-settings-actions">
                    <button class="timer-btn cancel-settings">取消</button>
                    <button class="timer-btn start-btn save-settings">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定事件
        modal.querySelector('.close-settings').onclick = () => modal.remove();
        modal.querySelector('.cancel-settings').onclick = () => modal.remove();
        modal.onclick = (e) => e.target === modal && modal.remove();

        modal.querySelector('.save-settings').onclick = () => {
            this.saveSettingsFromModal(modal);
            modal.remove();
        };
    }

    // 从设置弹窗保存设置
    saveSettingsFromModal(modal) {
        this.settings.workDuration = parseInt(modal.querySelector('#work-duration').value);
        this.settings.shortBreakDuration = parseInt(modal.querySelector('#short-break-duration').value);
        this.settings.longBreakDuration = parseInt(modal.querySelector('#long-break-duration').value);
        this.settings.longBreakInterval = parseInt(modal.querySelector('#long-break-interval').value);
        this.settings.autoStartBreaks = modal.querySelector('#auto-start-breaks').checked;
        this.settings.autoStartWork = modal.querySelector('#auto-start-work').checked;
        this.settings.notifications = modal.querySelector('#notifications').checked;
        this.settings.sounds = modal.querySelector('#sounds').checked;

        this.saveSettings();
        
        // 如果当前没有运行，更新时间显示
        if (!this.isRunning) {
            this.currentTime = this.getSessionDuration() * 60;
            this.updateDisplay();
        }

        console.log('设置已保存');
    }

    // 加载设置
    loadSettings() {
        try {
            const saved = localStorage.getItem('pomodoro-settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('加载番茄钟设置失败:', error);
        }
    }

    // 保存设置
    saveSettings() {
        try {
            localStorage.setItem('pomodoro-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('保存番茄钟设置失败:', error);
        }
    }

    // 销毁计时器
    destroy() {
        this.stop();
        const timer = document.getElementById('pomodoro-timer');
        if (timer) {
            timer.remove();
        }
    }
}

// 创建全局实例
const pomodoroTimer = new PomodoroTimer();

// 导出模块
export { PomodoroTimer, pomodoroTimer };