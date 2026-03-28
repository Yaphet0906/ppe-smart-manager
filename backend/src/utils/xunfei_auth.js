/**
 * 讯飞AI API 认证工具模块
 * Xunfei AI API Authentication Utilities
 * 
 * 功能：提供讯飞API签名认证相关的工具函数
 * Features: Provides utility functions for Xunfei API signature authentication
 */

const crypto = require('crypto');

/**
 * 生成RFC1123格式的时间戳
 * Generate RFC1123 formatted date string
 * @returns {string} RFC1123格式的时间戳，如 "Mon, 01 Jan 2024 00:00:00 GMT"
 */
function getRfc1123Date() {
  const date = new Date();
  return date.toUTCString();
}

/**
 * Base64编码
 * Base64 encode a string
 * @param {string} str - 需要编码的字符串
 * @returns {string} Base64编码后的字符串
 */
function base64Encode(str) {
  return Buffer.from(str).toString('base64');
}

/**
 * Base64解码
 * Base64 decode a string
 * @param {string} str - Base64编码的字符串
 * @returns {string} 解码后的字符串
 */
function base64Decode(str) {
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * HMAC-SHA256签名
 * Generate HMAC-SHA256 signature
 * @param {string} message - 需要签名的消息
 * @param {string} secret - 密钥
 * @returns {string} Base64编码的签名结果
 */
function hmacSha256(message, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64');
}

/**
 * 生成讯飞API签名（HTTP API版本）
 * Generate Xunfei API signature for HTTP APIs
 * @param {string} apiKey - 讯飞API Key
 * @param {string} apiSecret - 讯飞API Secret
 * @param {string} host - API主机地址，如 "api.xfyun.cn"
 * @param {string} date - RFC1123格式的时间戳
 * @param {string} requestLine - HTTP请求行，如 "POST /v2/ocr HTTP/1.1"
 * @returns {string} 完整的Authorization头值
 */
function generateHttpSignature(apiKey, apiSecret, host, date, requestLine) {
  // 构建签名原文
  const signatureOrigin = `host: ${host}\ndate: ${date}\n${requestLine}`;
  
  // 使用HMAC-SHA256签名
  const signature = hmacSha256(signatureOrigin, apiSecret);
  
  // 构建Authorization头
  const authorization = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  
  return authorization;
}

/**
 * 生成讯飞API签名（WebSocket版本）
 * Generate Xunfei API signature for WebSocket APIs
 * @param {string} apiKey - 讯飞API Key
 * @param {string} apiSecret - 讯飞API Secret
 * @returns {Object} 包含签名的对象 { url, date }
 */
function generateWebSocketSignature(apiKey, apiSecret) {
  const date = getRfc1123Date();
  
  // 构建签名原文（WebSocket版本）
  const signatureOrigin = `host: ws-api.xfyun.cn\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
  
  // 使用HMAC-SHA256签名
  const signature = hmacSha256(signatureOrigin, apiSecret);
  
  // 构建Authorization头（需要进行Base64编码）
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = base64Encode(authorizationOrigin);
  
  return {
    date,
    authorization
  };
}

/**
 * 生成完整的API请求头
 * Generate complete API request headers
 * @param {Object} config - 配置对象
 * @param {string} config.appId - 讯飞应用ID
 * @param {string} config.apiKey - 讯飞API Key
 * @param {string} config.apiSecret - 讯飞API Secret
 * @param {string} config.host - API主机地址
 * @param {string} config.requestLine - HTTP请求行
 * @returns {Object} 完整的请求头对象
 */
function generateRequestHeaders(config) {
  const { appId, apiKey, apiSecret, host, requestLine } = config;
  const date = getRfc1123Date();
  const authorization = generateHttpSignature(apiKey, apiSecret, host, date, requestLine);
  
  return {
    'Content-Type': 'application/json',
    'Host': host,
    'Date': date,
    'Authorization': authorization,
    'X-Appid': appId
  };
}

/**
 * 生成WebSocket连接URL
 * Generate WebSocket connection URL
 * @param {Object} config - 配置对象
 * @param {string} config.appId - 讯飞应用ID
 * @param {string} config.apiKey - 讯飞API Key
 * @param {string} config.apiSecret - 讯飞API Secret
 * @param {string} config.baseUrl - WebSocket基础URL
 * @returns {string} 完整的WebSocket URL
 */
function generateWebSocketUrl(config) {
  const { appId, apiKey, apiSecret, baseUrl } = config;
  const { date, authorization } = generateWebSocketSignature(apiKey, apiSecret);
  
  // 构建查询参数
  const params = new URLSearchParams({
    authorization,
    date,
    host: 'ws-api.xfyun.cn'
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * 对对象参数进行排序并编码
 * Sort and encode object parameters
 * @param {Object} params - 参数对象
 * @returns {string} 排序并编码后的参数字符串
 */
function sortAndEncodeParams(params) {
  const sortedKeys = Object.keys(params).sort();
  const encodedParams = sortedKeys.map(key => {
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(String(params[key]));
    return `${encodedKey}=${encodedValue}`;
  });
  return encodedParams.join('&');
}

/**
 * 生成MD5哈希
 * Generate MD5 hash
 * @param {string} str - 需要哈希的字符串
 * @returns {string} MD5哈希值（小写）
 */
function md5Hash(str) {
  return crypto.createHash('md5').update(str).digest('hex').toLowerCase();
}

/**
 * 生成SHA256哈希
 * Generate SHA256 hash
 * @param {string} str - 需要哈希的字符串
 * @returns {string} SHA256哈希值（小写）
 */
function sha256Hash(str) {
  return crypto.createHash('sha256').update(str).digest('hex').toLowerCase();
}

/**
 * 生成随机字符串
 * Generate random string
 * @param {number} length - 字符串长度，默认16
 * @returns {string} 随机字符串
 */
function generateNonce(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  // 核心签名函数
  generateHttpSignature,
  generateWebSocketSignature,
  generateRequestHeaders,
  generateWebSocketUrl,
  
  // 基础工具函数
  getRfc1123Date,
  base64Encode,
  base64Decode,
  hmacSha256,
  sortAndEncodeParams,
  md5Hash,
  sha256Hash,
  generateNonce
};
