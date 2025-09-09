/**
 * 成就系统
 * 为Todo应用提供游戏化的激励反馈，帮助用户建立良好习惯
 */

class AchievementSystem {
    constructor() {
        this.achievements = new Map();
        this.userProgress = {
            totalCompleted: 0,
            dailyStreaks: 0,
            longestStreak: 0,
            totalTodos: 0,
            pomodoroSessions: 0,
            perfectDays: 0, // 完成所有计划任务的天数
            lastActiveDate: null,
            unlockedAchievements: new Set()
        };
        
        this.initialize();
    }

    // 初始化成就系统
    initialize() {
        this.defineAchievements();
        this.loadUserProgress();
        this.createAchievementUI();
        this.bindEvents();
    }

    // 定义所有成就
    defineAchievements() {
        // 完成任务相关成就
        this.achievements.set('first_todo', {
            id: 'first_todo',
            title: '🎯 第一步',
            description: '完成你的第一个任务',
            icon: '🎯',
            requirement: { type: 'totalCompleted', value: 1 },
            rarity: 'common',
            points: 10
        });

        this.achievements.set('task_rookie', {
            id: 'task_rookie',
            title: '📝 任务新手',
            description: '完成10个任务',
            icon: '📝',
            requirement: { type: 'totalCompleted', value: 10 },
            rarity: 'common',
            points: 25
        });

        this.achievements.set('task_master', {
            id: 'task_master',
            title: '🏆 任务大师',
            description: '完成100个任务',
            icon: '🏆',
            requirement: { type: 'totalCompleted', value: 100 },
            rarity: 'rare',
            points: 100
        });

        this.achievements.set('task_legend', {
            id: 'task_legend',
            title: '👑 传奇完成者',
            description: '完成500个任务',
            icon: '👑',
            requirement: { type: 'totalCompleted', value: 500 },
            rarity: 'legendary',
            points: 250
        });

        // 连续完成相关成就
        this.achievements.set('streak_starter', {
            id: 'streak_starter',
            title: '🔥 连胜开始',
            description: '连续3天完成任务',
            icon: '🔥',
            requirement: { type: 'dailyStreaks', value: 3 },
            rarity: 'common',
            points: 20
        });

        this.achievements.set('streak_champion', {
            id: 'streak_champion',
            title: '⚡ 连胜冠军',
            description: '连续7天完成任务',
            icon: '⚡',
            requirement: { type: 'dailyStreaks', value: 7 },
            rarity: 'uncommon',
            points: 50
        });

        this.achievements.set('streak_master', {
            id: 'streak_master',
            title: '🌟 连胜大师',
            description: '连续30天完成任务',
            icon: '🌟',
            requirement: { type: 'dailyStreaks', value: 30 },
            rarity: 'epic',
            points: 150
        });

        // 番茄工作法相关成就
        this.achievements.set('pomodoro_beginner', {
            id: 'pomodoro_beginner',
            title: '🍅 番茄新手',
            description: '完成第一个番茄工作时段',
            icon: '🍅',
            requirement: { type: 'pomodoroSessions', value: 1 },
            rarity: 'common',
            points: 15
        });

        this.achievements.set('pomodoro_enthusiast', {
            id: 'pomodoro_enthusiast',
            title: '⏰ 时间管理者',
            description: '完成25个番茄工作时段',
            icon: '⏰',
            requirement: { type: 'pomodoroSessions', value: 25 },
            rarity: 'uncommon',
            points: 75
        });

        // 完美日相关成就
        this.achievements.set('perfect_day', {
            id: 'perfect_day',
            title: '✨ 完美一天',
            description: '一天内完成所有计划任务',
            icon: '✨',
            requirement: { type: 'perfectDays', value: 1 },
            rarity: 'uncommon',
            points: 30
        });

        this.achievements.set('perfectionist', {
            id: 'perfectionist',
            title: '💎 完美主义者',
            description: '达成10个完美日',
            icon: '💎',
            requirement: { type: 'perfectDays', value: 10 },
            rarity: 'rare',
            points: 100
        });

        // 创造力相关成就
        this.achievements.set('creative_namer', {
            id: 'creative_namer',
            title: '🎨 创意命名师',
            description: '创建50个不同的任务',
            icon: '🎨',
            requirement: { type: 'totalTodos', value: 50 },
            rarity: 'uncommon',
            points: 40
        });

        console.log(`已定义 ${this.achievements.size} 个成就`);
    }

    // 创建成就UI
    createAchievementUI() {
        // 创建成就通知容器
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'achievement-notifications';
        notificationContainer.className = 'achievement-notifications';
        document.body.appendChild(notificationContainer);

        // 添加成就样式
        this.addAchievementStyles();
    }

    // 添加成就系统样式
    addAchievementStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 成就通知容器 */
            .achievement-notifications {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                pointer-events: none;
            }

            /* 成就通知卡片 */
            .achievement-notification {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: var(--spacing-3);
                border-radius: var(--border-radius);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                margin-bottom: var(--spacing-2);
                min-width: 300px;
                pointer-events: auto;
                cursor: pointer;
                animation: achievementSlideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .achievement-notification.common {
                background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            }

            .achievement-notification.uncommon {
                background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
            }

            .achievement-notification.rare {
                background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
            }

            .achievement-notification.epic {
                background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);
            }

            .achievement-notification.legendary {
                background: linear-gradient(135deg, #fd79a8 0%, #fdcb6e 50%, #e17055 100%);
                animation: achievementSlideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55), 
                          legendaryGlow 2s infinite alternate;
            }

            .achievement-notification-header {
                display: flex;
                align-items: center;
                margin-bottom: var(--spacing-2);
            }

            .achievement-icon {
                font-size: 24px;
                margin-right: var(--spacing-2);
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
            }

            .achievement-title {
                font-size: 16px;
                font-weight: bold;
                margin: 0;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }

            .achievement-description {
                font-size: 14px;
                margin: 0;
                opacity: 0.9;
                line-height: 1.4;
            }

            .achievement-points {
                position: absolute;
                top: var(--spacing-2);
                right: var(--spacing-2);
                background: rgba(255, 255, 255, 0.2);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
            }

            /* 动画效果 */
            @keyframes achievementSlideIn {
                0% {
                    transform: translateX(100%) scale(0.8);
                    opacity: 0;
                }
                100% {
                    transform: translateX(0) scale(1);
                    opacity: 1;
                }
            }

            @keyframes achievementSlideOut {
                0% {
                    transform: translateX(0) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translateX(100%) scale(0.8);
                    opacity: 0;
                }
            }

            @keyframes legendaryGlow {
                0% {
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.3);
                }
                100% {
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 30px rgba(255, 215, 0, 0.6);
                }
            }

            /* 任务完成动画 */
            .todo-item.completing {
                animation: todoComplete 0.6s ease-out forwards;
            }

            @keyframes todoComplete {
                0% {
                    transform: scale(1);
                }
                25% {
                    transform: scale(1.02);
                }
                50% {
                    transform: scale(0.98);
                    background: var(--success-color-light, rgba(76, 175, 80, 0.1));
                }
                100% {
                    transform: scale(1);
                    background: var(--success-color-light, rgba(76, 175, 80, 0.1));
                }
            }

            /* 庆祝粒子效果 */
            .celebration-particles {
                position: fixed;
                pointer-events: none;
                z-index: 10000;
            }

            .particle {
                position: absolute;
                width: 6px;
                height: 6px;
                background: var(--primary-color);
                border-radius: 50%;
                animation: particleFloat 2s ease-out forwards;
            }

            @keyframes particleFloat {
                0% {
                    transform: translateY(0) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(-100px) rotate(360deg);
                    opacity: 0;
                }
            }

            /* 成就页面样式 */
            .achievements-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: var(--spacing-3);
                padding: var(--spacing-3);
            }

            .achievement-card {
                background: var(--bg-secondary);
                border: 2px solid var(--border-color);
                border-radius: var(--border-radius);
                padding: var(--spacing-3);
                text-align: center;
                transition: all 0.3s;
                position: relative;
                overflow: hidden;
            }

            .achievement-card.unlocked {
                border-color: var(--primary-color);
                background: var(--primary-color-light, rgba(76, 175, 80, 0.05));
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .achievement-card.locked {
                opacity: 0.6;
                filter: grayscale(50%);
            }

            .achievement-card-icon {
                font-size: 48px;
                margin-bottom: var(--spacing-2);
                display: block;
            }

            .achievement-card.unlocked .achievement-card-icon {
                animation: achievementPulse 2s infinite;
            }

            @keyframes achievementPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            .achievement-card-title {
                font-size: 16px;
                font-weight: bold;
                margin: 0 0 var(--spacing-1) 0;
                color: var(--text-primary);
            }

            .achievement-card-description {
                font-size: 14px;
                color: var(--text-secondary);
                margin: 0 0 var(--spacing-2) 0;
                line-height: 1.4;
            }

            .achievement-progress {
                width: 100%;
                height: 6px;
                background: var(--bg-primary);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: var(--spacing-2);
            }

            .achievement-progress-bar {
                height: 100%;
                background: var(--primary-color);
                border-radius: 3px;
                transition: width 0.3s;
            }

            .achievement-card.unlocked .achievement-progress-bar {
                width: 100% !important;
                background: var(--success-color);
            }

            .achievement-rarity {
                position: absolute;
                top: var(--spacing-2);
                right: var(--spacing-2);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
            }

            .achievement-rarity.common {
                background: #74b9ff;
                color: white;
            }

            .achievement-rarity.uncommon {
                background: #00b894;
                color: white;
            }

            .achievement-rarity.rare {
                background: #fdcb6e;
                color: #2d3436;
            }

            .achievement-rarity.epic {
                background: #a29bfe;
                color: white;
            }

            .achievement-rarity.legendary {
                background: linear-gradient(45deg, #fd79a8, #fdcb6e);
                color: white;
                animation: rarityGlow 2s infinite alternate;
            }

            @keyframes rarityGlow {
                0% { opacity: 0.8; }
                100% { opacity: 1; }
            }

            /* 移动端适配 */
            @media (max-width: 768px) {
                .achievement-notifications {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                }

                .achievement-notification {
                    min-width: auto;
                    margin-bottom: var(--spacing-1);
                }

                .achievements-grid {
                    grid-template-columns: 1fr;
                    gap: var(--spacing-2);
                    padding: var(--spacing-2);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 绑定事件
    bindEvents() {
        // 监听任务完成事件
        document.addEventListener('todoCompleted', (e) => {
            this.handleTodoCompleted(e.detail);
        });

        // 监听任务创建事件
        document.addEventListener('todoCreated', (e) => {
            this.handleTodoCreated(e.detail);
        });

        // 监听番茄工作法完成事件
        document.addEventListener('pomodoroCompleted', (e) => {
            this.handlePomodoroCompleted(e.detail);
        });
    }

    // 处理任务完成
    handleTodoCompleted(todo) {
        this.userProgress.totalCompleted++;
        this.updateDailyProgress();
        
        // 播放完成动画
        this.playCompletionAnimation(todo);
        
        // 检查成就
        this.checkAchievements();
        
        // 保存进度
        this.saveUserProgress();
    }

    // 处理任务创建
    handleTodoCreated(todo) {
        this.userProgress.totalTodos++;
        
        // 检查成就
        this.checkAchievements();
        
        // 保存进度
        this.saveUserProgress();
    }

    // 处理番茄工作法完成
    handlePomodoroCompleted(session) {
        if (session.type === 'work') {
            this.userProgress.pomodoroSessions++;
            
            // 检查成就
            this.checkAchievements();
            
            // 保存进度
            this.saveUserProgress();
        }
    }

    // 更新每日进度
    updateDailyProgress() {
        const today = new Date().toDateString();
        const lastActive = this.userProgress.lastActiveDate;

        if (lastActive === today) {
            // 同一天，不需要更新连续天数
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastActive === yesterdayStr) {
            // 连续的一天
            this.userProgress.dailyStreaks++;
        } else if (lastActive !== null) {
            // 中断了连续天数
            this.userProgress.dailyStreaks = 1;
        } else {
            // 第一天
            this.userProgress.dailyStreaks = 1;
        }

        // 更新最长连续天数
        if (this.userProgress.dailyStreaks > this.userProgress.longestStreak) {
            this.userProgress.longestStreak = this.userProgress.dailyStreaks;
        }

        this.userProgress.lastActiveDate = today;
    }

    // 检查成就
    checkAchievements() {
        const newAchievements = [];

        for (const [id, achievement] of this.achievements) {
            if (this.userProgress.unlockedAchievements.has(id)) {
                continue; // 已解锁
            }

            if (this.isAchievementUnlocked(achievement)) {
                this.userProgress.unlockedAchievements.add(id);
                newAchievements.push(achievement);
            }
        }

        // 显示新解锁的成就
        newAchievements.forEach(achievement => {
            this.showAchievementNotification(achievement);
        });

        return newAchievements;
    }

    // 检查单个成就是否解锁
    isAchievementUnlocked(achievement) {
        const { type, value } = achievement.requirement;
        return this.userProgress[type] >= value;
    }

    // 显示成就通知
    showAchievementNotification(achievement) {
        const container = document.getElementById('achievement-notifications');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `achievement-notification ${achievement.rarity}`;
        notification.innerHTML = `
            <div class="achievement-points">+${achievement.points}</div>
            <div class="achievement-notification-header">
                <span class="achievement-icon">${achievement.icon}</span>
                <h4 class="achievement-title">${achievement.title}</h4>
            </div>
            <p class="achievement-description">${achievement.description}</p>
        `;

        container.appendChild(notification);

        // 播放解锁音效
        this.playAchievementSound(achievement.rarity);

        // 点击关闭
        notification.addEventListener('click', () => {
            this.hideAchievementNotification(notification);
        });

        // 自动关闭
        setTimeout(() => {
            this.hideAchievementNotification(notification);
        }, 5000);

        console.log(`🏆 成就解锁: ${achievement.title}`);
    }

    // 隐藏成就通知
    hideAchievementNotification(notification) {
        if (!notification.parentNode) return;

        notification.style.animation = 'achievementSlideOut 0.3s ease-in forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // 播放任务完成动画
    playCompletionAnimation(todo) {
        // 查找对应的任务元素
        const todoElements = document.querySelectorAll('.todo-item');
        let targetElement = null;

        for (const element of todoElements) {
            if (element.dataset.todoId === todo.id) {
                targetElement = element;
                break;
            }
        }

        if (!targetElement) return;

        // 添加完成动画类
        targetElement.classList.add('completing');

        // 创建粒子效果
        this.createCelebrationParticles(targetElement);

        // 清理动画类
        setTimeout(() => {
            targetElement.classList.remove('completing');
        }, 600);
    }

    // 创建庆祝粒子效果
    createCelebrationParticles(element) {
        const rect = element.getBoundingClientRect();
        const particleContainer = document.createElement('div');
        particleContainer.className = 'celebration-particles';
        document.body.appendChild(particleContainer);

        // 创建多个粒子
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // 随机颜色
            const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            // 随机位置和动画延迟
            particle.style.left = `${rect.left + rect.width / 2}px`;
            particle.style.top = `${rect.top + rect.height / 2}px`;
            particle.style.animationDelay = `${i * 0.1}s`;
            particle.style.transform = `translateX(${(Math.random() - 0.5) * 100}px)`;
            
            particleContainer.appendChild(particle);
        }

        // 清理粒子
        setTimeout(() => {
            if (particleContainer.parentNode) {
                particleContainer.parentNode.removeChild(particleContainer);
            }
        }, 2000);
    }

    // 播放成就音效
    playAchievementSound(rarity) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // 根据稀有度设置不同的音效
            const frequencies = {
                common: [523.25, 659.25], // C5, E5
                uncommon: [523.25, 659.25, 783.99], // C5, E5, G5
                rare: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6
                epic: [523.25, 659.25, 783.99, 1046.5, 1318.5], // C5, E5, G5, C6, E6
                legendary: [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98] // C5, E5, G5, C6, E6, G6
            };

            const freqArray = frequencies[rarity] || frequencies.common;
            let currentTime = audioContext.currentTime;

            freqArray.forEach((freq, index) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(audioContext.destination);
                
                osc.frequency.setValueAtTime(freq, currentTime + index * 0.2);
                gain.gain.setValueAtTime(0.3, currentTime + index * 0.2);
                gain.gain.exponentialRampToValueAtTime(0.01, currentTime + index * 0.2 + 0.3);
                
                osc.start(currentTime + index * 0.2);
                osc.stop(currentTime + index * 0.2 + 0.3);
            });
        } catch (error) {
            console.warn('音效播放失败:', error);
        }
    }

    // 创建成就页面
    createAchievementPage() {
        const achievements = Array.from(this.achievements.values());
        const grid = document.createElement('div');
        grid.className = 'achievements-grid';

        achievements.forEach(achievement => {
            const card = this.createAchievementCard(achievement);
            grid.appendChild(card);
        });

        return grid;
    }

    // 创建成就卡片
    createAchievementCard(achievement) {
        const isUnlocked = this.userProgress.unlockedAchievements.has(achievement.id);
        const progress = this.getAchievementProgress(achievement);

        const card = document.createElement('div');
        card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `
            <div class="achievement-rarity ${achievement.rarity}">${achievement.rarity}</div>
            <span class="achievement-card-icon">${achievement.icon}</span>
            <h3 class="achievement-card-title">${achievement.title}</h3>
            <p class="achievement-card-description">${achievement.description}</p>
            <div class="achievement-progress">
                <div class="achievement-progress-bar" style="width: ${progress}%"></div>
            </div>
            <small>${Math.min(this.userProgress[achievement.requirement.type], achievement.requirement.value)} / ${achievement.requirement.value}</small>
        `;

        return card;
    }

    // 获取成就进度百分比
    getAchievementProgress(achievement) {
        const { type, value } = achievement.requirement;
        const current = this.userProgress[type];
        return Math.min(100, (current / value) * 100);
    }

    // 获取用户统计
    getUserStats() {
        return {
            ...this.userProgress,
            totalAchievements: this.achievements.size,
            unlockedCount: this.userProgress.unlockedAchievements.size,
            completionRate: (this.userProgress.unlockedAchievements.size / this.achievements.size) * 100
        };
    }

    // 加载用户进度
    loadUserProgress() {
        try {
            const saved = localStorage.getItem('achievement-progress');
            if (saved) {
                const data = JSON.parse(saved);
                this.userProgress = {
                    ...this.userProgress,
                    ...data,
                    unlockedAchievements: new Set(data.unlockedAchievements || [])
                };
            }
        } catch (error) {
            console.error('加载成就进度失败:', error);
        }
    }

    // 保存用户进度
    saveUserProgress() {
        try {
            const data = {
                ...this.userProgress,
                unlockedAchievements: Array.from(this.userProgress.unlockedAchievements)
            };
            localStorage.setItem('achievement-progress', JSON.stringify(data));
        } catch (error) {
            console.error('保存成就进度失败:', error);
        }
    }

    // 重置进度（调试用）
    resetProgress() {
        this.userProgress = {
            totalCompleted: 0,
            dailyStreaks: 0,
            longestStreak: 0,
            totalTodos: 0,
            pomodoroSessions: 0,
            perfectDays: 0,
            lastActiveDate: null,
            unlockedAchievements: new Set()
        };
        this.saveUserProgress();
        console.log('成就进度已重置');
    }

    // 触发自定义事件（用于测试）
    triggerEvent(eventType, data) {
        document.dispatchEvent(new CustomEvent(eventType, { detail: data }));
    }
}

// 创建全局实例
const achievementSystem = new AchievementSystem();

// 导出模块
export { AchievementSystem, achievementSystem };