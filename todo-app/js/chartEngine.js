/**
 * 图表渲染引擎
 * 提供Canvas/SVG图表基础框架和响应式图表系统
 */

export class ChartEngine {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.options = {
            width: 800,
            height: 400,
            margin: { top: 20, right: 20, bottom: 40, left: 40 },
            responsive: true,
            animation: true,
            animationDuration: 800,
            theme: 'auto', // 'light', 'dark', 'auto'
            ...options
        };
        
        this.canvas = null;
        this.ctx = null;
        this.svg = null;
        this.renderMode = options.renderMode || 'canvas'; // 'canvas' 或 'svg'
        this.isTouch = 'ontouchstart' in window;
        
        this.initializeRenderer();
        this.setupResponsive();
        this.setupInteractions();
    }
    
    /**
     * 初始化渲染器
     */
    initializeRenderer() {
        if (!this.container) {
            throw new Error('图表容器不存在');
        }
        
        this.container.style.position = 'relative';
        
        if (this.renderMode === 'canvas') {
            this.initCanvas();
        } else {
            this.initSVG();
        }
    }
    
    /**
     * 初始化Canvas渲染器
     */
    initCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'display: block; max-width: 100%; height: auto;';
        this.ctx = this.canvas.getContext('2d');
        
        // 高DPI支持
        this.setupHighDPI();
        
        this.container.appendChild(this.canvas);
    }
    
    /**
     * 初始化SVG渲染器
     */
    initSVG() {
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.cssText = 'display: block; max-width: 100%; height: auto;';
        this.container.appendChild(this.svg);
    }
    
    /**
     * 设置高DPI支持
     */
    setupHighDPI() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.container.getBoundingClientRect();
        
        this.canvas.width = this.options.width * dpr;
        this.canvas.height = this.options.height * dpr;
        this.canvas.style.width = this.options.width + 'px';
        this.canvas.style.height = this.options.height + 'px';
        
        this.ctx.scale(dpr, dpr);
    }
    
    /**
     * 设置响应式布局
     */
    setupResponsive() {
        if (!this.options.responsive) return;
        
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                this.handleResize(entry.contentRect);
            }
        });
        
        resizeObserver.observe(this.container);
        this.resizeObserver = resizeObserver;
    }
    
    /**
     * 处理尺寸变化
     */
    handleResize(rect) {
        const newWidth = Math.max(300, rect.width);
        const newHeight = Math.max(200, newWidth * 0.5); // 保持2:1比例
        
        this.options.width = newWidth;
        this.options.height = newHeight;
        
        if (this.renderMode === 'canvas') {
            this.setupHighDPI();
        } else {
            this.svg.setAttribute('width', newWidth);
            this.svg.setAttribute('height', newHeight);
            this.svg.setAttribute('viewBox', `0 0 ${newWidth} ${newHeight}`);
        }
        
        // 触发重绘
        if (this.currentChart) {
            this.currentChart.render();
        }
    }
    
    /**
     * 设置交互功能
     */
    setupInteractions() {
        const element = this.canvas || this.svg;
        
        // 鼠标/触摸事件处理
        const events = this.isTouch ? 
            ['touchstart', 'touchmove', 'touchend'] : 
            ['mousedown', 'mousemove', 'mouseup', 'click', 'mouseleave'];
            
        events.forEach(eventType => {
            element.addEventListener(eventType, this.handleInteraction.bind(this));
        });
    }
    
    /**
     * 处理交互事件
     */
    handleInteraction(event) {
        if (!this.currentChart || !this.currentChart.handleInteraction) return;
        
        const rect = (this.canvas || this.svg).getBoundingClientRect();
        const x = (event.clientX || event.touches?.[0]?.clientX || 0) - rect.left;
        const y = (event.clientY || event.touches?.[0]?.clientY || 0) - rect.top;
        
        this.currentChart.handleInteraction({
            type: event.type,
            x,
            y,
            originalEvent: event
        });
    }
    
    /**
     * 清空画布
     */
    clear() {
        if (this.renderMode === 'canvas') {
            this.ctx.clearRect(0, 0, this.options.width, this.options.height);
        } else {
            while (this.svg.firstChild) {
                this.svg.removeChild(this.svg.firstChild);
            }
        }
    }
    
    /**
     * 渲染图表
     */
    render(chartInstance) {
        this.currentChart = chartInstance;
        this.clear();
        
        if (this.options.animation && chartInstance.animate) {
            chartInstance.animate(this.options.animationDuration);
        } else {
            chartInstance.render();
        }
    }
    
    /**
     * 获取当前主题
     */
    getCurrentTheme() {
        if (this.options.theme === 'auto') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return this.options.theme;
    }
    
    /**
     * 导出图表为图片
     */
    exportAsImage(format = 'png', quality = 0.9) {
        if (this.renderMode === 'canvas') {
            return this.canvas.toDataURL(`image/${format}`, quality);
        } else {
            // SVG导出需要转换为canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            return new Promise((resolve, reject) => {
                img.onload = () => {
                    canvas.width = this.options.width;
                    canvas.height = this.options.height;
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL(`image/${format}`, quality));
                };
                
                img.onerror = reject;
                
                const svgData = new XMLSerializer().serializeToString(this.svg);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                img.src = URL.createObjectURL(svgBlob);
            });
        }
    }
    
    /**
     * 销毁图表引擎
     */
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.canvas) {
            this.canvas.remove();
        }
        
        if (this.svg) {
            this.svg.remove();
        }
        
        this.currentChart = null;
    }
}

/**
 * 基础图表类
 * 所有具体图表类型的基类
 */
export class BaseChart {
    constructor(engine, data, options = {}) {
        this.engine = engine;
        this.data = data;
        this.options = {
            colors: [],
            showTooltip: true,
            showLegend: true,
            ...options
        };
        
        this.tooltip = null;
        this.legend = null;
        this.isAnimating = false;
        this.animationProgress = 0;
        
        this.setupTooltip();
        this.setupLegend();
    }
    
    /**
     * 设置工具提示
     */
    setupTooltip() {
        if (!this.options.showTooltip) return;
        
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'chart-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 1000;
        `;
        
        document.body.appendChild(this.tooltip);
    }
    
    /**
     * 设置图例
     */
    setupLegend() {
        if (!this.options.showLegend) return;
        
        this.legend = document.createElement('div');
        this.legend.className = 'chart-legend';
        this.legend.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 8px;
            font-size: 12px;
        `;
        
        this.engine.container.appendChild(this.legend);
    }
    
    /**
     * 显示工具提示
     */
    showTooltip(x, y, content) {
        if (!this.tooltip) return;
        
        this.tooltip.innerHTML = content;
        this.tooltip.style.left = x + 10 + 'px';
        this.tooltip.style.top = y - 10 + 'px';
        this.tooltip.style.opacity = '1';
    }
    
    /**
     * 隐藏工具提示
     */
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
        }
    }
    
    /**
     * 渲染图例
     */
    renderLegend(items) {
        if (!this.legend) return;
        
        this.legend.innerHTML = '';
        
        items.forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.style.cssText = 'display: flex; align-items: center; gap: 6px;';
            
            const colorBox = document.createElement('div');
            colorBox.style.cssText = `
                width: 12px;
                height: 12px;
                background: ${item.color};
                border-radius: 2px;
            `;
            
            const label = document.createElement('span');
            label.textContent = item.label;
            
            legendItem.appendChild(colorBox);
            legendItem.appendChild(label);
            this.legend.appendChild(legendItem);
        });
    }
    
    /**
     * 动画渲染
     */
    animate(duration) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        const startTime = performance.now();
        
        const animateFrame = (currentTime) => {
            const elapsed = currentTime - startTime;
            this.animationProgress = Math.min(elapsed / duration, 1);
            
            // 使用easeOutCubic缓动函数
            const easedProgress = 1 - Math.pow(1 - this.animationProgress, 3);
            
            this.render(easedProgress);
            
            if (this.animationProgress < 1) {
                requestAnimationFrame(animateFrame);
            } else {
                this.isAnimating = false;
                this.animationProgress = 1;
            }
        };
        
        requestAnimationFrame(animateFrame);
    }
    
    /**
     * 渲染图表 - 子类需要实现
     */
    render(animationProgress = 1) {
        throw new Error('子类必须实现render方法');
    }
    
    /**
     * 处理交互 - 子类可以重写
     */
    handleInteraction(event) {
        // 默认实现：处理鼠标悬停显示工具提示
        if (event.type === 'mouseleave') {
            this.hideTooltip();
        }
    }
    
    /**
     * 销毁图表
     */
    destroy() {
        if (this.tooltip) {
            this.tooltip.remove();
        }
        
        if (this.legend) {
            this.legend.remove();
        }
    }
}
