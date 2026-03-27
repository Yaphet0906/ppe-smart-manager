module.exports = {
  apps: [
    {
      name: 'ppe-smart-manager',
      script: './src/index.js',
      instances: 'max', // 根据CPU核心数启动多个实例
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // 日志配置
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 自动重启配置
      min_uptime: '10s',
      max_restarts: 5,
      // 内存限制
      max_memory_restart: '500M',
      // 监控配置
      watch: false,
      // 优雅关闭
      kill_timeout: 5000,
      listen_timeout: 10000,
      // 健康检查
      health_check_grace_period: 10000
    }
  ]
};
