/**
 * 数据验证增强模块
 * 提供完整的数据验证、错误处理和安全防护功能
 */

// 错误类型枚举
const ERROR_TYPES = {
    VALIDATION: 'validation',
    STORAGE: 'storage',
    SECURITY: 'security',
    NETWORK: 'network',
    SYSTEM: 'system'
};

// 验证规则配置
const VALIDATION_RULES = {
    todo: {
        id: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 50,
            pattern: /^[a-zA-Z0-9_-]+$/
        },
        title: {
            required: true,
            type: 'string',
            minLength: 1,
            maxLength: 200,
            sanitize: true
        },
        description: {
            required: false,
            type: 'string',
            maxLength: 1000,
            sanitize: true
        },
        completed: {
            required: true,
            type: 'boolean'
        },
        createTime: {
            required: true,
            type: 'string',
            format: 'iso-date'
        },
        updateTime: {
            required: false,
            type: 'string',
            format: 'iso-date'
        }
    }
};

/**
 * 验证错误类
 */
class ValidationError extends Error {
    constructor(message, field = null, code = 'VALIDATION_ERROR') {
        super(message);
        this.name = 'ValidationError';
        this.type = ERROR_TYPES.VALIDATION;
        this.field = field;
        this.code = code;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * 存储错误类
 */
class StorageError extends Error {
    constructor(message, operation = null) {
        super(message);
        this.name = 'StorageError';
        this.type = ERROR_TYPES.STORAGE;
        this.operation = operation;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * 安全错误类
 */
class SecurityError extends Error {
    constructor(message, threatType = null) {
        super(message);
        this.name = 'SecurityError';
        this.type = ERROR_TYPES.SECURITY;
        this.threatType = threatType;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * XSS防护和内容安全模块
 */
class SecuritySanitizer {
    /**
     * HTML实体编码
     */
    static escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        
        return text.replace(/[&<>"'`=\/]/g, (s) => entityMap[s]);
    }

    /**
     * 清理危险字符
     */
    static sanitizeText(text) {
        if (typeof text !== 'string') return text;
        
        // 移除潜在的脚本注入
        let sanitized = text
            .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
            .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/data:(?!image\/)/gi, '');
        
        // HTML实体编码
        sanitized = this.escapeHtml(sanitized);
        
        // 清理多余空白字符
        sanitized = sanitized.replace(/\s+/g, ' ').trim();
        
        return sanitized;
    }

    /**
     * 检测潜在的XSS攻击
     */
    static detectXSS(text) {
        if (typeof text !== 'string') return false;
        
        const xssPatterns = [
            /<script[\s\S]*?>/i,
            /<iframe[\s\S]*?>/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<img[\s\S]*?onerror[\s\S]*?>/i,
            /<svg[\s\S]*?onload[\s\S]*?>/i,
            /eval\s*\(/i,
            /expression\s*\(/i
        ];
        
        return xssPatterns.some(pattern => pattern.test(text));
    }
}

/**
 * 字段验证器
 */
class FieldValidator {
    /**
     * 验证字段类型
     */
    static validateType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            default:
                return true;
        }
    }

    /**
     * 验证字符串长度
     */
    static validateLength(value, minLength, maxLength) {
        if (typeof value !== 'string') return false;
        
        const length = value.length;
        if (minLength !== undefined && length < minLength) return false;
        if (maxLength !== undefined && length > maxLength) return false;
        
        return true;
    }

    /**
     * 验证正则表达式模式
     */
    static validatePattern(value, pattern) {
        if (typeof value !== 'string' || !pattern) return true;
        return pattern.test(value);
    }

    /**
     * 验证ISO日期格式
     */
    static validateISODate(value) {
        if (typeof value !== 'string') return false;
        
        const date = new Date(value);
        return date instanceof Date && 
               !isNaN(date.getTime()) && 
               value === date.toISOString();
    }

    /**
     * 验证单个字段
     */
    static validateField(value, fieldName, rules) {
        const errors = [];
        
        // 必填字段检查
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(new ValidationError(`${fieldName}是必填字段`, fieldName, 'REQUIRED_FIELD'));
            return errors;
        }

        // 如果字段为空且非必填，跳过其他验证
        if (!rules.required && (value === undefined || value === null || value === '')) {
            return errors;
        }

        // 类型验证
        if (rules.type && !this.validateType(value, rules.type)) {
            errors.push(new ValidationError(
                `${fieldName}类型错误，期望${rules.type}，实际${typeof value}`,
                fieldName,
                'INVALID_TYPE'
            ));
            return errors;
        }

        // 字符串长度验证
        if (rules.type === 'string') {
            if (!this.validateLength(value, rules.minLength, rules.maxLength)) {
                let message = `${fieldName}长度不符合要求`;
                if (rules.minLength && rules.maxLength) {
                    message += `，应在${rules.minLength}-${rules.maxLength}个字符之间`;
                } else if (rules.minLength) {
                    message += `，至少${rules.minLength}个字符`;
                } else if (rules.maxLength) {
                    message += `，最多${rules.maxLength}个字符`;
                }
                errors.push(new ValidationError(message, fieldName, 'INVALID_LENGTH'));
            }
        }

        // 正则模式验证
        if (rules.pattern && !this.validatePattern(value, rules.pattern)) {
            errors.push(new ValidationError(
                `${fieldName}格式不正确`,
                fieldName,
                'INVALID_FORMAT'
            ));
        }

        // 特殊格式验证
        if (rules.format === 'iso-date' && !this.validateISODate(value)) {
            errors.push(new ValidationError(
                `${fieldName}日期格式不正确，应为ISO格式`,
                fieldName,
                'INVALID_DATE_FORMAT'
            ));
        }

        // XSS安全检查
        if (rules.sanitize && typeof value === 'string') {
            if (SecuritySanitizer.detectXSS(value)) {
                errors.push(new SecurityError(
                    `${fieldName}包含潜在的安全威胁内容`,
                    'XSS_ATTEMPT'
                ));
            }
        }

        return errors;
    }
}

/**
 * 数据完整性检查器
 */
class DataIntegrityChecker {
    /**
     * 检查重复数据
     */
    static checkDuplicates(todos, newTodo, excludeId = null) {
        return todos.some(todo => {
            if (excludeId && todo.id === excludeId) return false;
            return todo.title.toLowerCase().trim() === newTodo.title.toLowerCase().trim();
        });
    }

    /**
     * 检查引用完整性
     */
    static checkReferentialIntegrity(todos) {
        const errors = [];
        const ids = new Set();
        
        todos.forEach((todo, index) => {
            // 检查ID重复
            if (ids.has(todo.id)) {
                errors.push(new ValidationError(
                    `检测到重复的ID: ${todo.id}`,
                    'id',
                    'DUPLICATE_ID'
                ));
            } else {
                ids.add(todo.id);
            }
            
            // 检查必要字段
            if (!todo.id) {
                errors.push(new ValidationError(
                    `第${index + 1}项缺少ID字段`,
                    'id',
                    'MISSING_ID'
                ));
            }
        });
        
        return errors;
    }

    /**
     * 数据清理
     */
    static cleanData(todos) {
        return todos
            .filter(todo => todo && todo.id) // 移除无效项
            .map(todo => ({
                ...todo,
                title: typeof todo.title === 'string' ? todo.title.trim() : '',
                description: typeof todo.description === 'string' ? todo.description.trim() : '',
                completed: Boolean(todo.completed),
                createTime: todo.createTime || new Date().toISOString(),
                updateTime: todo.updateTime || null
            }))
            .filter(todo => todo.title); // 移除空标题的项
    }

    /**
     * 批量验证数据
     */
    static validateBatch(todos) {
        const errors = [];
        
        if (!Array.isArray(todos)) {
            errors.push(new ValidationError('数据必须是数组格式', null, 'INVALID_DATA_FORMAT'));
            return { errors, validCount: 0, totalCount: 0 };
        }
        
        let validCount = 0;
        const totalCount = todos.length;
        
        todos.forEach((todo, index) => {
            try {
                const todoErrors = TodoValidator.validate(todo);
                if (todoErrors.length === 0) {
                    validCount++;
                } else {
                    todoErrors.forEach(error => {
                        error.message = `第${index + 1}项: ${error.message}`;
                        errors.push(error);
                    });
                }
            } catch (error) {
                errors.push(new ValidationError(
                    `第${index + 1}项验证失败: ${error.message}`,
                    null,
                    'VALIDATION_FAILED'
                ));
            }
        });
        
        // 检查引用完整性
        const integrityErrors = this.checkReferentialIntegrity(todos);
        errors.push(...integrityErrors);
        
        return { errors, validCount, totalCount };
    }
}

/**
 * Todo数据验证器
 */
class TodoValidator {
    /**
     * 验证Todo对象
     */
    static validate(todo, options = {}) {
        const errors = [];
        
        if (!todo || typeof todo !== 'object') {
            errors.push(new ValidationError('Todo数据必须是对象', null, 'INVALID_DATA'));
            return errors;
        }
        
        const rules = VALIDATION_RULES.todo;
        
        // 验证每个字段
        Object.keys(rules).forEach(fieldName => {
            const fieldRules = rules[fieldName];
            const value = todo[fieldName];
            
            const fieldErrors = FieldValidator.validateField(value, fieldName, fieldRules);
            errors.push(...fieldErrors);
        });
        
        // 自定义业务逻辑验证
        if (options.checkDuplicates && options.existingTodos) {
            if (DataIntegrityChecker.checkDuplicates(options.existingTodos, todo, options.excludeId)) {
                errors.push(new ValidationError(
                    '标题已存在，请使用不同的标题',
                    'title',
                    'DUPLICATE_TITLE'
                ));
            }
        }
        
        return errors;
    }

    /**
     * 预处理Todo数据（清理和转换）
     */
    static preprocess(todo) {
        if (!todo || typeof todo !== 'object') {
            throw new ValidationError('无效的Todo数据');
        }
        
        const processed = { ...todo };
        
        // 清理和转换字段
        if (processed.title && typeof processed.title === 'string') {
            processed.title = SecuritySanitizer.sanitizeText(processed.title);
        }
        
        if (processed.description && typeof processed.description === 'string') {
            processed.description = SecuritySanitizer.sanitizeText(processed.description);
        }
        
        // 确保必要字段的类型
        if (processed.completed !== undefined) {
            processed.completed = Boolean(processed.completed);
        }
        
        // 生成时间戳
        if (!processed.createTime) {
            processed.createTime = new Date().toISOString();
        }
        
        return processed;
    }

    /**
     * 批量验证
     */
    static validateBatch(todos, options = {}) {
        return DataIntegrityChecker.validateBatch(todos);
    }
}

/**
 * 错误处理器
 */
class ErrorHandler {
    /**
     * 格式化错误消息
     */
    static formatError(error) {
        if (error instanceof ValidationError) {
            return {
                type: 'validation',
                message: error.message,
                field: error.field,
                code: error.code,
                severity: 'warning'
            };
        }
        
        if (error instanceof StorageError) {
            return {
                type: 'storage',
                message: '数据保存失败，请检查存储空间',
                operation: error.operation,
                severity: 'error'
            };
        }
        
        if (error instanceof SecurityError) {
            return {
                type: 'security',
                message: '检测到安全威胁，操作已被阻止',
                threatType: error.threatType,
                severity: 'error'
            };
        }
        
        return {
            type: 'system',
            message: error.message || '未知错误',
            severity: 'error'
        };
    }

    /**
     * 处理多个错误
     */
    static formatErrors(errors) {
        if (!Array.isArray(errors)) {
            return [this.formatError(errors)];
        }
        
        return errors.map(error => this.formatError(error));
    }

    /**
     * 生成用户友好的错误汇总
     */
    static generateErrorSummary(errors) {
        const formattedErrors = this.formatErrors(errors);
        const groupedErrors = {};
        
        formattedErrors.forEach(error => {
            if (!groupedErrors[error.type]) {
                groupedErrors[error.type] = [];
            }
            groupedErrors[error.type].push(error);
        });
        
        let summary = '';
        let severity = 'info';
        
        if (groupedErrors.validation) {
            summary += `发现${groupedErrors.validation.length}个验证错误；`;
            severity = 'warning';
        }
        
        if (groupedErrors.security) {
            summary += `发现${groupedErrors.security.length}个安全问题；`;
            severity = 'error';
        }
        
        if (groupedErrors.storage) {
            summary += `发现${groupedErrors.storage.length}个存储问题；`;
            severity = 'error';
        }
        
        return {
            summary: summary || '操作成功',
            errors: formattedErrors,
            hasErrors: formattedErrors.length > 0,
            severity
        };
    }
}

// 导出模块
export {
    ValidationError,
    StorageError,
    SecurityError,
    SecuritySanitizer,
    FieldValidator,
    DataIntegrityChecker,
    TodoValidator,
    ErrorHandler,
    ERROR_TYPES,
    VALIDATION_RULES
};
