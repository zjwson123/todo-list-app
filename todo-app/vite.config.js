import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages 部署配置
  base: '/todo-list-app/',
  
  // 开发服务器配置
  server: {
    port: 3000,
    host: true,
    open: true
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      }
    }
  },
  
  // 静态资源处理
  assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.gif'],
  
  // 预览服务器配置
  preview: {
    port: 4173,
    host: true
  }
})