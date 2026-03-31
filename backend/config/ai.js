// AI 服务配置
require('dotenv').config();

module.exports = {
  // Moonshot (Kimi) API Key
  MOONSHOT_API_KEY: process.env.MOONSHOT_API_KEY,
  
  // API 地址
  MOONSHOT_API_URL: 'https://api.moonshot.cn/v1/chat/completions',
  
  // 使用的模型
  MODEL: 'kimi-k2.5'
};