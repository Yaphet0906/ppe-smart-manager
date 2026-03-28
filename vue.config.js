const { defineConfig } = require('@vue/cli-service');
const path = require('path');
module.exports = defineConfig({
  // 适配GitHub Pages路径
  publicPath: '/',
  // 指定源代码目录
  pages: {
    index: {
      entry: 'frontend/src/main.js',
      template: 'frontend/public/index.html',
      filename: 'index.html'
    }
  },
  outputDir: 'dist',
  assetsDir: 'static',
  lintOnSave: false,
  productionSourceMap: false,
  // 配置跨域代理（联调后端新端口3001）
  devServer: {
    port: 8088, // 前端端口替换为8088
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
        logLevel: 'debug'
      }
    }
  }
});
