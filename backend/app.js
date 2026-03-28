const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // 后端端口固定为3001

// 跨域配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// 解析请求体
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 路由挂载（示例）
app.use('/api/user', require('./routes/user'));
app.use('/api/ppe', require('./routes/ppe'));

// 为了兼容前端直接请求，也挂载到根路径
app.use('/user', require('./routes/user'));
app.use('/ppe', require('./routes/ppe'));

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    code: err.status || 500,
    msg: err.message || '服务器内部错误'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`后端服务器运行在：http://localhost:${PORT}`);
});

module.exports = app;
