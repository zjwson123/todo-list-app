/**
 * 设置页面管理模块
 * 提供主题切换、数据导入导出等功能
 * 增强版本：集成数据验证和错误处理
 */

// 导入数据验证和用户反馈模块
import { 
    TodoValidator, 
    DataIntegrityChecker, 
    ErrorHandler, 
    ValidationError, 
    StorageError 
} from './validator.js';
import { 
    messageDisplay, 
    loadingIndicator,
    MESSAGE_TYPES 
} from './uiFeedback.js';

class SettingsManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'light';
        this.init();
    }

    // 初始化设置
    init() {
        this.applyTheme(this.currentTheme);
        this.bindEvents();
    }

    // 绑定事件监听器
    bindEvents() {
        // 主题切换
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // 数据导出
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // 数据导入
        const importBtn = document.getElementById('import-data');
        const importFile = document.getElementById('import-file');
        
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => {
                importFile.click();
            });
            
            importFile.addEventListener('change', (e) => {
                this.importData(e);
            });
        }

        // 清除所有数据
        const clearDataBtn = document.getElementById('clear-all-data');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                this.clearAllData();
            });
        }
    }

    // 获取存储的主题
    getStoredTheme() {
        try {
            return localStorage.getItem('app-theme');
        } catch (error) {
            console.error('Error loading theme:', error);
            return null;
        }
    }

    // 保存主题设置
    saveTheme(theme) {
        try {
            localStorage.setItem('app-theme', theme);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    }

    // 切换主题
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.currentTheme = newTheme;
        this.saveTheme(newTheme);
        this.updateThemeToggleButton();
    }

    // 应用主题
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.updateThemeToggleButton();
    }

    // 更新主题切换按钮文本
    updateThemeToggleButton() {
        const themeToggle = document.getElementById('theme-toggle');
        const themeStatus = document.getElementById('theme-status');
        
        if (themeToggle) {
            const isLight = this.currentTheme === 'light';
            themeToggle.innerHTML = `
                <span class="setting-icon">${isLight ? '🌙' : '☀️'}</span>
                <span>${isLight ? '切换到暗色模式' : '切换到亮色模式'}</span>
            `;
        }
        
        if (themeStatus) {
            themeStatus.textContent = this.currentTheme === 'light' ? '亮色模式' : '暗色模式';
        }
    }

    // 导出数据
    exportData() {
        try {
            const todos = JSON.parse(localStorage.getItem('todos') || '[]');
            const settings = {
                theme: this.currentTheme,
                exportDate: new Date().toISOString()
            };
            
            const exportData = {
                todos,
                settings,
                version: '1.0'
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `todo-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            this.showMessage('数据导出成功！', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showMessage('数据导出失败！', 'error');
        }
    }

    // 导入数据 - 增强版本，包含完整验证
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 文件大小验证（10MB限制）
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            messageDisplay.error('文件过大，最大支持 10MB', {
                title: '导入失败'
            });
            event.target.value = '';
            return;
        }

        // 显示加载指示器
        loadingIndicator.show('正在验证和处理数据...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                // 基本格式验证
                if (!this.validateImportData(importData)) {
                    loadingIndicator.hide();
                    messageDisplay.error('数据格式无效，请检查文件是否是正确的备份文件', {
                        title: '导入失败'
                    });
                    event.target.value = '';
                    return;
                }

                // 进行数据完整性验证
                const validationResult = await this.validateImportTodos(importData.todos || []);
                
                loadingIndicator.hide();
                
                if (validationResult.hasErrors) {
                    // 显示验证结果并让用户选择
                    const proceed = await this.showImportValidationDialog(validationResult);
                    if (!proceed) {
                        event.target.value = '';
                        return;
                    }
                }

                // 确认导入
                if (confirm('导入数据将覆盖现有数据，确定要继续吗？')) {
                    await this.performImport(importData, validationResult.cleanedData);
                }
            } catch (error) {
                console.error('Import error:', error);
                loadingIndicator.hide();
                
                if (error instanceof SyntaxError) {
                    messageDisplay.error('文件格式错误，请确保是正确的JSON文件', {
                        title: '导入失败'
                    });
                } else {
                    messageDisplay.error('导入过程中发生错误，请稍后重试', {
                        title: '导入失败'
                    });
                }
            }
        };
        
        reader.onerror = () => {
            loadingIndicator.hide();
            messageDisplay.error('文件读取失败', {
                title: '导入失败'
            });
        };
        
        reader.readAsText(file);
        // 清空文件输入
        event.target.value = '';
    }

    // 数据格式迁移函数 - 与main.js中保持一致
    migrateTodoFormat(todo) {
        // 如果已经是新格式，直接返回
        if (todo.title !== undefined && todo.createTime !== undefined) {
            return {
                id: todo.id,
                title: todo.title,
                description: todo.description || '',
                completed: todo.completed,
                createTime: todo.createTime,
                updateTime: todo.updateTime
            };
        }
        
        // 旧格式转新格式
        return {
            id: todo.id,
            title: todo.text || '', // text -> title
            description: '', // 新增字段，默认为空
            completed: todo.completed || false,
            createTime: todo.createdAt || new Date().toISOString(), // createdAt -> createTime
            updateTime: todo.updatedAt // updatedAt -> updateTime
        };
    }

    // 验证导入数据 - 增强版本
    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // 必须有todos字段且为数组
        if (!Array.isArray(data.todos)) {
            return false;
        }
        
        // 验证版本信息（可选）
        if (data.version && typeof data.version !== 'string') {
            return false;
        }
        
        // 验证设置信息（可选）
        if (data.settings && typeof data.settings !== 'object') {
            return false;
        }
        
        return true;
    }
    
    // 验证导入的todos数据
    async validateImportTodos(todos) {
        if (!Array.isArray(todos)) {
            return {
                hasErrors: true,
                errors: [new ValidationError('数据格式错误：todos必须是数组')],
                cleanedData: []
            };
        }
        
        // 使用数据完整性检查器进行验证
        const validationResult = DataIntegrityChecker.validateBatch(todos);
        
        let cleanedData = [];
        if (validationResult.validCount > 0) {
            // 清理和迁移数据
            const migratedTodos = todos.map(todo => this.migrateTodoFormat(todo));
            cleanedData = DataIntegrityChecker.cleanData(migratedTodos);
        }
        
        return {
            hasErrors: validationResult.errors.length > 0,
            errors: validationResult.errors,
            validCount: validationResult.validCount,
            totalCount: validationResult.totalCount,
            cleanedData
        };
    }
    
    // 显示导入验证结果对话框
    async showImportValidationDialog(validationResult) {
        const errorSummary = ErrorHandler.generateErrorSummary(validationResult.errors);
        
        const details = `
整体情况：
- 总数据量：${validationResult.totalCount} 条
- 有效数据：${validationResult.validCount} 条
- 错误数量：${validationResult.errors.length} 个

继续导入将会：
- 修复可修复的错误
- 过滤无法修复的数据
- 保证数据安全性
        `;
        
        messageDisplay.warning(errorSummary, {
            title: '数据验证结果',
            details: details.trim(),
            autoHide: false
        });
        
        return confirm('发现数据问题，是否继续导入？（系统会自动修复可修复的问题）');
    }
    
    // 执行导入操作
    async performImport(importData, cleanedTodos) {
        try {
            loadingIndicator.show('正在导入数据...');
            
            // 导入todos数据
            if (cleanedTodos && cleanedTodos.length > 0) {
                localStorage.setItem('todos', JSON.stringify(cleanedTodos));
            } else if (importData.todos) {
                // 如果没有清理数据，使用原始数据（对于简单情况）
                const migratedTodos = importData.todos.map(todo => this.migrateTodoFormat(todo));
                localStorage.setItem('todos', JSON.stringify(migratedTodos));
            }
            
            // 导入设置
            if (importData.settings && importData.settings.theme) {
                this.applyTheme(importData.settings.theme);
            }
            
            loadingIndicator.hide();
            
            messageDisplay.success(`数据导入成功！共导入 ${cleanedTodos?.length || importData.todos?.length || 0} 条任务`, {
                title: '导入成功',
                details: '页面将在 2 秒后自动刷新以显示新数据'
            });
            
            // 2秒后刷新页面
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } catch (error) {
            loadingIndicator.hide();
            console.error('Import execution error:', error);
            
            if (error.name === 'QuotaExceededError') {
                messageDisplay.error('存储空间不足，无法导入数据', {
                    title: '导入失败',
                    details: '请清理浏览器缓存或删除一些现有数据'
                });
            } else {
                messageDisplay.error('导入过程中发生错误', {
                    title: '导入失败'
                });
            }
            
            throw new StorageError('数据导入失败', 'import');
        }
    }

    // 清除所有数据
    clearAllData() {
        if (confirm('确定要清除所有数据吗？此操作不可撤销！')) {
            try {
                localStorage.removeItem('todos');
                localStorage.removeItem('app-theme');
                this.showMessage('数据清除成功！', 'success');
                
                // 2秒后刷新页面
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } catch (error) {
                console.error('Clear data error:', error);
                this.showMessage('数据清除失败！', 'error');
            }
        }
    }

    // 显示消息提示 - 使用统一的消息显示系统
    showMessage(message, type = 'info') {
        // 使用全局消息显示器
        switch (type) {
            case 'success':
                messageDisplay.success(message);
                break;
            case 'error':
                messageDisplay.error(message);
                break;
            case 'warning':
                messageDisplay.warning(message);
                break;
            default:
                messageDisplay.info(message);
                break;
        }
        
        // 保留传统的settings-message元素支持（向后兼容）
        const messageContainer = document.getElementById('settings-message');
        if (messageContainer) {
            messageContainer.textContent = message;
            messageContainer.className = `settings-message ${type}`;
            messageContainer.style.display = 'block';

            setTimeout(() => {
                messageContainer.style.display = 'none';
            }, 3000);
        }
    }

    // 获取应用统计信息
    getAppStats() {
        try {
            const todos = JSON.parse(localStorage.getItem('todos') || '[]');
            const completed = todos.filter(t => t.completed).length;
            const active = todos.length - completed;

            return {
                total: todos.length,
                completed,
                active,
                dataSize: new Blob([localStorage.getItem('todos') || '']).size
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                total: 0,
                completed: 0,
                active: 0,
                dataSize: 0
            };
        }
    }

    // 更新统计信息显示
    updateStatsDisplay() {
        const stats = this.getAppStats();
        
        const totalTasks = document.getElementById('total-tasks');
        const completedTasks = document.getElementById('completed-tasks');
        const activeTasks = document.getElementById('active-tasks');
        const dataSize = document.getElementById('data-size');
        
        if (totalTasks) totalTasks.textContent = stats.total;
        if (completedTasks) completedTasks.textContent = stats.completed;
        if (activeTasks) activeTasks.textContent = stats.active;
        if (dataSize) dataSize.textContent = `${(stats.dataSize / 1024).toFixed(2)} KB`;
    }
}

// 创建设置管理器实例
const settingsManager = new SettingsManager();

export { settingsManager };