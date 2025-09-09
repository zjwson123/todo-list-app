/**
 * Todo App 主入口模块
 * 纯 JavaScript 实现，无框架依赖
 */

// 导入路由和设置模块
import { router, pageRenderer } from './router.js';
import { settingsManager } from './settings.js';

// 导入分析模块
import { AnalyticsEngine } from './analytics.js';
import { ChartManager } from './chartManager.js';

// 导入版本管理和迁移模块
import { versionManager, setVersion, CURRENT_VERSION } from './dataVersion.js';
import { migrationManager, MigrationNotifier } from './migration.js';

// 导入数据验证和用户反馈模块
import { 
    TodoValidator, 
    ErrorHandler, 
    SecuritySanitizer, 
    DataIntegrityChecker, 
    ValidationError, 
    StorageError 
} from './validator.js';
import { 
    messageDisplay, 
    FormValidationFeedback, 
    CharacterCounter, 
    loadingIndicator,
    MESSAGE_TYPES 
} from './uiFeedback.js';

// 导入键盘快捷键模块
import { keyboardShortcutManager } from './keyboardShortcuts.js';

// 导入拖拽排序模块
import { dragSortManager } from './dragSort.js';

// 导入番茄工作法计时器
import { pomodoroTimer } from './pomodoroTimer.js';

// 导入成就系统
import { achievementSystem } from './achievementSystem.js';

// 应用状态管理
class TodoState {
    constructor() {
        this.currentFilter = 'all'; // all, active, completed
        this.migrationCompleted = false;
        this.initializeData();
    }

    // 初始化数据 - 包含版本检查和迁移
    async initializeData() {
        try {
            console.log('开始初始化应用数据...');
            
            // 检查并执行数据迁移
            const migrationResult = await migrationManager.checkAndMigrate();
            
            // 显示迁移结果
            MigrationNotifier.showMigrationResult(migrationResult);
            
            // 加载数据
            this.todos = this.loadTodos();
            this.migrationCompleted = true;
            
            // 确保数据版本正确（新用户情况）
            if (!migrationResult.migrated && versionManager.getStoredVersion() === '1.0') {
                // 新用户，设置为最新版本
                setVersion(CURRENT_VERSION);
                console.log(`新用户，数据版本设置为 ${CURRENT_VERSION}`);
            }
            
            console.log(`数据初始化完成，当前版本: ${versionManager.getStoredVersion()}`);
            
        } catch (error) {
            console.error('数据初始化失败:', error);
            // 即使迁移失败，也要加载现有数据
            this.todos = this.loadTodos();
            this.migrationCompleted = true;
        }
    }

    // 从 localStorage 加载数据 - 增强版本，包含验证
    loadTodos() {
        try {
            const stored = localStorage.getItem('todos');
            if (!stored) return [];
            
            const rawData = JSON.parse(stored);
            
            // 批量验证数据完整性
            const validationResult = DataIntegrityChecker.validateBatch(rawData);
            
            if (validationResult.errors.length > 0) {
                console.warn('加载数据时发现问题:', validationResult.errors);
                
                // 如果有有效数据，使用清理后的数据
                if (validationResult.validCount > 0) {
                    const cleanedData = DataIntegrityChecker.cleanData(rawData);
                    messageDisplay.warning(
                        `数据加载完成，发现并修复了 ${validationResult.errors.length} 个问题`,
                        {
                            title: '数据修复',
                            details: `成功加载 ${validationResult.validCount}/${validationResult.totalCount} 条数据`
                        }
                    );
                    return cleanedData;
                } else {
                    messageDisplay.error('数据文件损坏，已重置为空', {
                        title: '数据加载失败'
                    });
                    return [];
                }
            }
            
            return rawData;
        } catch (error) {
            console.error('Error loading todos:', error);
            messageDisplay.error('数据加载失败，请检查存储权限', {
                title: '加载错误'
            });
            return [];
        }
    }

    // 保存数据到 localStorage - 增强版本，包含错误处理
    saveTodos() {
        try {
            // 验证数据完整性后保存
            const validationResult = DataIntegrityChecker.validateBatch(this.todos);
            
            if (validationResult.errors.length > 0) {
                console.warn('保存数据前发现问题:', validationResult.errors);
                // 清理数据
                this.todos = DataIntegrityChecker.cleanData(this.todos);
            }
            
            localStorage.setItem('todos', JSON.stringify(this.todos));
        } catch (error) {
            console.error('Error saving todos:', error);
            
            if (error.name === 'QuotaExceededError') {
                messageDisplay.error('存储空间不足，无法保存数据', {
                    title: '存储错误',
                    details: '请清理浏览器缓存或删除一些任务'
                });
            } else {
                messageDisplay.error('数据保存失败，请稍后重试', {
                    title: '保存错误'
                });
            }
            
            throw new StorageError('数据保存失败', 'save');
        }
    }

    // 添加新任务 - 增强版本，包含验证
    addTodo(title, description = '') {
        try {
            // 预处理数据
            const todoData = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                title: title.trim(),
                description: description.trim(),
                completed: false,
                createTime: new Date().toISOString()
            };

            // 数据验证
            const validationErrors = TodoValidator.validate(todoData, {
                checkDuplicates: true,
                existingTodos: this.todos
            });

            if (validationErrors.length > 0) {
                const errorSummary = ErrorHandler.generateErrorSummary(validationErrors);
                messageDisplay.error(errorSummary, {
                    title: '任务添加失败',
                    animation: 'shake'
                });
                return null;
            }

            // 数据预处理和安全清理
            const processedTodo = TodoValidator.preprocess(todoData);
            
            // 添加到列表
            this.todos.unshift(processedTodo);
            this.saveTodos();
            
            // 触发任务创建事件（成就系统）
            document.dispatchEvent(new CustomEvent('todoCreated', { 
                detail: processedTodo 
            }));
            
            // 显示成功消息
            messageDisplay.success('任务添加成功', {
                duration: 2000,
                animation: 'bounce'
            });
            
            return processedTodo;
        } catch (error) {
            console.error('添加任务失败:', error);
            messageDisplay.error('任务添加失败，请稍后重试', {
                title: '操作错误'
            });
            return null;
        }
    }

    // 切换任务完成状态
    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            const wasCompleted = todo.completed;
            todo.completed = !todo.completed;
            todo.updateTime = new Date().toISOString();
            
            // 如果从未完成变为完成，触发完成事件
            if (!wasCompleted && todo.completed) {
                document.dispatchEvent(new CustomEvent('todoCompleted', { 
                    detail: todo 
                }));
            }
            
            this.saveTodos();
        }
        return todo;
    }

    // 删除任务
    deleteTodo(id) {
        const index = this.todos.findIndex(t => t.id === id);
        if (index > -1) {
            const deleted = this.todos.splice(index, 1)[0];
            this.saveTodos();
            return deleted;
        }
        return null;
    }

    // 编辑任务 - 增强版本，包含验证
    editTodo(id, newTitle, newDescription = null) {
        try {
            const todo = this.todos.find(t => t.id === id);
            if (!todo) {
                messageDisplay.error('任务不存在', { title: '编辑失败' });
                return null;
            }

            // 准备更新数据
            const updatedData = {
                ...todo,
                title: newTitle.trim(),
                description: newDescription !== null ? newDescription.trim() : todo.description,
                updateTime: new Date().toISOString()
            };

            // 数据验证
            const validationErrors = TodoValidator.validate(updatedData, {
                checkDuplicates: true,
                existingTodos: this.todos,
                excludeId: id
            });

            if (validationErrors.length > 0) {
                const errorSummary = ErrorHandler.generateErrorSummary(validationErrors);
                messageDisplay.warning(errorSummary, {
                    title: '编辑验证失败'
                });
                return null;
            }

            // 数据预处理和安全清理
            const processedData = TodoValidator.preprocess(updatedData);
            
            // 更新数据
            Object.assign(todo, processedData);
            this.saveTodos();
            
            // 显示成功消息
            messageDisplay.success('任务更新成功', {
                duration: 1500
            });
            
            return todo;
        } catch (error) {
            console.error('编辑任务失败:', error);
            messageDisplay.error('任务编辑失败，请稍后重试', {
                title: '操作错误'
            });
            return null;
        }
    }

    // 清除已完成的任务
    clearCompleted() {
        const removed = this.todos.filter(t => t.completed);
        this.todos = this.todos.filter(t => !t.completed);
        this.saveTodos();
        return removed;
    }

    // 获取过滤后的任务
    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
    }

    // 任务排序
    sortTodos(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;

        // 获取当前过滤后的任务列表
        const filteredTodos = this.getFilteredTodos();
        
        if (fromIndex < 0 || fromIndex >= filteredTodos.length ||
            toIndex < 0 || toIndex > filteredTodos.length) {
            console.warn('排序索引超出范围');
            return;
        }

        // 从过滤列表中移除要移动的项目
        const [movedItem] = filteredTodos.splice(fromIndex, 1);
        
        // 插入到新位置
        filteredTodos.splice(toIndex, 0, movedItem);

        // 重新构建完整的todos数组，保持其他状态的任务位置不变
        if (this.currentFilter === 'all') {
            // 如果是显示全部，直接使用重排后的数组
            this.todos = filteredTodos;
        } else {
            // 如果是过滤状态，需要重新合并
            const otherTodos = this.todos.filter(todo => !filteredTodos.includes(todo));
            this.todos = [...filteredTodos, ...otherTodos];
        }

        this.saveTodos();
        console.log(`任务排序完成: ${fromIndex} -> ${toIndex}`);
    }

    // 获取统计数据
    getStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const active = total - completed;

        return {
            total,
            completed,
            active,
            hasCompleted: completed > 0
        };
    }
}

// UI 渲染管理
class TodoRenderer {
    constructor(state) {
        this.state = state;
        this.elements = this.initializeElements();
    }

    initializeElements() {
        return {
            todoList: document.getElementById('todoList'),
            emptyState: document.getElementById('emptyState'),
            listFooter: document.getElementById('listFooter'),
            allCount: document.getElementById('allCount'),
            activeCount: document.getElementById('activeCount'),
            completedCount: document.getElementById('completedCount'),
            remainingCount: document.getElementById('remainingCount'),
            clearCompletedBtn: document.getElementById('clearCompletedBtn'),
            filterBtns: document.querySelectorAll('.filter-btn')
        };
    }

    // 渲染单个任务项
    renderTodoItem(todo) {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.dataset.todoId = todo.id;
        
        const hasDescription = todo.description && todo.description.trim();
        
        li.innerHTML = `
            <div class="todo-content ${todo.completed ? 'completed' : ''}">
                <label class="todo-checkbox-label">
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <div class="todo-info">
                    <div class="todo-title" title="${this.escapeHtml(todo.title)}">
                        ${this.escapeHtml(todo.title)}
                    </div>
                    ${hasDescription ? `
                        <div class="todo-description" title="${this.escapeHtml(todo.description)}">
                            ${this.escapeHtml(todo.description)}
                        </div>
                    ` : ''}
                </div>
                <div class="todo-actions">
                    <button class="edit-btn" title="编辑" aria-label="编辑任务">
                        <span class="edit-icon">✏️</span>
                    </button>
                    <button class="delete-btn" title="删除" aria-label="删除任务">
                        <span class="delete-icon">🗑️</span>
                    </button>
                </div>
            </div>
        `;

        return li;
    }

    // 渲染任务列表
    renderTodoList() {
        const todos = this.state.getFilteredTodos();
        const { elements } = this;

        // 清空现有列表
        elements.todoList.innerHTML = '';

        // 显示/隐藏空状态
        if (todos.length === 0) {
            elements.emptyState.style.display = 'block';
            elements.listFooter.style.display = 'none';
        } else {
            elements.emptyState.style.display = 'none';
            elements.listFooter.style.display = 'flex';

            // 渲染每个任务项
            todos.forEach(todo => {
                const todoElement = this.renderTodoItem(todo);
                elements.todoList.appendChild(todoElement);
            });
        }
    }

    // 更新统计数据
    updateStats() {
        const stats = this.state.getStats();
        const { elements } = this;

        elements.allCount.textContent = stats.total;
        elements.activeCount.textContent = stats.active;
        elements.completedCount.textContent = stats.completed;
        elements.remainingCount.textContent = stats.active;

        // 更新清除按钮状态
        elements.clearCompletedBtn.disabled = !stats.hasCompleted;
    }

    // 更新过滤器状态
    updateFilterButtons() {
        this.elements.filterBtns.forEach(btn => {
            const filter = btn.dataset.filter;
            btn.classList.toggle('active', filter === this.state.currentFilter);
        });
    }

    // HTML 转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 完整重新渲染
    render() {
        this.renderTodoList();
        this.updateStats();
        this.updateFilterButtons();
    }
}

// 应用主控制器
class TodoApp {
    constructor() {
        this.state = new TodoState();
        this.renderer = new TodoRenderer(this.state);
        this.initialized = false;
        this.characterCounters = new Map(); // 字符计数器映射
        this.formValidators = new Map(); // 表单验证器映射
        this.initialize();
    }

    // 异步初始化应用
    async initialize() {
        try {
            // 等待数据迁移完成
            while (!this.state.migrationCompleted) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // 初始化事件监听器和渲染
            this.initializeEventListeners();
            this.renderer.render();
            
            // 初始化键盘快捷键系统
            this.initializeKeyboardShortcuts();
            
            // 初始化拖拽排序系统
            this.initializeDragSort();
            
            // 初始化番茄工作法计时器
            this.initializePomodoroTimer();
            
            this.initialized = true;
            
            console.log('TodoApp 初始化完成');
        } catch (error) {
            console.error('TodoApp 初始化失败:', error);
            // 即使出错也要继续初始化基本功能
            this.initializeEventListeners();
            this.renderer.render();
            this.initialized = true;
        }
    }

    initializeEventListeners() {
        // 添加任务表单
        const addForm = document.getElementById('addTodoForm');
        const todoInput = document.getElementById('todoInput');
        const todoDescription = document.getElementById('todoDescription');
        const toggleDescriptionBtn = document.getElementById('toggleDescriptionBtn');

        // 初始化字符计数器
        this.initializeCharacterCounters(todoInput, todoDescription);
        
        // 初始化表单实时验证
        this.initializeFormValidation(todoInput, todoDescription);

        // 切换描述输入框显示/隐藏
        if (toggleDescriptionBtn && todoDescription) {
            toggleDescriptionBtn.addEventListener('click', () => {
                const isVisible = todoDescription.style.display !== 'none';
                todoDescription.style.display = isVisible ? 'none' : 'block';
                toggleDescriptionBtn.title = isVisible ? '添加描述' : '隐藏描述';
                
                if (!isVisible) {
                    setTimeout(() => todoDescription.focus(), 100);
                }
            });
        }

        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // 清除之前的错误状态
            FormValidationFeedback.clearFormErrors(addForm);
            
            const title = todoInput.value.trim();
            const description = todoDescription ? todoDescription.value.trim() : '';
            
            // 前端验证
            const validationErrors = this.validateFormData(title, description);
            if (validationErrors.length > 0) {
                FormValidationFeedback.setFormErrors(validationErrors);
                return;
            }
            
            // 添加任务
            const newTodo = this.state.addTodo(title, description);
            if (newTodo) {
                // 清空表单
                todoInput.value = '';
                if (todoDescription) {
                    todoDescription.value = '';
                    todoDescription.style.display = 'none';
                    if (toggleDescriptionBtn) {
                        toggleDescriptionBtn.title = '添加描述';
                    }
                }
                
                // 设置成功状态
                FormValidationFeedback.setFieldSuccess(todoInput);
                
                // 重新渲染
                this.renderer.render();
            }
        });

        // 任务列表事件委托
        this.renderer.elements.todoList.addEventListener('click', (e) => {
            const todoItem = e.target.closest('.todo-item');
            if (!todoItem) return;

            const todoId = todoItem.dataset.todoId;

            if (e.target.classList.contains('todo-checkbox')) {
                this.state.toggleTodo(todoId);
                this.renderer.render();
            } else if (e.target.closest('.delete-btn')) {
                this.state.deleteTodo(todoId);
                this.renderer.render();
            } else if (e.target.closest('.edit-btn')) {
                this.handleEditTodo(todoItem, todoId);
            }
        });

        // 过滤器按钮
        this.renderer.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.currentFilter = btn.dataset.filter;
                this.renderer.render();
            });
        });

        // 清除已完成按钮
        this.renderer.elements.clearCompletedBtn.addEventListener('click', () => {
            if (confirm('确定要清除所有已完成的任务吗？')) {
                this.state.clearCompleted();
                this.renderer.render();
            }
        });
    }

    // 处理编辑任务
    handleEditTodo(todoItem, todoId) {
        const todo = this.state.todos.find(t => t.id === todoId);
        if (!todo) return;

        const todoInfo = todoItem.querySelector('.todo-info');
        const todoTitle = todoItem.querySelector('.todo-title');
        const todoDescription = todoItem.querySelector('.todo-description');
        
        // 创建编辑表单
        const editForm = document.createElement('form');
        editForm.className = 'edit-form';
        editForm.innerHTML = `
            <input type="text" class="edit-title-input" value="${this.escapeHtml(todo.title)}" 
                   placeholder="任务标题" required maxlength="200">
            <textarea class="edit-description-input" placeholder="任务描述（可选）" 
                      maxlength="500" rows="2">${this.escapeHtml(todo.description)}</textarea>
            <div class="edit-actions">
                <button type="submit" class="save-btn">保存</button>
                <button type="button" class="cancel-btn">取消</button>
            </div>
        `;

        // 样式化编辑表单
        Object.assign(editForm.style, {
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-2)'
        });

        const titleInput = editForm.querySelector('.edit-title-input');
        const descriptionInput = editForm.querySelector('.edit-description-input');
        const saveBtn = editForm.querySelector('.save-btn');
        const cancelBtn = editForm.querySelector('.cancel-btn');

        // 样式化输入框并添加字符计数器
        [titleInput, descriptionInput].forEach(input => {
            Object.assign(input.style, {
                width: '100%',
                border: '1px solid var(--primary-color)',
                borderRadius: 'var(--border-radius-sm)',
                padding: 'var(--spacing-2)',
                fontSize: 'inherit',
                fontFamily: 'inherit',
                resize: input.tagName === 'TEXTAREA' ? 'vertical' : 'none'
            });
            
            // 为编辑表单添加字符计数器
            const maxLength = input.tagName === 'TEXTAREA' ? 1000 : 200;
            new CharacterCounter(input, maxLength, {
                showRemaining: true,
                warningThreshold: 0.8,
                errorThreshold: 0.95
            });
        });

        // 样式化按钮
        Object.assign(saveBtn.style, {
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--border-radius-sm)',
            padding: 'var(--spacing-1) var(--spacing-3)',
            cursor: 'pointer'
        });

        Object.assign(cancelBtn.style, {
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            padding: 'var(--spacing-1) var(--spacing-3)',
            cursor: 'pointer'
        });

        // 保存和取消函数
        const saveEdit = () => {
            const newTitle = titleInput.value.trim();
            const newDescription = descriptionInput.value.trim();
            
            // 前端验证
            const validationErrors = this.validateFormData(newTitle, newDescription);
            if (validationErrors.length > 0) {
                // 显示字段级错误
                validationErrors.forEach(error => {
                    if (error.field === 'title') {
                        FormValidationFeedback.setFieldError(titleInput, error.message);
                    } else if (error.field === 'description') {
                        FormValidationFeedback.setFieldError(descriptionInput, error.message);
                    }
                });
                return;
            }
            
            if (newTitle && (newTitle !== todo.title || newDescription !== todo.description)) {
                const updatedTodo = this.state.editTodo(todoId, newTitle, newDescription);
                if (updatedTodo) {
                    this.renderer.render();
                } else {
                    // 编辑失败，保持编辑状态
                    FormValidationFeedback.setFieldError(titleInput, '编辑失败，请检查输入');
                }
            } else {
                cancelEdit();
            }
        };

        const cancelEdit = () => {
            todoInfo.style.display = '';
            editForm.remove();
        };

        // 事件监听
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveEdit();
        });

        cancelBtn.addEventListener('click', cancelEdit);

        // 实时验证和键盘事件
        titleInput.addEventListener('input', () => {
            FormValidationFeedback.clearFieldError(titleInput);
        });
        
        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });

        descriptionInput.addEventListener('input', () => {
            FormValidationFeedback.clearFieldError(descriptionInput);
        });
        
        descriptionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });

        // 替换内容为编辑表单
        todoInfo.style.display = 'none';
        todoInfo.parentNode.insertBefore(editForm, todoInfo.nextSibling);
        titleInput.focus();
        titleInput.select();
    }

    // 初始化字符计数器
    initializeCharacterCounters(titleInput, descriptionInput) {
        if (titleInput) {
            const titleCounter = new CharacterCounter(titleInput, 200, {
                showRemaining: true,
                warningThreshold: 0.8,
                errorThreshold: 0.95
            });
            this.characterCounters.set('title', titleCounter);
        }

        if (descriptionInput) {
            const descCounter = new CharacterCounter(descriptionInput, 1000, {
                showRemaining: true,
                warningThreshold: 0.8,
                errorThreshold: 0.95
            });
            this.characterCounters.set('description', descCounter);
        }
    }

    // 初始化表单实时验证
    initializeFormValidation(titleInput, descriptionInput) {
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                this.validateFieldRealtime(titleInput, 'title');
            });

            titleInput.addEventListener('blur', () => {
                this.validateFieldRealtime(titleInput, 'title', true);
            });
        }

        if (descriptionInput) {
            descriptionInput.addEventListener('input', () => {
                this.validateFieldRealtime(descriptionInput, 'description');
            });

            descriptionInput.addEventListener('blur', () => {
                this.validateFieldRealtime(descriptionInput, 'description', true);
            });
        }
    }

    // 实时字段验证
    validateFieldRealtime(fieldElement, fieldName, showErrors = false) {
        const value = fieldElement.value.trim();
        
        // 清除之前的错误状态
        FormValidationFeedback.clearFieldError(fieldElement);

        if (!showErrors && !value) {
            // 输入过程中，空值不显示错误
            return true;
        }

        // 创建临时数据进行验证
        const tempData = {
            id: 'temp-id',
            title: fieldName === 'title' ? value : '临时标题',
            description: fieldName === 'description' ? value : '',
            completed: false,
            createTime: new Date().toISOString()
        };

        const errors = TodoValidator.validate(tempData, {
            checkDuplicates: false
        });

        // 过滤出当前字段的错误
        const fieldErrors = errors.filter(error => error.field === fieldName);

        if (fieldErrors.length > 0 && showErrors) {
            FormValidationFeedback.setFieldError(fieldElement, fieldErrors[0].message);
            return false;
        }

        if (fieldErrors.length === 0 && value) {
            // 验证通过，短暂显示成功状态
            FormValidationFeedback.setFieldSuccess(fieldElement);
        }

        return fieldErrors.length === 0;
    }

    // 表单数据验证
    validateFormData(title, description) {
        const errors = [];

        // 基本验证
        if (!title || title.trim() === '') {
            errors.push({
                field: 'title',
                message: '任务标题不能为空',
                code: 'REQUIRED_FIELD'
            });
        }

        if (title && title.length > 200) {
            errors.push({
                field: 'title',
                message: '任务标题不能超过200个字符',
                code: 'INVALID_LENGTH'
            });
        }

        if (description && description.length > 1000) {
            errors.push({
                field: 'description',
                message: '任务描述不能超过1000个字符',
                code: 'INVALID_LENGTH'
            });
        }

        // XSS检查
        if (title && SecuritySanitizer.detectXSS(title)) {
            errors.push({
                field: 'title',
                message: '标题包含不安全内容',
                code: 'SECURITY_THREAT'
            });
        }

        if (description && SecuritySanitizer.detectXSS(description)) {
            errors.push({
                field: 'description',
                message: '描述包含不安全内容',
                code: 'SECURITY_THREAT'
            });
        }

        // 重复检查
        if (title) {
            const isDuplicate = this.state.todos.some(todo => 
                todo.title.toLowerCase().trim() === title.toLowerCase().trim()
            );
            if (isDuplicate) {
                errors.push({
                    field: 'title',
                    message: '相同标题的任务已存在',
                    code: 'DUPLICATE_TITLE'
                });
            }
        }

        return errors;
    }

    // 初始化键盘快捷键系统
    initializeKeyboardShortcuts() {
        // 为键盘快捷键系统提供应用状态和方法的访问接口
        keyboardShortcutManager.todoApp = this;
        
        // 注册应用专用的快捷键行为
        keyboardShortcutManager.register('global', 'ctrl+shift+d', {
            description: '切换暗色主题',
            action: () => this.toggleTheme()
        });

        console.log('键盘快捷键系统初始化完成');
    }

    // 初始化拖拽排序系统
    initializeDragSort() {
        const todoList = document.getElementById('todoList');
        if (!todoList) {
            console.warn('找不到todoList容器，跳过拖拽排序初始化');
            return;
        }

        // 启用拖拽排序
        dragSortManager.enableDragSort(todoList, {
            itemSelector: '.todo-item',
            handleSelector: '.todo-content',
            disabledSelector: '.edit-form',
            onSort: (fromIndex, toIndex) => {
                // 执行排序并重新渲染
                this.state.sortTodos(fromIndex, toIndex);
                this.renderer.render();
                
                // 显示反馈消息
                messageDisplay.success('任务顺序已更新', {
                    duration: 1500,
                    animation: 'bounce'
                });
            }
        });

        console.log('拖拽排序系统初始化完成');
    }

    // 初始化番茄工作法计时器
    initializePomodoroTimer() {
        // 番茄计时器在构造时已经自动初始化
        // 这里可以添加与Todo应用的集成逻辑
        
        // 注册番茄钟相关的快捷键
        keyboardShortcutManager.register('global', 'ctrl+t', {
            description: '开始/暂停番茄钟',
            action: () => this.togglePomodoroTimer()
        });

        keyboardShortcutManager.register('global', 'ctrl+shift+t', {
            description: '重置番茄钟',
            action: () => this.resetPomodoroTimer()
        });

        console.log('番茄工作法计时器初始化完成');
    }

    // 切换番茄计时器状态
    togglePomodoroTimer() {
        if (pomodoroTimer.isRunning && !pomodoroTimer.isPaused) {
            pomodoroTimer.pause();
        } else {
            pomodoroTimer.start();
        }
    }

    // 重置番茄计时器
    resetPomodoroTimer() {
        pomodoroTimer.reset();
    }

    // 切换主题
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // 显示提示信息
        messageDisplay.success(`已切换到${newTheme === 'dark' ? '暗色' : '亮色'}主题`, {
            duration: 1500
        });
    }

    // 提供公共接口给键盘快捷键系统使用
    getState() {
        return this.state;
    }

    getRenderer() {
        return this.renderer;
    }

    // HTML转义（已存在但可能需要更新）
    escapeHtml(text) {
        return SecuritySanitizer.escapeHtml(text);
    }
}

// 应用路由管理
class AppRouter {
    constructor() {
        this.todoApp = null;
        this.init();
    }

    init() {
        // 初始化页面渲染器
        pageRenderer.init();
        
        // 注册页面到渲染器
        const homePage = document.getElementById('home-page');
        const settingsPage = document.getElementById('settings-page');
        const analyticsPage = document.getElementById('analytics-page');
        
        if (homePage) pageRenderer.registerPage('home', homePage);
        if (settingsPage) pageRenderer.registerPage('settings', settingsPage);
        if (analyticsPage) pageRenderer.registerPage('analytics', analyticsPage);

        // 注册路由处理函数
        router.register('home', () => {
            this.showHomePage();
        });

        router.register('settings', () => {
            this.showSettingsPage();
        });

        router.register('analytics', () => {
            this.showAnalyticsPage();
        });

        // 绑定导航事件
        this.bindNavigationEvents();
    }

    // 显示主页
    showHomePage() {
        pageRenderer.showPage('home');
        
        // 初始化TodoApp（如果还没有初始化）
        if (!this.todoApp) {
            this.todoApp = new TodoApp();
        }
    }

    // 显示设置页面
    showSettingsPage() {
        pageRenderer.showPage('settings');
        
        // 更新设置页面的统计数据
        if (settingsManager && settingsManager.updateStatsDisplay) {
            settingsManager.updateStatsDisplay();
        }
    }

    // 显示分析页面
    showAnalyticsPage() {
        pageRenderer.showPage('analytics');
        
        // 初始化分析页面（如果还没有初始化）
        if (!this.analyticsManager) {
            this.initAnalyticsManager();
        }
        
        // 更新分析数据
        if (this.analyticsManager) {
            this.analyticsManager.updateAnalytics();
        }
    }

    // 初始化分析管理器
    initAnalyticsManager() {
        this.analyticsManager = new AnalyticsManager();
    }

    // 绑定导航事件
    bindNavigationEvents() {
        // 导航链接点击事件
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                router.navigate(route);
            });
        });
    }
}

// 分析页面管理器
class AnalyticsManager {
    constructor() {
        this.analysisEngine = null;
        this.chartManager = null;
        this.isInitialized = false;
    }

    // 初始化分析引擎
    init() {
        if (this.isInitialized) return;

        try {
            this.analysisEngine = new AnalyticsEngine();
            this.chartManager = new ChartManager();
            this.bindEvents();
            this.isInitialized = true;
        } catch (error) {
            console.error('Analytics initialization failed:', error);
        }
    }

    // 更新分析数据和图表
    updateAnalytics() {
        if (!this.isInitialized) {
            this.init();
        }

        if (!this.analysisEngine) return;

        try {
            // 获取todos数据
            const todos = this.getTodosData();
            
            // 生成分析报告
            const analysisReport = this.analysisEngine.generateAnalysisReport(todos, {
                includeInsights: true,
                includeRecommendations: true,
                periods: ['daily', 'weekly', 'monthly']
            });
            
            // 更新统计卡片
            this.updateStatCards(analysisReport);
            
            // 初始化图表
            this.initializeCharts(analysisReport);
            
            // 更新洞察建议
            this.updateInsights(analysisReport.personalizedInsights);
            
        } catch (error) {
            console.error('Analytics update failed:', error);
        }
    }

    // 获取todos数据
    getTodosData() {
        try {
            const todosData = localStorage.getItem('todos');
            return todosData ? JSON.parse(todosData) : [];
        } catch (error) {
            console.error('Failed to load todos data:', error);
            return [];
        }
    }

    // 更新统计卡片
    updateStatCards(analysisReport) {
        const elements = {
            totalTasksCount: document.getElementById('totalTasksCount'),
            completionRate: document.getElementById('completionRate'),
            procrastinationLevel: document.getElementById('procrastinationLevel'),
            productivityScore: document.getElementById('productivityScore')
        };

        if (elements.totalTasksCount && analysisReport.metadata) {
            elements.totalTasksCount.textContent = analysisReport.metadata.totalTodos || 0;
        }
        
        if (elements.completionRate && analysisReport.overview?.overall) {
            const rate = Math.round((analysisReport.overview.overall.completed / analysisReport.overview.overall.total) * 100) || 0;
            elements.completionRate.textContent = `${rate}%`;
        }
        
        if (elements.procrastinationLevel && analysisReport.procrastinationAnalysis) {
            const level = analysisReport.procrastinationAnalysis.overallLevel || '低';
            elements.procrastinationLevel.textContent = level;
        }
        
        if (elements.productivityScore && analysisReport.productivityTrend) {
            const score = Math.round(analysisReport.productivityTrend.score * 100) || 0;
            elements.productivityScore.textContent = score;
        }
    }

    // 初始化图表
    initializeCharts(analysisReport) {
        if (!this.chartManager) return;

        const containerIds = {
            trend: 'trendChart',
            completion: 'completionChart',  
            heatmap: 'heatmapChart',
            progress: 'categoryChart'
        };

        try {
            this.chartManager.initializeCharts(analysisReport, containerIds);
        } catch (error) {
            console.error('Chart initialization failed:', error);
        }
    }

    // 更新洞察建议
    updateInsights(insights) {
        const insightsList = document.getElementById('insightsList');
        if (!insightsList || !insights) return;

        insightsList.innerHTML = '';
        
        if (Array.isArray(insights)) {
            insights.forEach(insight => {
                const card = document.createElement('div');
                card.className = 'insight-card';
                card.innerHTML = `
                    <div class="insight-icon">${insight.icon || '💡'}</div>
                    <div class="insight-content">
                        <h4>${insight.title}</h4>
                        <p>${insight.description}</p>
                    </div>
                `;
                insightsList.appendChild(card);
            });
        }
    }

    // 绑定事件
    bindEvents() {
        // 数据导出按钮
        const exportJsonBtn = document.getElementById('exportJsonBtn');
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        const exportReportBtn = document.getElementById('exportReportBtn');

        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => this.exportData('json'));
        }
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportData('csv'));
        }
        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', () => this.exportData('report'));
        }
    }

    // 数据导出
    exportData(format) {
        if (!this.analysisEngine) return;

        try {
            // 获取todos数据并生成分析报告
            const todos = this.getTodosData();
            const analysisReport = this.analysisEngine.generateAnalysisReport(todos, {
                includeInsights: true,
                includeRecommendations: true,
                periods: ['daily', 'weekly', 'monthly']
            });

            // 导出数据
            const exportedData = this.analysisEngine.exportAnalysisData(analysisReport, format);
            
            // 创建下载链接
            const blob = new Blob([exportedData], { 
                type: format === 'csv' ? 'text/csv' : 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `todo-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error(`Export ${format} failed:`, error);
        }
    }
}

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化应用路由
    new AppRouter();
});

// 导出用于测试（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TodoState, TodoRenderer, TodoApp, AppRouter };
}