const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 检查必要的环境变量
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  console.error('错误: CORS_ORIGIN 环境变量未设置');
  process.exit(1);
}

// 1. Helmet 安全头
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
    code: 429,
    msg: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 3. 跨域配置
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// 4. 解析请求体
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 5. 请求日志中间件（仅开发环境）
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// 路由挂载
app.use('/api/user', require('./routes/user'));
app.use('/api/ppe', require('./routes/ppe'));

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    msg: '请求的资源不存在'
  });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  // 生产环境不暴露详细错误
  const message = process.env.NODE_ENV === 'production' 
    ? '服务器内部错误' 
    : err.message;
  
  res.status(err.status || 500).json({
    code: err.status || 500,
    msg: message
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`后端服务器运行在：http://localhost:${PORT}`);
});

module.exports = app;
