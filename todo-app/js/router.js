/**
 * 纯JavaScript Hash路由系统
 * 支持 #home 和 #settings 页面切换
 */

class HashRouter {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.init();
    }

    // 初始化路由
    init() {
        // 监听hash变化
        window.addEventListener('hashchange', () => {
            this.handleRouteChange();
        });

        // 监听浏览器前进后退
        window.addEventListener('popstate', () => {
            this.handleRouteChange();
        });

        // 页面加载时处理初始路由
        document.addEventListener('DOMContentLoaded', () => {
            this.handleRouteChange();
        });
    }

    // 注册路由
    register(path, handler) {
        this.routes.set(path, handler);
    }

    // 导航到指定路由
    navigate(path) {
        // 更新URL hash
        window.location.hash = path;
    }

    // 处理路由变化
    handleRouteChange() {
        const hash = window.location.hash.slice(1) || 'home'; // 默认为home
        const handler = this.routes.get(hash);

        if (handler) {
            // 更新当前路由
            this.currentRoute = hash;
            
            // 更新导航栏活跃状态
            this.updateNavigation(hash);
            
            // 执行路由处理函数
            handler();
        } else {
            // 未匹配的路由，重定向到首页
            this.navigate('home');
        }
    }

    // 更新导航栏活跃状态
    updateNavigation(activeRoute) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const route = link.getAttribute('data-route');
            link.classList.toggle('active', route === activeRoute);
        });
    }

    // 获取当前路由
    getCurrentRoute() {
        return this.currentRoute;
    }
}

// 页面渲染管理器
class PageRenderer {
    constructor() {
        this.pageContainer = null;
        this.pages = new Map();
    }

    // 初始化页面容器
    init() {
        this.pageContainer = document.getElementById('page-container');
        if (!this.pageContainer) {
            console.error('Page container not found');
            return false;
        }
        return true;
    }

    // 注册页面
    registerPage(route, pageElement) {
        this.pages.set(route, pageElement);
    }

    // 显示指定页面
    showPage(route) {
        if (!this.pageContainer) return;

        // 隐藏所有页面
        this.pages.forEach((page) => {
            if (page && page.style) {
                page.style.display = 'none';
            }
        });

        // 显示目标页面
        const targetPage = this.pages.get(route);
        if (targetPage) {
            targetPage.style.display = 'block';
        } else {
            console.warn(`Page not found for route: ${route}`);
        }
    }

    // 隐藏所有页面
    hideAllPages() {
        this.pages.forEach((page) => {
            if (page && page.style) {
                page.style.display = 'none';
            }
        });
    }
}

// 导出router实例（单例模式）
const router = new HashRouter();
const pageRenderer = new PageRenderer();

export { router, pageRenderer };