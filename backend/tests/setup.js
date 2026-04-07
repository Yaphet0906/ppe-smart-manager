// 测试环境设置
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DB_PASSWORD = 'Asdf1234';
process.env.DB_USER = 'root';
process.env.DB_NAME = 'ppe_smart_manager';
process.env.CORS_ORIGIN = 'http://localhost:8088';
process.env.LOG_LEVEL = 'error';  // 测试时只记录错误日志
