/**
 * 用户界面反馈模块
 * 提供视觉反馈、错误提示、成功确认和字符计数等功能
 */

/**
 * 消息类型枚举
 */
const MESSAGE_TYPES = {
    SUCCESS: 'success',
    WARNING: 'warning', 
    ERROR: 'error',
    INFO: 'info'
};

/**
 * 动画效果类型
 */
const ANIMATION_TYPES = {
    FADE: 'fade',
    SLIDE: 'slide',
    SHAKE: 'shake',
    BOUNCE: 'bounce'
};

/**
 * 消息显示器
 */
class MessageDisplay {
    constructor() {
        this.container = null;
        this.activeMessages = new Map();
        this.init();
    }

    /**
     * 初始化消息容器
     */
    init() {
        // 创建消息容器
        if (!document.getElementById('message-container')) {
            this.container = document.createElement('div');
            this.container.id = 'message-container';
            this.container.className = 'message-container';
            this.setupContainerStyles();
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('message-container');
        }
    }

    /**
     * 设置容器样式
     */
    setupContainerStyles() {
        if (!document.getElementById('message-styles')) {
            const style = document.createElement('style');
            style.id = 'message-styles';
            style.textContent = `
                .message-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                    pointer-events: none;
                }

                .message-item {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    margin-bottom: 10px;
                    padding: 16px;
                    border-left: 4px solid;
                    pointer-events: auto;
                    position: relative;
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.3s ease;
                    max-width: 100%;
                    word-wrap: break-word;
                }

                .message-item.show {
                    opacity: 1;
                    transform: translateX(0);
                }

                .message-item.success {
                    border-left-color: #10b981;
                    background-color: #f0fdf4;
                }

                .message-item.warning {
                    border-left-color: #f59e0b;
                    background-color: #fffbeb;
                }

                .message-item.error {
                    border-left-color: #ef4444;
                    background-color: #fef2f2;
                }

                .message-item.info {
                    border-left-color: #3b82f6;
                    background-color: #eff6ff;
                }

                .message-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }

                .message-title {
                    font-weight: 600;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                }

                .message-icon {
                    margin-right: 8px;
                    font-size: 16px;
                }

                .message-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    color: #666;
                    line-height: 1;
                }

                .message-close:hover {
                    color: #333;
                }

                .message-body {
                    font-size: 13px;
                    color: #555;
                    line-height: 1.4;
                }

                .message-details {
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid rgba(0, 0, 0, 0.1);
                    font-size: 12px;
                    color: #666;
                }

                .message-progress {
                    margin-top: 8px;
                    background: rgba(0, 0, 0, 0.1);
                    height: 4px;
                    border-radius: 2px;
                    overflow: hidden;
                }

                .message-progress-bar {
                    height: 100%;
                    background: currentColor;
                    width: 0;
                    transition: width 0.3s ease;
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }

                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-10px); }
                    60% { transform: translateY(-5px); }
                }

                .message-item.shake {
                    animation: shake 0.5s ease-in-out;
                }

                .message-item.bounce {
                    animation: bounce 0.6s ease-in-out;
                }

                @media (max-width: 480px) {
                    .message-container {
                        left: 10px;
                        right: 10px;
                        top: 10px;
                        max-width: none;
                    }
                    
                    .message-item {
                        transform: translateY(-100%);
                    }
                    
                    .message-item.show {
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * 显示消息
     */
    show(message, type = MESSAGE_TYPES.INFO, options = {}) {
        const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const messageElement = this.createMessageElement(message, type, options, messageId);
        
        this.container.appendChild(messageElement);
        this.activeMessages.set(messageId, messageElement);

        // 触发显示动画
        requestAnimationFrame(() => {
            messageElement.classList.add('show');
            
            if (options.animation) {
                messageElement.classList.add(options.animation);
            }
        });

        // 自动隐藏
        if (options.autoHide !== false) {
            const duration = options.duration || this.getDefaultDuration(type);
            setTimeout(() => {
                this.hide(messageId);
            }, duration);
        }

        // 进度条
        if (options.showProgress && options.autoHide !== false) {
            this.showProgress(messageElement, options.duration || this.getDefaultDuration(type));
        }

        return messageId;
    }

    /**
     * 创建消息元素
     */
    createMessageElement(message, type, options, messageId) {
        const element = document.createElement('div');
        element.className = `message-item ${type}`;
        element.dataset.messageId = messageId;

        const icon = this.getTypeIcon(type);
        const title = options.title || this.getDefaultTitle(type);
        
        element.innerHTML = `
            <div class="message-header">
                <div class="message-title">
                    <span class="message-icon">${icon}</span>
                    ${title}
                </div>
                <button class="message-close" aria-label="关闭">&times;</button>
            </div>
            <div class="message-body">${this.formatMessage(message)}</div>
            ${options.details ? `<div class="message-details">${options.details}</div>` : ''}
            ${options.showProgress ? '<div class="message-progress"><div class="message-progress-bar"></div></div>' : ''}
        `;

        // 关闭按钮事件
        const closeBtn = element.querySelector('.message-close');
        closeBtn.addEventListener('click', () => {
            this.hide(messageId);
        });

        return element;
    }

    /**
     * 格式化消息内容
     */
    formatMessage(message) {
        if (typeof message === 'string') {
            return message;
        }
        
        if (Array.isArray(message)) {
            return message.map(msg => `• ${msg}`).join('<br>');
        }
        
        if (typeof message === 'object' && message !== null) {
            if (message.summary) {
                let html = message.summary;
                if (message.errors && message.errors.length > 0) {
                    html += '<br><br>详细错误：<br>';
                    html += message.errors.map(error => `• ${error.message}`).join('<br>');
                }
                return html;
            }
            return JSON.stringify(message, null, 2);
        }
        
        return String(message);
    }

    /**
     * 获取类型图标
     */
    getTypeIcon(type) {
        const icons = {
            [MESSAGE_TYPES.SUCCESS]: '✓',
            [MESSAGE_TYPES.WARNING]: '⚠',
            [MESSAGE_TYPES.ERROR]: '✕',
            [MESSAGE_TYPES.INFO]: 'ℹ'
        };
        return icons[type] || icons[MESSAGE_TYPES.INFO];
    }

    /**
     * 获取默认标题
     */
    getDefaultTitle(type) {
        const titles = {
            [MESSAGE_TYPES.SUCCESS]: '操作成功',
            [MESSAGE_TYPES.WARNING]: '注意',
            [MESSAGE_TYPES.ERROR]: '错误',
            [MESSAGE_TYPES.INFO]: '提示'
        };
        return titles[type] || titles[MESSAGE_TYPES.INFO];
    }

    /**
     * 获取默认显示时长
     */
    getDefaultDuration(type) {
        const durations = {
            [MESSAGE_TYPES.SUCCESS]: 3000,
            [MESSAGE_TYPES.WARNING]: 5000,
            [MESSAGE_TYPES.ERROR]: 7000,
            [MESSAGE_TYPES.INFO]: 4000
        };
        return durations[type] || 4000;
    }

    /**
     * 显示进度条
     */
    showProgress(element, duration) {
        const progressBar = element.querySelector('.message-progress-bar');
        if (progressBar) {
            requestAnimationFrame(() => {
                progressBar.style.width = '100%';
                progressBar.style.transition = `width ${duration}ms linear`;
            });
        }
    }

    /**
     * 隐藏消息
     */
    hide(messageId) {
        const element = this.activeMessages.get(messageId);
        if (element && element.parentNode) {
            element.classList.remove('show');
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                this.activeMessages.delete(messageId);
            }, 300);
        }
    }

    /**
     * 清除所有消息
     */
    clearAll() {
        this.activeMessages.forEach((element, id) => {
            this.hide(id);
        });
    }

    /**
     * 快捷方法
     */
    success(message, options = {}) {
        return this.show(message, MESSAGE_TYPES.SUCCESS, options);
    }

    warning(message, options = {}) {
        return this.show(message, MESSAGE_TYPES.WARNING, options);
    }

    error(message, options = {}) {
        return this.show(message, MESSAGE_TYPES.ERROR, options);
    }

    info(message, options = {}) {
        return this.show(message, MESSAGE_TYPES.INFO, options);
    }
}

/**
 * 表单验证反馈器
 */
class FormValidationFeedback {
    /**
     * 设置字段错误状态
     */
    static setFieldError(fieldElement, message = null) {
        if (!fieldElement) return;

        // 移除之前的错误状态
        this.clearFieldError(fieldElement);

        // 添加错误样式
        fieldElement.classList.add('field-error');
        
        // 添加错误消息
        if (message) {
            const errorElement = document.createElement('div');
            errorElement.className = 'field-error-message';
            errorElement.textContent = message;
            fieldElement.parentNode.insertBefore(errorElement, fieldElement.nextSibling);
        }

        // 添加摇晃动画
        fieldElement.classList.add('shake-error');
        setTimeout(() => {
            fieldElement.classList.remove('shake-error');
        }, 500);
    }

    /**
     * 设置字段成功状态
     */
    static setFieldSuccess(fieldElement) {
        if (!fieldElement) return;

        this.clearFieldError(fieldElement);
        fieldElement.classList.add('field-success');
        
        // 短暂显示成功状态后移除
        setTimeout(() => {
            fieldElement.classList.remove('field-success');
        }, 2000);
    }

    /**
     * 清除字段错误状态
     */
    static clearFieldError(fieldElement) {
        if (!fieldElement) return;

        fieldElement.classList.remove('field-error', 'field-success');
        
        // 移除错误消息
        const errorMessage = fieldElement.parentNode.querySelector('.field-error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    /**
     * 批量设置表单字段状态
     */
    static setFormErrors(errors) {
        errors.forEach(error => {
            if (error.field) {
                const fieldElement = document.querySelector(`[name="${error.field}"], #${error.field}`);
                this.setFieldError(fieldElement, error.message);
            }
        });
    }

    /**
     * 清除表单所有错误状态
     */
    static clearFormErrors(formElement) {
        if (!formElement) return;

        const errorFields = formElement.querySelectorAll('.field-error');
        errorFields.forEach(field => this.clearFieldError(field));

        const errorMessages = formElement.querySelectorAll('.field-error-message');
        errorMessages.forEach(message => message.remove());
    }
}

/**
 * 字符计数器
 */
class CharacterCounter {
    constructor(inputElement, maxLength, options = {}) {
        this.inputElement = inputElement;
        this.maxLength = maxLength;
        this.options = {
            showRemaining: true,
            warningThreshold: 0.8,
            errorThreshold: 0.95,
            position: 'after',
            ...options
        };
        
        this.counterElement = null;
        this.init();
    }

    /**
     * 初始化字符计数器
     */
    init() {
        this.createCounter();
        this.attachEvents();
        this.update();
        this.addStyles();
    }

    /**
     * 创建计数器元素
     */
    createCounter() {
        this.counterElement = document.createElement('div');
        this.counterElement.className = 'character-counter';
        
        const position = this.options.position;
        const parent = this.inputElement.parentNode;
        
        if (position === 'after') {
            parent.insertBefore(this.counterElement, this.inputElement.nextSibling);
        } else if (position === 'before') {
            parent.insertBefore(this.counterElement, this.inputElement);
        } else {
            parent.appendChild(this.counterElement);
        }
    }

    /**
     * 绑定事件
     */
    attachEvents() {
        this.inputElement.addEventListener('input', () => this.update());
        this.inputElement.addEventListener('paste', () => {
            // 延迟更新以确保粘贴内容已经被处理
            setTimeout(() => this.update(), 10);
        });
    }

    /**
     * 更新计数显示
     */
    update() {
        const currentLength = this.inputElement.value.length;
        const remaining = this.maxLength - currentLength;
        const percentage = currentLength / this.maxLength;

        // 更新显示文本
        let text;
        if (this.options.showRemaining) {
            text = remaining >= 0 ? `剩余 ${remaining} 字符` : `超出 ${Math.abs(remaining)} 字符`;
        } else {
            text = `${currentLength} / ${this.maxLength}`;
        }
        
        this.counterElement.textContent = text;

        // 更新样式状态
        this.counterElement.classList.remove('warning', 'error', 'normal');
        
        if (percentage >= this.options.errorThreshold || remaining < 0) {
            this.counterElement.classList.add('error');
            this.inputElement.classList.add('field-error');
        } else if (percentage >= this.options.warningThreshold) {
            this.counterElement.classList.add('warning');
            this.inputElement.classList.remove('field-error');
        } else {
            this.counterElement.classList.add('normal');
            this.inputElement.classList.remove('field-error');
        }
    }

    /**
     * 添加样式
     */
    addStyles() {
        if (!document.getElementById('character-counter-styles')) {
            const style = document.createElement('style');
            style.id = 'character-counter-styles';
            style.textContent = `
                .character-counter {
                    font-size: 12px;
                    margin-top: 4px;
                    text-align: right;
                    transition: color 0.2s ease;
                }

                .character-counter.normal {
                    color: #666;
                }

                .character-counter.warning {
                    color: #f59e0b;
                    font-weight: 500;
                }

                .character-counter.error {
                    color: #ef4444;
                    font-weight: 600;
                }

                .field-error {
                    border-color: #ef4444 !important;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
                }

                .field-success {
                    border-color: #10b981 !important;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
                }

                .field-error-message {
                    color: #ef4444;
                    font-size: 12px;
                    margin-top: 4px;
                    display: block;
                }

                @keyframes shake-error {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
                    20%, 40%, 60%, 80% { transform: translateX(3px); }
                }

                .shake-error {
                    animation: shake-error 0.5s ease-in-out;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * 获取当前状态
     */
    getStatus() {
        const currentLength = this.inputElement.value.length;
        const remaining = this.maxLength - currentLength;
        const percentage = currentLength / this.maxLength;

        return {
            currentLength,
            maxLength: this.maxLength,
            remaining,
            percentage,
            isValid: remaining >= 0,
            isWarning: percentage >= this.options.warningThreshold && remaining >= 0,
            isError: percentage >= this.options.errorThreshold || remaining < 0
        };
    }
}

/**
 * 加载指示器
 */
class LoadingIndicator {
    constructor() {
        this.overlay = null;
        this.setupStyles();
    }

    /**
     * 显示加载指示器
     */
    show(message = '处理中...', options = {}) {
        this.hide(); // 确保之前的已隐藏
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'loading-overlay';
        
        this.overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
                ${options.progress !== undefined ? 
                    `<div class="loading-progress">
                        <div class="loading-progress-bar" style="width: ${options.progress}%"></div>
                    </div>` : ''
                }
            </div>
        `;
        
        document.body.appendChild(this.overlay);
        
        // 触发显示动画
        requestAnimationFrame(() => {
            this.overlay.classList.add('show');
        });

        // 自动隐藏（如果指定）
        if (options.duration) {
            setTimeout(() => {
                this.hide();
            }, options.duration);
        }
    }

    /**
     * 更新进度
     */
    updateProgress(progress, message = null) {
        if (!this.overlay) return;
        
        const progressBar = this.overlay.querySelector('.loading-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (message) {
            const messageElement = this.overlay.querySelector('.loading-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }

    /**
     * 隐藏加载指示器
     */
    hide() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.classList.remove('show');
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
                this.overlay = null;
            }, 300);
        }
    }

    /**
     * 设置样式
     */
    setupStyles() {
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .loading-overlay.show {
                    opacity: 1;
                }

                .loading-content {
                    background: white;
                    padding: 32px;
                    border-radius: 12px;
                    text-align: center;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                    max-width: 300px;
                    width: 90%;
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f4f6;
                    border-top: 4px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                }

                .loading-message {
                    color: #374151;
                    font-size: 14px;
                    margin-bottom: 16px;
                }

                .loading-progress {
                    background: #f3f4f6;
                    height: 8px;
                    border-radius: 4px;
                    overflow: hidden;
                }

                .loading-progress-bar {
                    height: 100%;
                    background: #3b82f6;
                    transition: width 0.3s ease;
                    border-radius: 4px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// 创建全局实例
const messageDisplay = new MessageDisplay();
const loadingIndicator = new LoadingIndicator();

// 导出模块
export {
    MessageDisplay,
    FormValidationFeedback,
    CharacterCounter,
    LoadingIndicator,
    MESSAGE_TYPES,
    ANIMATION_TYPES,
    messageDisplay,
    loadingIndicator
};
