const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// 检查必要的环境变量
if (!JWT_SECRET) {
  console.error('错误: JWT_SECRET 环境变量未设置');
  process.exit(1);
}

// JWT 认证中间件
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ code: 401, msg: '未登录' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.companyId = decoded.companyId;
    req.userId = decoded.id;
    req.userName = decoded.name;
    next();
  } catch (error) {
    return res.status(401).json({ code: 401, msg: 'token无效' });
  }
};

module.exports = authMiddleware;
