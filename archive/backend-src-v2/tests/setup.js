/**
 * 测试环境配置
 */

// 设置测试环境
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.DB_NAME = process.env.DB_NAME || 'ppe_smart_manager_test';
process.env.JWT_SECRET = 'test-secret-key';

// 测试超时设置
jest.setTimeout(30000);

// 全局测试钩子
beforeAll(async () => {
  // 测试开始前执行
  console.log('测试环境初始化...');
});

afterAll(async () => {
  // 测试结束后执行
  console.log('测试环境清理...');
});
