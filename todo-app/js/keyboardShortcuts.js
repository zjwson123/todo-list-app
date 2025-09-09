/**
 * 键盘快捷键系统
 * 为Todo应用提供快捷键支持，提升操作效率
 */

class KeyboardShortcutManager {
    constructor() {
        this.shortcuts = new Map();
        this.isEnabled = true;
        this.activeModifiers = {
            ctrl: false,
            shift: false,
            alt: false,
            meta: false
        };
        this.currentContext = 'global'; // global, edit, modal
        this.initialize();
    }

    // 初始化快捷键系统
    initialize() {
        this.registerDefaultShortcuts();
        this.bindGlobalEvents();
        this.showShortcutHints();
    }

    // 注册默认快捷键
    registerDefaultShortcuts() {
        // 任务管理快捷键
        this.register('global', 'ctrl+n', {
            description: '新建任务',
            action: () => this.focusAddTodoInput()
        });

        this.register('global', 'ctrl+enter', {
            description: '快速添加任务',
            action: () => this.quickAddTodo()
        });

        this.register('global', 'escape', {
            description: '取消当前操作',
            action: () => this.cancelCurrentOperation()
        });

        // 过滤器快捷键
        this.register('global', 'ctrl+1', {
            description: '显示所有任务',
            action: () => this.setFilter('all')
        });

        this.register('global', 'ctrl+2', {
            description: '显示待完成任务',
            action: () => this.setFilter('active')
        });

        this.register('global', 'ctrl+3', {
            description: '显示已完成任务',
            action: () => this.setFilter('completed')
        });

        // 导航快捷键
        this.register('global', 'ctrl+h', {
            description: '回到主页',
            action: () => this.navigateToPage('home')
        });

        this.register('global', 'ctrl+a', {
            description: '分析页面',
            action: () => this.navigateToPage('analytics')
        });

        this.register('global', 'ctrl+s', {
            description: '设置页面',
            action: () => this.navigateToPage('settings')
        });

        // 任务操作快捷键
        this.register('global', 'ctrl+d', {
            description: '删除选中任务',
            action: () => this.deleteSelectedTasks()
        });

        this.register('global', 'ctrl+shift+c', {
            description: '清除已完成任务',
            action: () => this.clearCompletedTasks()
        });

        // 编辑模式快捷键
        this.register('edit', 'ctrl+s', {
            description: '保存编辑',
            action: () => this.saveCurrentEdit()
        });

        this.register('edit', 'escape', {
            description: '取消编辑',
            action: () => this.cancelCurrentEdit()
        });

        // 任务选择快捷键
        this.register('global', 'arrowup', {
            description: '选择上一个任务',
            action: () => this.selectPreviousTask()
        });

        this.register('global', 'arrowdown', {
            description: '选择下一个任务',
            action: () => this.selectNextTask()
        });

        this.register('global', 'space', {
            description: '切换任务完成状态',
            action: () => this.toggleSelectedTask()
        });

        this.register('global', 'enter', {
            description: '编辑选中任务',
            action: () => this.editSelectedTask()
        });

        // 帮助快捷键
        this.register('global', 'ctrl+/', {
            description: '显示快捷键帮助',
            action: () => this.showShortcutHelp()
        });
    }

    // 注册快捷键
    register(context, keyCombo, options) {
        const key = `${context}:${keyCombo.toLowerCase()}`;
        this.shortcuts.set(key, {
            context,
            keyCombo: keyCombo.toLowerCase(),
            description: options.description,
            action: options.action,
            enabled: options.enabled !== false
        });
    }

    // 注销快捷键
    unregister(context, keyCombo) {
        const key = `${context}:${keyCombo.toLowerCase()}`;
        this.shortcuts.delete(key);
    }

    // 绑定全局事件
    bindGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if (!this.isEnabled) return;
            
            this.updateModifiers(e);
            this.handleKeyDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.updateModifiers(e);
        });

        // 监听上下文变化
        this.observeContextChanges();
    }

    // 更新修饰键状态
    updateModifiers(e) {
        this.activeModifiers.ctrl = e.ctrlKey;
        this.activeModifiers.shift = e.shiftKey;
        this.activeModifiers.alt = e.altKey;
        this.activeModifiers.meta = e.metaKey;
    }

    // 处理按键事件
    handleKeyDown(e) {
        const keyCombo = this.buildKeyCombo(e);
        const shortcut = this.findShortcut(keyCombo);

        if (shortcut && shortcut.enabled) {
            // 检查是否应该阻止默认行为
            if (this.shouldPreventDefault(e, shortcut)) {
                e.preventDefault();
                e.stopPropagation();
            }

            try {
                shortcut.action(e);
                this.logShortcutUsage(shortcut);
            } catch (error) {
                console.error('快捷键执行失败:', error);
            }
        }
    }

    // 构建键位组合字符串
    buildKeyCombo(e) {
        const parts = [];
        
        if (e.ctrlKey) parts.push('ctrl');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        if (e.metaKey) parts.push('meta');
        
        // 处理特殊键
        const key = e.key.toLowerCase();
        if (key === ' ') {
            parts.push('space');
        } else if (key === 'escape') {
            parts.push('escape');
        } else if (key === 'enter') {
            parts.push('enter');
        } else if (key.startsWith('arrow')) {
            parts.push(key);
        } else if (key.length === 1 || /^f\d+$/.test(key)) {
            parts.push(key);
        }

        return parts.join('+');
    }

    // 查找快捷键
    findShortcut(keyCombo) {
        // 先查找当前上下文的快捷键
        let shortcut = this.shortcuts.get(`${this.currentContext}:${keyCombo}`);
        
        // 如果没找到，查找全局快捷键
        if (!shortcut) {
            shortcut = this.shortcuts.get(`global:${keyCombo}`);
        }

        return shortcut;
    }

    // 是否应该阻止默认行为
    shouldPreventDefault(e, shortcut) {
        // 如果是输入框内的编辑快捷键，不阻止默认行为
        if (this.isInInputElement(e.target)) {
            const inputShortcuts = ['ctrl+s', 'escape'];
            return inputShortcuts.includes(shortcut.keyCombo);
        }

        // 阻止大部分自定义快捷键的默认行为
        return true;
    }

    // 检查是否在输入元素中
    isInInputElement(element) {
        return element && (
            element.tagName === 'INPUT' || 
            element.tagName === 'TEXTAREA' || 
            element.contentEditable === 'true'
        );
    }

    // 观察上下文变化
    observeContextChanges() {
        // 监听编辑状态
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const editForm = document.querySelector('.edit-form');
                    this.currentContext = editForm ? 'edit' : 'global';
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 监听焦点变化
        document.addEventListener('focusin', (e) => {
            if (this.isInInputElement(e.target)) {
                this.currentContext = 'edit';
            }
        });

        document.addEventListener('focusout', (e) => {
            if (this.isInInputElement(e.target)) {
                setTimeout(() => {
                    if (!this.isInInputElement(document.activeElement)) {
                        this.currentContext = 'global';
                    }
                }, 100);
            }
        });
    }

    // 快捷键行为实现
    focusAddTodoInput() {
        const input = document.getElementById('todoInput');
        if (input) {
            input.focus();
            // 确保在主页
            if (window.location.hash !== '#home' && window.location.hash !== '') {
                window.location.hash = '#home';
            }
        }
    }

    quickAddTodo() {
        const input = document.getElementById('todoInput');
        if (input && input.value.trim()) {
            const form = document.getElementById('addTodoForm');
            if (form) {
                form.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        } else {
            this.focusAddTodoInput();
        }
    }

    cancelCurrentOperation() {
        // 取消编辑
        const cancelBtn = document.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.click();
            return;
        }

        // 清空输入框
        const input = document.getElementById('todoInput');
        if (input && document.activeElement === input) {
            input.value = '';
            input.blur();
        }

        // 关闭帮助弹窗
        this.hideShortcutHelp();
    }

    setFilter(filter) {
        const filterBtn = document.querySelector(`[data-filter="${filter}"]`);
        if (filterBtn) {
            filterBtn.click();
        }
    }

    navigateToPage(page) {
        const navLink = document.querySelector(`[data-route="${page}"]`);
        if (navLink) {
            navLink.click();
        } else {
            window.location.hash = `#${page}`;
        }
    }

    deleteSelectedTasks() {
        const selectedTask = this.getSelectedTask();
        if (selectedTask) {
            const deleteBtn = selectedTask.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.click();
            }
        }
    }

    clearCompletedTasks() {
        const clearBtn = document.getElementById('clearCompletedBtn');
        if (clearBtn && !clearBtn.disabled) {
            clearBtn.click();
        }
    }

    saveCurrentEdit() {
        const saveBtn = document.querySelector('.save-btn');
        if (saveBtn) {
            saveBtn.click();
        }
    }

    cancelCurrentEdit() {
        const cancelBtn = document.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.click();
        }
    }

    // 任务选择功能
    getSelectedTask() {
        return document.querySelector('.todo-item.selected');
    }

    selectTask(taskElement) {
        // 清除之前的选择
        document.querySelectorAll('.todo-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // 选择新任务
        if (taskElement) {
            taskElement.classList.add('selected');
            taskElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    selectPreviousTask() {
        const tasks = Array.from(document.querySelectorAll('.todo-item'));
        const selected = this.getSelectedTask();
        
        if (!selected && tasks.length > 0) {
            this.selectTask(tasks[0]);
        } else if (selected) {
            const currentIndex = tasks.indexOf(selected);
            const prevIndex = Math.max(0, currentIndex - 1);
            this.selectTask(tasks[prevIndex]);
        }
    }

    selectNextTask() {
        const tasks = Array.from(document.querySelectorAll('.todo-item'));
        const selected = this.getSelectedTask();
        
        if (!selected && tasks.length > 0) {
            this.selectTask(tasks[0]);
        } else if (selected) {
            const currentIndex = tasks.indexOf(selected);
            const nextIndex = Math.min(tasks.length - 1, currentIndex + 1);
            this.selectTask(tasks[nextIndex]);
        }
    }

    toggleSelectedTask() {
        const selected = this.getSelectedTask();
        if (selected) {
            const checkbox = selected.querySelector('.todo-checkbox');
            if (checkbox) {
                checkbox.click();
            }
        }
    }

    editSelectedTask() {
        const selected = this.getSelectedTask();
        if (selected) {
            const editBtn = selected.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.click();
            }
        }
    }

    // 显示快捷键提示
    showShortcutHints() {
        // 添加快捷键提示到界面
        const hints = [
            { key: 'Ctrl+N', action: '新建任务' },
            { key: 'Ctrl+/', action: '快捷键帮助' },
            { key: '↑↓', action: '选择任务' },
            { key: 'Space', action: '完成任务' }
        ];

        // 创建提示栏
        const hintBar = document.createElement('div');
        hintBar.id = 'shortcut-hints';
        hintBar.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            padding: var(--spacing-2);
            font-size: 12px;
            color: var(--text-secondary);
            z-index: 1000;
            display: flex;
            gap: 15px;
            opacity: 0.8;
            transition: opacity 0.3s;
        `;

        hints.forEach(hint => {
            const hintElement = document.createElement('span');
            hintElement.innerHTML = `<kbd style="background: var(--bg-primary); padding: 2px 6px; border-radius: 3px; font-size: 11px;">${hint.key}</kbd> ${hint.action}`;
            hintBar.appendChild(hintElement);
        });

        document.body.appendChild(hintBar);

        // 鼠标悬停时显示完整提示
        hintBar.addEventListener('mouseenter', () => {
            hintBar.style.opacity = '1';
        });

        hintBar.addEventListener('mouseleave', () => {
            hintBar.style.opacity = '0.8';
        });
    }

    // 显示快捷键帮助
    showShortcutHelp() {
        // 检查是否已经显示
        if (document.getElementById('shortcut-help-modal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'shortcut-help-modal';
        modal.style.cssText = `
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
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--bg-primary);
            border-radius: var(--border-radius);
            padding: var(--spacing-4);
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;

        // 生成快捷键列表
        const shortcuts = Array.from(this.shortcuts.values())
            .filter(s => s.enabled)
            .sort((a, b) => a.context.localeCompare(b.context));

        const groupedShortcuts = {};
        shortcuts.forEach(shortcut => {
            if (!groupedShortcuts[shortcut.context]) {
                groupedShortcuts[shortcut.context] = [];
            }
            groupedShortcuts[shortcut.context].push(shortcut);
        });

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-3);">
                <h2 style="margin: 0; color: var(--text-primary);">快捷键帮助</h2>
                <button id="close-help" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-secondary);">&times;</button>
            </div>
        `;

        Object.entries(groupedShortcuts).forEach(([context, contextShortcuts]) => {
            const contextName = context === 'global' ? '全局' : context === 'edit' ? '编辑模式' : context;
            html += `<h3 style="color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: var(--spacing-1);">${contextName}</h3>`;
            html += `<div style="display: grid; grid-template-columns: 1fr 2fr; gap: var(--spacing-2); margin-bottom: var(--spacing-3);">`;
            
            contextShortcuts.forEach(shortcut => {
                const keyCombo = shortcut.keyCombo
                    .split('+')
                    .map(key => `<kbd style="background: var(--bg-secondary); padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 12px;">${key}</kbd>`)
                    .join(' + ');
                
                html += `
                    <div style="color: var(--text-primary);">${keyCombo}</div>
                    <div style="color: var(--text-secondary);">${shortcut.description}</div>
                `;
            });
            
            html += `</div>`;
        });

        content.innerHTML = html;
        modal.appendChild(content);
        document.body.appendChild(modal);

        // 绑定关闭事件
        const closeBtn = content.querySelector('#close-help');
        const closeHandler = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeHandler);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeHandler();
            }
        });

        // ESC键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeHandler();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // 隐藏快捷键帮助
    hideShortcutHelp() {
        const modal = document.getElementById('shortcut-help-modal');
        if (modal) {
            modal.remove();
        }
    }

    // 记录快捷键使用情况
    logShortcutUsage(shortcut) {
        // 可以用于分析用户使用习惯
        console.log(`快捷键使用: ${shortcut.keyCombo} - ${shortcut.description}`);
    }

    // 启用/禁用快捷键系统
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    // 获取所有快捷键
    getAllShortcuts() {
        return Array.from(this.shortcuts.values());
    }

    // 重置为默认快捷键
    resetToDefaults() {
        this.shortcuts.clear();
        this.registerDefaultShortcuts();
    }
}

// 添加任务选择样式
const style = document.createElement('style');
style.textContent = `
    .todo-item.selected {
        background-color: var(--primary-color-light, rgba(76, 175, 80, 0.1)) !important;
        border-left: 3px solid var(--primary-color) !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
    }

    .todo-item.selected .todo-content {
        transform: translateX(2px);
    }

    kbd {
        display: inline-block;
        padding: 2px 6px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 3px;
        font-family: monospace;
        font-size: 11px;
        line-height: 1.2;
    }

    #shortcut-hints {
        animation: slideInRight 0.3s ease-out;
    }

    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 0.8;
        }
    }

    #shortcut-help-modal {
        animation: fadeIn 0.2s ease-out;
    }

    #shortcut-help-modal > div {
        animation: slideInUp 0.3s ease-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideInUp {
        from {
            transform: translateY(30px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// 创建全局实例
const keyboardShortcutManager = new KeyboardShortcutManager();

// 导出模块
export { KeyboardShortcutManager, keyboardShortcutManager };