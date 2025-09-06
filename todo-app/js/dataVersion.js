/**
 * 数据版本管理模块
 * 负责管理应用数据的版本控制和升级检查
 */

// 数据版本定义
export const DATA_VERSIONS = {
    '1.0': {
        version: '1.0',
        description: '初始版本 - 使用 text, createdAt, updatedAt',
        schema: {
            id: 'string',
            text: 'string',
            completed: 'boolean',
            createdAt: 'string'
        },
        optionalFields: {
            updatedAt: 'string' // 1.0版本中这个字段是可选的
        }
    },
    '1.1': {
        version: '1.1', 
        description: '增强版本 - 使用 title, description, createTime, updateTime',
        schema: {
            id: 'string',
            title: 'string',
            description: 'string',
            completed: 'boolean',
            createTime: 'string',
            updateTime: 'string'
        }
    }
};

// 当前最新版本
export const CURRENT_VERSION = '1.1';

// 数据版本管理器
export class DataVersionManager {
    constructor() {
        this.versionKey = 'app_data_version';
        this.backupKey = 'app_data_backup';
    }

    /**
     * 获取存储的数据版本
     * @returns {string} 版本号，如果没有则返回 '1.0'（向后兼容）
     */
    getStoredVersion() {
        try {
            const version = localStorage.getItem(this.versionKey);
            return version || '1.0'; // 默认为1.0以保持向后兼容
        } catch (error) {
            console.warn('无法读取数据版本:', error);
            return '1.0';
        }
    }

    /**
     * 设置当前数据版本
     * @param {string} version - 版本号
     */
    setVersion(version) {
        try {
            localStorage.setItem(this.versionKey, version);
            console.log(`数据版本已更新到 ${version}`);
        } catch (error) {
            console.error('无法保存数据版本:', error);
            throw new Error('版本保存失败');
        }
    }

    /**
     * 检查是否需要升级
     * @returns {boolean} 是否需要升级
     */
    needsUpgrade() {
        const stored = this.getStoredVersion();
        const current = CURRENT_VERSION;
        return this.compareVersions(stored, current) < 0;
    }

    /**
     * 比较两个版本号
     * @param {string} v1 - 版本1
     * @param {string} v2 - 版本2
     * @returns {number} -1: v1 < v2, 0: v1 == v2, 1: v1 > v2
     */
    compareVersions(v1, v2) {
        const normalize = (v) => v.split('.').map(n => parseInt(n, 10));
        const ver1 = normalize(v1);
        const ver2 = normalize(v2);
        
        for (let i = 0; i < Math.max(ver1.length, ver2.length); i++) {
            const num1 = ver1[i] || 0;
            const num2 = ver2[i] || 0;
            
            if (num1 < num2) return -1;
            if (num1 > num2) return 1;
        }
        
        return 0;
    }

    /**
     * 获取版本信息
     * @param {string} version - 版本号
     * @returns {Object|null} 版本信息对象
     */
    getVersionInfo(version) {
        return DATA_VERSIONS[version] || null;
    }

    /**
     * 获取所有可用版本
     * @returns {string[]} 版本号数组
     */
    getAvailableVersions() {
        return Object.keys(DATA_VERSIONS).sort((a, b) => this.compareVersions(a, b));
    }

    /**
     * 获取升级路径
     * @param {string} fromVersion - 起始版本
     * @param {string} toVersion - 目标版本（可选，默认为最新版本）
     * @returns {string[]} 升级路径版本数组
     */
    getUpgradePath(fromVersion, toVersion = CURRENT_VERSION) {
        const versions = this.getAvailableVersions();
        const fromIndex = versions.indexOf(fromVersion);
        const toIndex = versions.indexOf(toVersion);
        
        if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
            return [];
        }
        
        return versions.slice(fromIndex + 1, toIndex + 1);
    }

    /**
     * 创建数据备份
     * @param {any} data - 要备份的数据
     * @param {string} version - 当前版本
     */
    createBackup(data, version) {
        try {
            const backup = {
                version: version,
                timestamp: new Date().toISOString(),
                data: JSON.parse(JSON.stringify(data)) // 深拷贝
            };
            localStorage.setItem(this.backupKey, JSON.stringify(backup));
            console.log(`已创建版本 ${version} 的数据备份`);
        } catch (error) {
            console.error('创建备份失败:', error);
            throw new Error('备份创建失败');
        }
    }

    /**
     * 恢复数据备份
     * @returns {Object|null} 备份数据，如果没有备份则返回 null
     */
    restoreBackup() {
        try {
            const backupStr = localStorage.getItem(this.backupKey);
            if (!backupStr) {
                console.warn('没有找到数据备份');
                return null;
            }
            
            const backup = JSON.parse(backupStr);
            console.log(`正在恢复版本 ${backup.version} 的备份数据`);
            return backup;
        } catch (error) {
            console.error('恢复备份失败:', error);
            return null;
        }
    }

    /**
     * 清除备份
     */
    clearBackup() {
        try {
            localStorage.removeItem(this.backupKey);
            console.log('已清除数据备份');
        } catch (error) {
            console.warn('清除备份失败:', error);
        }
    }

    /**
     * 验证数据格式
     * @param {any} data - 要验证的数据
     * @param {string} version - 数据版本
     * @returns {boolean} 是否符合格式
     */
    validateDataFormat(data, version) {
        const versionInfo = this.getVersionInfo(version);
        if (!versionInfo) {
            console.error(`未知版本: ${version}`);
            return false;
        }

        if (!Array.isArray(data)) {
            console.error('数据必须是数组格式');
            return false;
        }

        // 验证数组中每个项目的格式
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const schema = versionInfo.schema;
            const optionalFields = versionInfo.optionalFields || {};
            
            // 验证必需字段
            for (const [key, expectedType] of Object.entries(schema)) {
                if (!(key in item)) {
                    console.error(`第 ${i} 项缺少必需字段: ${key}`);
                    return false;
                }
                
                const actualType = typeof item[key];
                if (actualType !== expectedType) {
                    console.error(`第 ${i} 项字段 ${key} 类型错误: 期望 ${expectedType}, 实际 ${actualType}`);
                    return false;
                }
            }
            
            // 验证可选字段（如果存在的话）
            for (const [key, expectedType] of Object.entries(optionalFields)) {
                if (key in item) {
                    const actualType = typeof item[key];
                    if (actualType !== expectedType) {
                        console.error(`第 ${i} 项可选字段 ${key} 类型错误: 期望 ${expectedType}, 实际 ${actualType}`);
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * 获取版本升级统计信息
     */
    getUpgradeStats() {
        const stored = this.getStoredVersion();
        const current = CURRENT_VERSION;
        const upgradePath = this.getUpgradePath(stored, current);
        
        return {
            currentStoredVersion: stored,
            targetVersion: current,
            needsUpgrade: this.needsUpgrade(),
            upgradePath: upgradePath,
            upgradeSteps: upgradePath.length
        };
    }
}

// 创建全局实例
export const versionManager = new DataVersionManager();

// 导出常用函数
export const getCurrentVersion = () => CURRENT_VERSION;
export const getStoredVersion = () => versionManager.getStoredVersion();
export const needsUpgrade = () => versionManager.needsUpgrade();
export const setVersion = (version) => versionManager.setVersion(version);