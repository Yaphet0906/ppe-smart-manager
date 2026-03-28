/**
 * PPE智能管理系统 - 后端入口文件
 * Express服务器配置
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// 加载环境变量
require('dotenv').config();

// 导入路由
const userRoutes = require('./routes/users');
const inventoryRoutes = require('./routes/inventory');
const inboundRoutes = require('./routes/inbound');
const outboundRoutes = require('./routes/outbound');
const exportRoutes = require('./routes/export');

// 导入数据库连接测试
const { testConnection } = require('./config/database');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件配置
// 1. Helmet安全头
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// 2. 请求限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
  message: {
    success: false,
    data: null,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 3. CORS跨域配置
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: corsOrigin || (process.env.NODE_ENV === 'production' ? false : '*'),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 2. JSON解析中间件
app.use(express.json({ limit: '10mb' }));

// 3. URL编码解析中间件
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// 路由挂载
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/inbound', inboundRoutes);
app.use('/api/outbound', outboundRoutes);
app.use('/api/export', exportRoutes);

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    },
    message: '服务器运行正常'
  });
});

// 404错误处理 - 当没有匹配的路由时
app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    message: '请求的资源不存在'
  });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误:', err);
  
  // 处理JSON解析错误
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      data: null,
      message: '请求体JSON格式错误'
    });
  }
  
  // 处理其他错误
  res.status(err.status || 500).json({
    success: false,
    data: null,
    message: err.message || '服务器内部错误'
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.warn('警告: 数据库连接失败，服务器将继续启动但部分功能可能不可用');
    }
    
    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log('PPE智能管理系统后端服务已启动');
      console.log('='.repeat(50));
      console.log(`服务器地址: http://localhost:${PORT}`);
      console.log(`API基础路径: http://localhost:${PORT}/api`);
      console.log(`健康检查: http://localhost:${PORT}/api/health`);
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 启动服务
startServer();

module.exports = app;
