import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: {
          // React 核心库
          'react-vendor': ['react', 'react-dom'],
          // Antd UI 库
          'antd-vendor': ['antd'],
          // Antd 图标库
          'antd-icons': ['@ant-design/icons'],
          // Redux 状态管理
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          // 我们的服务层
          'app-services': [
            './src/services/mcpClient.ts',
            './src/services/llmClient.ts', 
            './src/services/securityEngine.ts'
          ],
          // 我们的组件
          'app-components': [
            './src/components/ConfigPanel.tsx',
            './src/components/MCPExplorer.tsx',
            './src/components/HistoryPanel.tsx',
            './src/components/LLMConfig.tsx',
            './src/components/SecurityPanel.tsx'
          ]
        }
      }
    },
    target: 'esnext',
    minify: true, // 生产环境压缩
    sourcemap: false,
    chunkSizeWarningLimit: 1000 // 调整警告阈值到 1000KB，antd-vendor 大小是合理的
  },
  server: {
    port: 5173,
    host: 'localhost'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}); 