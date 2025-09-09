/**
 * 拖拽排序系统
 * 为Todo列表提供原生JavaScript拖拽排序功能
 */

class DragSortManager {
    constructor() {
        this.draggedElement = null;
        this.draggedIndex = -1;
        this.dragOverIndex = -1;
        this.placeholder = null;
        this.isEnabled = true;
        this.touchStartY = 0;
        this.touchStartX = 0;
        this.scrollContainer = null;
        this.autoScrollInterval = null;
        this.sortCallback = null;
        this.initialize();
    }

    // 初始化拖拽系统
    initialize() {
        this.createPlaceholder();
        this.bindGlobalEvents();
    }

    // 启用特定容器的拖拽排序
    enableDragSort(container, options = {}) {
        if (!container) return;

        const config = {
            itemSelector: '.todo-item',
            handleSelector: '.todo-content', // 拖拽句柄
            disabledSelector: '.edit-form', // 禁用拖拽的元素
            onSort: options.onSort || null,
            ...options
        };

        // 存储配置
        container._dragSortConfig = config;
        this.sortCallback = config.onSort;

        // 为容器中的项目启用拖拽
        this.updateDragItems(container);

        // 监听容器内容变化，自动更新拖拽项目
        const observer = new MutationObserver(() => {
            this.updateDragItems(container);
        });

        observer.observe(container, {
            childList: true,
            subtree: true
        });

        container._dragSortObserver = observer;
    }

    // 更新拖拽项目
    updateDragItems(container) {
        if (!container._dragSortConfig) return;

        const config = container._dragSortConfig;
        const items = container.querySelectorAll(config.itemSelector);

        items.forEach((item, index) => {
            // 跳过已经设置的项目
            if (item._dragSortEnabled) return;

            // 检查是否被禁用
            if (item.matches && item.matches(config.disabledSelector)) {
                return;
            }

            this.enableItemDrag(item, config);
            item._dragSortEnabled = true;
        });
    }

    // 为单个项目启用拖拽
    enableItemDrag(item, config) {
        const handle = config.handleSelector ? 
            item.querySelector(config.handleSelector) : item;

        if (!handle) return;

        // 设置拖拽属性
        item.draggable = true;
        handle.style.cursor = 'grab';

        // 绑定事件
        item.addEventListener('dragstart', (e) => this.handleDragStart(e, item));
        item.addEventListener('dragend', (e) => this.handleDragEnd(e, item));
        item.addEventListener('dragover', (e) => this.handleDragOver(e, item));
        item.addEventListener('drop', (e) => this.handleDrop(e, item));

        // 移动端触摸事件
        item.addEventListener('touchstart', (e) => this.handleTouchStart(e, item), { passive: false });
        item.addEventListener('touchmove', (e) => this.handleTouchMove(e, item), { passive: false });
        item.addEventListener('touchend', (e) => this.handleTouchEnd(e, item), { passive: false });

        // 鼠标事件（备用）
        handle.addEventListener('mousedown', () => {
            handle.style.cursor = 'grabbing';
        });

        handle.addEventListener('mouseup', () => {
            handle.style.cursor = 'grab';
        });
    }

    // 创建占位符元素
    createPlaceholder() {
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'drag-placeholder';
        this.placeholder.style.cssText = `
            background: var(--primary-color-light, rgba(76, 175, 80, 0.1));
            border: 2px dashed var(--primary-color);
            border-radius: var(--border-radius);
            margin: var(--spacing-1) 0;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary-color);
            font-size: 14px;
            transition: all 0.2s ease;
            opacity: 0;
            transform: scaleY(0);
        `;
        this.placeholder.textContent = '放置任务到这里';
    }

    // 显示占位符
    showPlaceholder(container, beforeElement) {
        this.placeholder.style.opacity = '1';
        this.placeholder.style.transform = 'scaleY(1)';

        if (beforeElement) {
            container.insertBefore(this.placeholder, beforeElement);
        } else {
            container.appendChild(this.placeholder);
        }
    }

    // 隐藏占位符
    hidePlaceholder() {
        if (this.placeholder.parentNode) {
            this.placeholder.style.opacity = '0';
            this.placeholder.style.transform = 'scaleY(0)';
            
            setTimeout(() => {
                if (this.placeholder.parentNode) {
                    this.placeholder.parentNode.removeChild(this.placeholder);
                }
            }, 200);
        }
    }

    // 处理拖拽开始
    handleDragStart(e, item) {
        if (!this.isEnabled) {
            e.preventDefault();
            return;
        }

        // 检查是否在编辑状态
        if (item.querySelector('.edit-form')) {
            e.preventDefault();
            return;
        }

        this.draggedElement = item;
        this.draggedIndex = this.getItemIndex(item);

        // 设置拖拽效果
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');

        // 添加拖拽样式
        setTimeout(() => {
            item.classList.add('dragging');
            item.style.opacity = '0.5';
        }, 0);

        // 设置拖拽预览图
        this.setDragImage(e, item);

        console.log('开始拖拽任务:', this.draggedIndex);
    }

    // 处理拖拽结束
    handleDragEnd(e, item) {
        if (!this.draggedElement) return;

        // 清理样式
        item.classList.remove('dragging');
        item.style.opacity = '';
        
        // 隐藏占位符
        this.hidePlaceholder();

        // 如果位置有变化，执行排序
        if (this.draggedIndex !== this.dragOverIndex && this.dragOverIndex !== -1) {
            this.performSort(this.draggedIndex, this.dragOverIndex);
        }

        // 重置状态
        this.resetDragState();

        console.log('拖拽结束');
    }

    // 处理拖拽悬停
    handleDragOver(e, item) {
        if (!this.draggedElement || this.draggedElement === item) {
            return;
        }

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const container = item.parentNode;
        const mouseY = e.clientY;
        const rect = item.getBoundingClientRect();
        const itemMiddle = rect.top + rect.height / 2;

        // 确定插入位置
        if (mouseY < itemMiddle) {
            this.dragOverIndex = this.getItemIndex(item);
            this.showPlaceholder(container, item);
        } else {
            this.dragOverIndex = this.getItemIndex(item) + 1;
            this.showPlaceholder(container, item.nextElementSibling);
        }

        // 自动滚动
        this.handleAutoScroll(e);
    }

    // 处理放置
    handleDrop(e, item) {
        e.preventDefault();
        // 拖拽结束会自动处理排序
    }

    // 移动端触摸开始
    handleTouchStart(e, item) {
        if (!this.isEnabled) return;

        // 检查是否在编辑状态
        if (item.querySelector('.edit-form')) {
            return;
        }

        const touch = e.touches[0];
        this.touchStartY = touch.clientY;
        this.touchStartX = touch.clientX;
        
        // 长按检测
        this.longPressTimer = setTimeout(() => {
            this.startTouchDrag(e, item);
        }, 500);
    }

    // 移动端触摸移动
    handleTouchMove(e, item) {
        if (!this.longPressTimer && !this.draggedElement) return;

        const touch = e.touches[0];
        const deltaY = Math.abs(touch.clientY - this.touchStartY);
        const deltaX = Math.abs(touch.clientX - this.touchStartX);

        // 如果移动距离过大，取消长按检测
        if (this.longPressTimer && (deltaY > 10 || deltaX > 10)) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
            return;
        }

        // 如果正在拖拽
        if (this.draggedElement) {
            e.preventDefault();
            this.updateTouchDrag(e);
        }
    }

    // 移动端触摸结束
    handleTouchEnd(e, item) {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        if (this.draggedElement) {
            this.endTouchDrag(e);
        }
    }

    // 开始触摸拖拽
    startTouchDrag(e, item) {
        e.preventDefault();
        
        this.draggedElement = item;
        this.draggedIndex = this.getItemIndex(item);
        
        // 添加拖拽样式
        item.classList.add('dragging', 'touch-dragging');
        item.style.opacity = '0.7';
        item.style.transform = 'scale(1.05)';
        item.style.zIndex = '1000';

        // 创建触觉反馈
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        console.log('开始触摸拖拽:', this.draggedIndex);
    }

    // 更新触摸拖拽
    updateTouchDrag(e) {
        const touch = e.touches[0];
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const todoItem = elementBelow ? elementBelow.closest('.todo-item') : null;

        if (todoItem && todoItem !== this.draggedElement) {
            const container = todoItem.parentNode;
            const rect = todoItem.getBoundingClientRect();
            const itemMiddle = rect.top + rect.height / 2;

            if (touch.clientY < itemMiddle) {
                this.dragOverIndex = this.getItemIndex(todoItem);
                this.showPlaceholder(container, todoItem);
            } else {
                this.dragOverIndex = this.getItemIndex(todoItem) + 1;
                this.showPlaceholder(container, todoItem.nextElementSibling);
            }
        }
    }

    // 结束触摸拖拽
    endTouchDrag(e) {
        if (!this.draggedElement) return;

        const item = this.draggedElement;

        // 清理样式
        item.classList.remove('dragging', 'touch-dragging');
        item.style.opacity = '';
        item.style.transform = '';
        item.style.zIndex = '';

        // 隐藏占位符
        this.hidePlaceholder();

        // 执行排序
        if (this.draggedIndex !== this.dragOverIndex && this.dragOverIndex !== -1) {
            this.performSort(this.draggedIndex, this.dragOverIndex);
        }

        // 重置状态
        this.resetDragState();

        console.log('触摸拖拽结束');
    }

    // 设置拖拽预览图
    setDragImage(e, item) {
        try {
            // 创建拖拽预览图
            const dragImage = item.cloneNode(true);
            dragImage.style.cssText = `
                position: absolute;
                top: -1000px;
                left: -1000px;
                width: ${item.offsetWidth}px;
                opacity: 0.8;
                transform: rotate(5deg);
                pointer-events: none;
                z-index: 9999;
            `;
            
            document.body.appendChild(dragImage);
            
            e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
            
            // 清理预览图
            setTimeout(() => {
                if (dragImage.parentNode) {
                    dragImage.parentNode.removeChild(dragImage);
                }
            }, 100);
        } catch (error) {
            console.warn('设置拖拽预览图失败:', error);
        }
    }

    // 自动滚动处理
    handleAutoScroll(e) {
        const scrollContainer = this.findScrollContainer(e.target);
        if (!scrollContainer) return;

        const rect = scrollContainer.getBoundingClientRect();
        const scrollZone = 50; // 滚动触发区域
        const scrollSpeed = 5;

        let scrollDelta = 0;

        if (e.clientY < rect.top + scrollZone) {
            scrollDelta = -scrollSpeed;
        } else if (e.clientY > rect.bottom - scrollZone) {
            scrollDelta = scrollSpeed;
        }

        if (scrollDelta !== 0) {
            this.startAutoScroll(scrollContainer, scrollDelta);
        } else {
            this.stopAutoScroll();
        }
    }

    // 开始自动滚动
    startAutoScroll(container, delta) {
        this.stopAutoScroll();
        
        this.autoScrollInterval = setInterval(() => {
            container.scrollTop += delta;
        }, 16);
    }

    // 停止自动滚动
    stopAutoScroll() {
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
    }

    // 查找滚动容器
    findScrollContainer(element) {
        let parent = element.parentNode;
        
        while (parent && parent !== document.body) {
            const style = window.getComputedStyle(parent);
            if (style.overflow === 'auto' || style.overflow === 'scroll' || 
                style.overflowY === 'auto' || style.overflowY === 'scroll') {
                return parent;
            }
            parent = parent.parentNode;
        }
        
        return window;
    }

    // 获取项目索引
    getItemIndex(item) {
        const container = item.parentNode;
        const items = Array.from(container.children).filter(child => 
            child.classList.contains('todo-item') && 
            child !== this.placeholder
        );
        return items.indexOf(item);
    }

    // 执行排序
    performSort(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;

        console.log(`排序: ${fromIndex} -> ${toIndex}`);

        // 调用回调函数
        if (this.sortCallback) {
            this.sortCallback(fromIndex, toIndex);
        }

        // 触发视觉反馈
        this.showSortFeedback();
    }

    // 显示排序反馈
    showSortFeedback() {
        // 可以在这里添加排序成功的视觉反馈
        console.log('任务排序完成');
    }

    // 重置拖拽状态
    resetDragState() {
        this.draggedElement = null;
        this.draggedIndex = -1;
        this.dragOverIndex = -1;
        this.stopAutoScroll();
    }

    // 绑定全局事件
    bindGlobalEvents() {
        // 阻止默认的拖拽行为
        document.addEventListener('dragover', (e) => {
            if (this.draggedElement) {
                e.preventDefault();
            }
        });

        document.addEventListener('drop', (e) => {
            if (this.draggedElement) {
                e.preventDefault();
            }
        });
    }

    // 启用/禁用拖拽
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    // 销毁拖拽排序
    destroy(container) {
        if (container && container._dragSortObserver) {
            container._dragSortObserver.disconnect();
            delete container._dragSortConfig;
            delete container._dragSortObserver;
        }

        this.stopAutoScroll();
        this.hidePlaceholder();
        this.resetDragState();
    }
}

// 添加拖拽排序样式
const style = document.createElement('style');
style.textContent = `
    .todo-item.dragging {
        opacity: 0.5 !important;
        transform: rotate(2deg);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        cursor: grabbing !important;
    }

    .todo-item.touch-dragging {
        opacity: 0.7 !important;
        transform: scale(1.05) rotate(2deg) !important;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3) !important;
        z-index: 1000 !important;
    }

    .drag-placeholder {
        animation: placeholderPulse 1.5s infinite;
    }

    @keyframes placeholderPulse {
        0%, 100% { 
            opacity: 0.6; 
            transform: scaleY(1);
        }
        50% { 
            opacity: 1; 
            transform: scaleY(1.02);
        }
    }

    .todo-item[draggable="true"] .todo-content {
        cursor: grab;
    }

    .todo-item[draggable="true"] .todo-content:active {
        cursor: grabbing;
    }

    /* 移动端优化 */
    @media (max-width: 768px) {
        .todo-item.touch-dragging {
            transform: scale(1.08) rotate(1deg) !important;
        }
        
        .drag-placeholder {
            height: 50px;
            font-size: 12px;
        }
    }

    /* 防止文本选择 */
    .todo-item.dragging,
    .todo-item.touch-dragging {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }
`;
document.head.appendChild(style);

// 创建全局实例
const dragSortManager = new DragSortManager();

// 导出模块
export { DragSortManager, dragSortManager };