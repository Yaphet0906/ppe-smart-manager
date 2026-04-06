const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY;

// 检查必要的环境变量
if (!SECRET_KEY) {
  console.error('错误: SECRET_KEY 环境变量未设置');
  process.exit(1);
}

// JWT 认证中间件
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ code: 401, msg: '未登录' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    req.companyId = decoded.companyId;
    req.userId = decoded.id;
    req.userName = decoded.name;
    next();
  } catch (error) {
    return res.status(401).json({ code: 401, msg: 'token无效' });
  }
};

module.exports = authMiddleware;
