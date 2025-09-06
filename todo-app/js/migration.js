/**
 * 数据迁移框架
 * 负责处理不同版本之间的数据格式转换和迁移
 */

import { versionManager, DATA_VERSIONS, CURRENT_VERSION } from './dataVersion.js';

// 迁移脚本注册表
const migrationScripts = new Map();

/**
 * 迁移脚本基类
 */
export class MigrationScript {
    constructor(fromVersion, toVersion, description) {
        this.fromVersion = fromVersion;
        this.toVersion = toVersion;
        this.description = description;
    }

    /**
     * 执行迁移（需要被子类重写）
     * @param {Array} data - 原始数据
     * @returns {Array} 迁移后的数据
     */
    migrate(data) {
        throw new Error('migrate方法必须被子类实现');
    }

    /**
     * 验证迁移前数据
     * @param {Array} data - 数据
     * @returns {boolean} 是否有效
     */
    validateSource(data) {
        return versionManager.validateDataFormat(data, this.fromVersion);
    }

    /**
     * 验证迁移后数据
     * @param {Array} data - 数据
     * @returns {boolean} 是否有效
     */
    validateTarget(data) {
        return versionManager.validateDataFormat(data, this.toVersion);
    }
}

/**
 * 1.0 到 1.1 版本的迁移脚本
 */
export class Migration_1_0_to_1_1 extends MigrationScript {
    constructor() {
        super('1.0', '1.1', '将旧格式 (text, createdAt, updatedAt) 转换为新格式 (title, description, createTime, updateTime)');
    }

    migrate(data) {
        console.log('开始执行 1.0 → 1.1 数据迁移');
        
        if (!Array.isArray(data)) {
            throw new Error('数据必须是数组格式');
        }

        const migratedData = data.map((todo, index) => {
            try {
                // 检查是否已经是新格式
                if (todo.title !== undefined && todo.createTime !== undefined) {
                    // 已经是新格式，只需要确保所有字段都存在
                    return {
                        id: todo.id,
                        title: todo.title || '',
                        description: todo.description || '',
                        completed: Boolean(todo.completed),
                        createTime: todo.createTime,
                        updateTime: todo.updateTime || todo.createTime
                    };
                }

                // 旧格式转新格式
                const migrated = {
                    id: todo.id,
                    title: todo.text || '', // text → title
                    description: '', // 新增字段，默认为空
                    completed: Boolean(todo.completed),
                    createTime: todo.createdAt || new Date().toISOString(), // createdAt → createTime
                    updateTime: todo.updatedAt || todo.createdAt || new Date().toISOString() // updatedAt → updateTime
                };

                console.log(`迁移项目 ${index + 1}: "${migrated.title}"`);
                return migrated;
            } catch (error) {
                console.error(`迁移第 ${index + 1} 项时出错:`, error);
                throw new Error(`数据项 ${index + 1} 迁移失败: ${error.message}`);
            }
        });

        console.log(`成功迁移 ${migratedData.length} 个项目`);
        return migratedData;
    }
}

/**
 * 数据迁移管理器
 */
export class MigrationManager {
    constructor() {
        this.storageKey = 'todos';
        this.registerMigrations();
    }

    /**
     * 注册所有迁移脚本
     */
    registerMigrations() {
        // 注册 1.0 → 1.1 迁移
        this.registerMigration(new Migration_1_0_to_1_1());
    }

    /**
     * 注册迁移脚本
     * @param {MigrationScript} migration - 迁移脚本实例
     */
    registerMigration(migration) {
        const key = `${migration.fromVersion}_to_${migration.toVersion}`;
        migrationScripts.set(key, migration);
        console.log(`已注册迁移脚本: ${key} - ${migration.description}`);
    }

    /**
     * 获取迁移脚本
     * @param {string} fromVersion - 源版本
     * @param {string} toVersion - 目标版本
     * @returns {MigrationScript|null} 迁移脚本
     */
    getMigration(fromVersion, toVersion) {
        const key = `${fromVersion}_to_${toVersion}`;
        return migrationScripts.get(key) || null;
    }

    /**
     * 检查是否需要迁移并执行
     * @returns {Object} 迁移结果
     */
    async checkAndMigrate() {
        try {
            const currentVersion = versionManager.getStoredVersion();
            const targetVersion = CURRENT_VERSION;

            console.log(`当前数据版本: ${currentVersion}, 目标版本: ${targetVersion}`);

            // 检查是否需要升级
            if (!versionManager.needsUpgrade()) {
                console.log('数据版本已是最新，无需迁移');
                return {
                    success: true,
                    migrated: false,
                    fromVersion: currentVersion,
                    toVersion: targetVersion,
                    message: '数据版本已是最新'
                };
            }

            // 执行迁移
            const result = await this.executeMigration(currentVersion, targetVersion);
            return result;

        } catch (error) {
            console.error('迁移检查失败:', error);
            return {
                success: false,
                error: error.message,
                message: '迁移检查失败'
            };
        }
    }

    /**
     * 执行数据迁移
     * @param {string} fromVersion - 源版本
     * @param {string} toVersion - 目标版本
     * @returns {Object} 迁移结果
     */
    async executeMigration(fromVersion, toVersion) {
        console.log(`开始执行数据迁移: ${fromVersion} → ${toVersion}`);
        
        try {
            // 获取当前数据
            const originalData = this.loadData();
            
            // 创建备份
            versionManager.createBackup(originalData, fromVersion);
            
            // 获取升级路径
            const upgradePath = versionManager.getUpgradePath(fromVersion, toVersion);
            console.log('升级路径:', upgradePath);
            
            if (upgradePath.length === 0) {
                throw new Error(`无法找到从版本 ${fromVersion} 到 ${toVersion} 的升级路径`);
            }

            // 逐步执行迁移
            let currentData = originalData;
            let currentVer = fromVersion;
            
            for (const targetVer of upgradePath) {
                console.log(`执行迁移: ${currentVer} → ${targetVer}`);
                
                const migration = this.getMigration(currentVer, targetVer);
                if (!migration) {
                    throw new Error(`找不到从 ${currentVer} 到 ${targetVer} 的迁移脚本`);
                }

                // 验证源数据格式
                if (!migration.validateSource(currentData)) {
                    throw new Error(`源数据格式验证失败 (版本 ${currentVer})`);
                }

                // 执行迁移
                currentData = migration.migrate(currentData);

                // 验证迁移后数据格式
                if (!migration.validateTarget(currentData)) {
                    throw new Error(`迁移后数据格式验证失败 (版本 ${targetVer})`);
                }

                currentVer = targetVer;
                console.log(`迁移步骤 ${currentVer} 完成`);
            }

            // 保存迁移后的数据
            this.saveData(currentData);
            
            // 更新版本号
            versionManager.setVersion(toVersion);
            
            // 清除备份（迁移成功后）
            setTimeout(() => versionManager.clearBackup(), 5000);

            console.log('数据迁移完成');
            return {
                success: true,
                migrated: true,
                fromVersion,
                toVersion,
                itemCount: currentData.length,
                message: `成功迁移 ${currentData.length} 个数据项`
            };

        } catch (error) {
            console.error('数据迁移失败:', error);
            
            // 尝试恢复备份
            try {
                const backup = versionManager.restoreBackup();
                if (backup) {
                    this.saveData(backup.data);
                    versionManager.setVersion(backup.version);
                    console.log('已恢复备份数据');
                }
            } catch (restoreError) {
                console.error('恢复备份失败:', restoreError);
            }

            return {
                success: false,
                migrated: false,
                error: error.message,
                message: '数据迁移失败，已尝试恢复备份'
            };
        }
    }

    /**
     * 从 localStorage 加载数据
     * @returns {Array} 数据数组
     */
    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('加载数据失败:', error);
            return [];
        }
    }

    /**
     * 保存数据到 localStorage
     * @param {Array} data - 要保存的数据
     */
    saveData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('保存数据失败:', error);
            throw new Error('数据保存失败');
        }
    }

    /**
     * 强制重新迁移（用于开发和调试）
     * @param {string} fromVersion - 源版本
     * @param {string} toVersion - 目标版本
     */
    async forceMigrate(fromVersion = '1.0', toVersion = CURRENT_VERSION) {
        console.log(`强制执行迁移: ${fromVersion} → ${toVersion}`);
        
        // 临时设置版本
        versionManager.setVersion(fromVersion);
        
        // 执行迁移
        return await this.executeMigration(fromVersion, toVersion);
    }

    /**
     * 获取迁移统计信息
     */
    getMigrationStats() {
        const versionStats = versionManager.getUpgradeStats();
        const dataCount = this.loadData().length;
        
        return {
            ...versionStats,
            dataItemCount: dataCount,
            availableScripts: Array.from(migrationScripts.keys()),
            storageKey: this.storageKey
        };
    }
}

/**
 * 迁移结果通知器
 */
export class MigrationNotifier {
    /**
     * 显示迁移结果通知
     * @param {Object} result - 迁移结果
     */
    static showMigrationResult(result) {
        if (!result.migrated) {
            // 无需迁移或迁移失败
            if (result.success) {
                console.log('✅ 数据版本已是最新');
            } else {
                console.error('❌ 数据迁移失败:', result.message);
                // 可以在这里添加用户界面通知
            }
            return;
        }

        // 迁移成功
        if (result.success) {
            console.log(`✅ 数据迁移成功！`);
            console.log(`   版本: ${result.fromVersion} → ${result.toVersion}`);
            console.log(`   迁移项目: ${result.itemCount} 个`);
            
            // 可以添加用户界面通知
            this.showUserNotification({
                type: 'success',
                title: '数据升级完成',
                message: `已成功将 ${result.itemCount} 个项目升级到最新格式`
            });
        } else {
            console.error('❌ 数据迁移失败:', result.message);
            
            // 显示错误通知
            this.showUserNotification({
                type: 'error',
                title: '数据升级失败',
                message: '升级过程中出现错误，已恢复原始数据'
            });
        }
    }

    /**
     * 显示用户界面通知（可以根据实际UI框架调整）
     * @param {Object} notification - 通知配置
     */
    static showUserNotification(notification) {
        // 这里可以集成实际的通知组件
        // 目前使用控制台输出
        const emoji = notification.type === 'success' ? '✅' : '❌';
        console.log(`${emoji} ${notification.title}: ${notification.message}`);
        
        // 可以在这里添加实际的UI通知，比如toast消息
        // if (window.showToast) {
        //     window.showToast(notification);
        // }
    }
}

// 创建全局实例
export const migrationManager = new MigrationManager();

// 导出便捷函数
export const checkAndMigrate = () => migrationManager.checkAndMigrate();
export const forceMigrate = (from, to) => migrationManager.forceMigrate(from, to);
export const getMigrationStats = () => migrationManager.getMigrationStats();