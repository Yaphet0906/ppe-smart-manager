/**
 * 统一错误处理中间件
 * 标准化错误响应格式和日志记录
 */

const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  // 设置默认值
  const statusCode = err.statusCode || err.status || 500;
  
  // 记录错误日志
  logger.error('请求处理错误', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.userId,
    companyId: req.companyId,
    statusCode
  });
  
  // 生产环境隐藏详细错误
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 统一响应格式
  const response = {
    code: statusCode,
    msg: isProduction ? '服务器内部错误' : err.message
  };
  
  // 非生产环境添加调试信息
  if (!isProduction && err.stack) {
    response.debug = {
      stack: err.stack.split('\n').slice(0, 5)
    };
  }
  
  res.status(statusCode).json(response);
};

/**
 * 捕获异步错误的包装器
 * 自动捕获路由中的异步错误并传递给错误处理中间件
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 创建业务错误的工厂函数
 */
const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = {
  errorHandler,
  asyncHandler,
  createError
};
