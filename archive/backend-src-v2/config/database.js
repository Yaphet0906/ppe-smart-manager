/**
 * 数据库配置模块
 * MySQL连接池配置和连接测试
 */

const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ppe_smart_manager',
  // 连接池配置
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 连接超时配置
  connectTimeout: 10000,
  acquireTimeout: 10000,
  timeout: 60000,
  // 启用日期字符串化
  dateStrings: true,
  // 字符集配置
  charset: 'utf8mb4'
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

/**
 * 测试数据库连接
 * @returns {Promise<boolean>} 连接是否成功
 */
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    
    // 测试查询
    const [rows] = await connection.query('SELECT 1 as test');
    console.log('数据库查询测试成功:', rows[0]);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    return false;
  }
};

/**
 * 执行SQL查询
 * @param {string} sql - SQL语句
 * @param {Array} params - 查询参数
 * @returns {Promise<Array>} 查询结果
 */
const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('SQL查询错误:', error.message);
    console.error('SQL:', sql);
    console.error('参数:', params);
    throw error;
  }
};

/**
 * 执行事务
 * @param {Function} callback - 事务回调函数，接收connection参数
 * @returns {Promise<any>} 事务执行结果
 */
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('事务执行失败，已回滚:', error.message);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 获取数据库连接（用于复杂操作）
 * @returns {Promise<Connection>} 数据库连接
 */
const getConnection = async () => {
  return await pool.getConnection();
};

/**
 * 关闭连接池
 */
const closePool = async () => {
  await pool.end();
  console.log('数据库连接池已关闭');
};

module.exports = {
  pool,
  query,
  transaction,
  getConnection,
  testConnection,
  closePool
};
