// 环境变量读取（需配合.env文件）
const mysql = require('mysql2/promise');
require('dotenv').config();

// 检查必要的环境变量
if (!process.env.DB_PASSWORD) {
  console.error('错误: DB_PASSWORD 环境变量未设置');
  process.exit(1);
}

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ppe_smart_manager',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 测试连接
async function testDbConnection() {
  try {
    const [rows] = await pool.query('SELECT 1');
    console.log('数据库连接成功');
  } catch (err) {
    console.error('数据库连接失败：', err);
    process.exit(1);
  }
}

testDbConnection();

module.exports = pool;
