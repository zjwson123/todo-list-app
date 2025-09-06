# Todo App - 极简待办清单

基于纯HTML+CSS+JavaScript的极简待办事项应用，无框架依赖。

## 项目特性

- ✅ 纯原生技术栈：HTML5 + CSS3 + ES6
- ✅ 零框架依赖
- ✅ 本地存储支持 (localStorage)
- ✅ 响应式设计
- ✅ 热重载开发体验 (Vite)

## 功能特性

- 添加新任务
- 标记任务完成/未完成
- 删除任务
- 编辑任务内容
- 任务过滤（全部/待完成/已完成）
- 清除所有已完成任务
- 任务统计显示

## 技术架构

```
todo-app/
├── index.html          # 主HTML文件
├── css/
│   └── style.css       # 样式文件
├── js/
│   └── main.js         # JavaScript模块
├── assets/             # 静态资源目录
├── package.json        # 项目配置
├── vite.config.js      # Vite配置
└── README.md           # 项目文档
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 开发说明

- 使用ES6模块语法
- CSS使用CSS变量进行主题管理
- 采用语义化HTML结构
- 响应式设计支持移动设备
- 使用localStorage进行数据持久化

## 浏览器支持

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+