const { defineConfig } = require('@vue/cli-service');
module.exports = defineConfig({
  // 适配GitHub Pages路径
  publicPath: process.env.NODE_ENV === 'production' 
    ? '/ppe-smart-manager/' // 必须和仓库名一致
    : '/',
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
        target: 'http://localhost:3001', // 后端新端口3001
        changeOrigin: true,
        pathRewrite: { '^/api': '' }
      }
    }
  }
});
