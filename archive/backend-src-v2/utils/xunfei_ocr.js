/**
 * 讯飞OCR文字识别模块
 * Xunfei OCR Text Recognition Module
 * 
 * 功能：集成讯飞OCR API，实现图片文字识别
 * Features: Integrate Xunfei OCR API for image text recognition
 */

const axios = require('axios');
const { generateRequestHeaders } = require('./xunfei_auth');

// 默认配置
const DEFAULT_CONFIG = {
  // 讯飞API配置（从环境变量读取）
  appId: process.env.XUNFEI_APP_ID || '',
  apiKey: process.env.XUNFEI_API_KEY || '',
  apiSecret: process.env.XUNFEI_API_SECRET || '',
  
  // API地址
  ocrUrl: process.env.XUNFEI_OCR_URL || 'https://api.xfyun.cn/v2/ocr/general',
  
  // 请求配置
  timeout: 30000,        // 超时时间30秒
  maxRetries: 3,         // 最大重试次数
  retryDelay: 1000,      // 重试间隔1秒
  
  // OCR识别配置
  language: 'en',        // 默认英文（支持：en英文, cn中文）
  location: true,        // 是否返回文字位置信息
  probability: true      // 是否返回置信度
};

/**
 * 延迟函数
 * Delay function for retry
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建统一的响应格式
 * Create unified response format
 * @param {boolean} success - 是否成功
 * @param {*} data - 数据
 * @param {string} message - 消息
 * @returns {Object} 统一响应对象
 */
function createResponse(success, data = null, message = '') {
  return {
    success,
    data,
    message
  };
}

/**
 * 验证配置
 * Validate configuration
 * @param {Object} config - 配置对象
 * @returns {Object} 验证结果 { valid: boolean, message: string }
 */
function validateConfig(config) {
  if (!config.appId) {
    return { valid: false, message: '缺少讯飞应用ID (XUNFEI_APP_ID)' };
  }
  if (!config.apiKey) {
    return { valid: false, message: '缺少讯飞API Key (XUNFEI_API_KEY)' };
  }
  if (!config.apiSecret) {
    return { valid: false, message: '缺少讯飞API Secret (XUNFEI_API_SECRET)' };
  }
  return { valid: true, message: '' };
}

/**
 * 识别图片中的文字
 * Recognize text in image
 * 
 * @param {string} imageBase64 - Base64编码的图片数据
 * @param {Object} options - 可选配置
 * @param {string} options.language - 识别语言 ('en'|'cn')
 * @param {boolean} options.location - 是否返回位置信息
 * @param {boolean} options.probability - 是否返回置信度
 * @param {number} options.timeout - 请求超时时间
 * @param {number} options.maxRetries - 最大重试次数
 * @returns {Promise<Object>} 识别结果 { success, data, message }
 * 
 * @example
 * const result = await recognizeText(base64Image, { language: 'cn' });
 */
async function recognizeText(imageBase64, options = {}) {
  // 合并配置
  const config = { ...DEFAULT_CONFIG, ...options };
  
  // 验证配置
  const validation = validateConfig(config);
  if (!validation.valid) {
    return createResponse(false, null, validation.message);
  }
  
  // 验证图片数据
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return createResponse(false, null, '图片数据不能为空');
  }
  
  // 清理Base64前缀（如果有）
  let cleanBase64 = imageBase64;
  if (imageBase64.includes(',')) {
    cleanBase64 = imageBase64.split(',')[1];
  }
  
  // 验证图片大小（讯飞限制：base编码后不超过4MB）
  const base64Size = Buffer.byteLength(cleanBase64, 'base64');
  if (base64Size > 4 * 1024 * 1024) {
    return createResponse(false, null, '图片大小超过4MB限制');
  }
  
  // 构建请求参数
  const requestParams = {
    language: config.language,
    location: config.location ? 'true' : 'false',
    probability: config.probability ? 'true' : 'false'
  };
  
  // 构建请求体
  const requestBody = {
    header: {
      app_id: config.appId,
      status: 3  // 一次性传输完成
    },
    parameter: {
      ocr_general: {
        language: config.language,
        location: config.location ? 'true' : 'false',
        probability: config.probability ? 'true' : 'false'
      }
    },
    payload: {
      image: {
        encoding: 'jpg',
        status: 3,
        image: cleanBase64
      }
    }
  };
  
  // 解析URL获取host和path
  const urlObj = new URL(config.ocrUrl);
  const host = urlObj.host;
  const path = urlObj.pathname;
  
  // 生成请求头
  const headers = generateRequestHeaders({
    appId: config.appId,
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    host: host,
    requestLine: `POST ${path} HTTP/1.1`
  });
  
  // 重试机制
  let lastError = null;
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      // 发送请求
      const response = await axios.post(config.ocrUrl, requestBody, {
        headers,
        timeout: config.timeout
      });
      
      // 解析响应
      const result = response.data;
      
      // 检查API返回的错误
      if (result.code !== 0) {
        return createResponse(false, null, `讯飞API错误: ${result.message || '未知错误'} (code: ${result.code})`);
      }
      
      // 提取识别结果
      const ocrResult = result.data?.ocr_general || result.data;
      
      if (!ocrResult || !ocrResult.text) {
        return createResponse(false, null, '未识别到文字内容');
      }
      
      // 格式化返回结果
      const formattedResult = {
        text: ocrResult.text,
        lines: ocrResult.line || [],
        words: ocrResult.word || [],
        raw: ocrResult
      };
      
      return createResponse(true, formattedResult, '识别成功');
      
    } catch (error) {
      lastError = error;
      
      // 判断是否需要重试
      const shouldRetry = 
        error.code === 'ECONNABORTED' ||      // 超时
        error.code === 'ECONNRESET' ||        // 连接重置
        error.code === 'ETIMEDOUT' ||         // 连接超时
        (error.response && error.response.status >= 500); // 服务器错误
      
      if (shouldRetry && attempt < config.maxRetries - 1) {
        console.log(`OCR请求失败，${config.retryDelay}ms后重试 (${attempt + 1}/${config.maxRetries})...`);
        await delay(config.retryDelay * (attempt + 1)); // 指数退避
        continue;
      }
      
      break;
    }
  }
  
  // 处理最终错误
  if (lastError) {
    if (lastError.code === 'ECONNABORTED' || lastError.code === 'ETIMEDOUT') {
      return createResponse(false, null, '请求超时，请检查网络连接');
    }
    if (lastError.response) {
      const status = lastError.response.status;
      const message = lastError.response.data?.message || lastError.message;
      return createResponse(false, null, `HTTP错误 ${status}: ${message}`);
    }
    return createResponse(false, null, `网络错误: ${lastError.message}`);
  }
  
  return createResponse(false, null, '未知错误');
}

/**
 * 从识别结果中提取PPE信息
 * Extract PPE information from recognized text
 * 
 * @param {string|Object} recognizedText - 识别的文字或识别结果对象
 * @returns {Object} 提取的PPE信息
 * 
 * @example
 * const ppeInfo = extractPPEInfo('安全帽 10个 张三 2024-01-15');
 * // Returns: { items: [{name: '安全帽', quantity: 10}], recipient: '张三', date: '2024-01-15' }
 */
function extractPPEInfo(recognizedText) {
  // 如果传入的是对象，提取text字段
  let text = recognizedText;
  if (typeof recognizedText === 'object' && recognizedText !== null) {
    text = recognizedText.text || recognizedText.data?.text || JSON.stringify(recognizedText);
  }
  
  if (!text || typeof text !== 'string') {
    return {
      items: [],
      recipient: null,
      date: null,
      orderNumber: null,
      confidence: 0
    };
  }
  
  // 清理文本
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // PPE物品关键词库
  const ppeKeywords = [
    '安全帽', '头盔', '安全鞋', '防护鞋', '劳保鞋',
    '手套', '防护手套', '劳保手套',
    '护目镜', '防护眼镜', '安全眼镜',
    '口罩', '防尘口罩', '防毒面具',
    '防护服', '工作服', '反光背心',
    '安全带', '安全绳', '耳塞', '耳罩',
    '安全网', '警示带', '绝缘手套',
    '焊接面罩', '防化服', '防切割手套'
  ];
  
  // 提取PPE物品
  const items = [];
  const matchedItems = new Set(); // 避免重复匹配
  
  // 方法1: 全局匹配所有物品（优先）
  // 支持格式：安全帽 10个 / 安全帽x10 / 安全帽*10 / 安全帽:10
  const itemPattern = new RegExp(
    `(${ppeKeywords.join('|')})\\s*[xX*×:]?\\s*(\\d+)\\s*(个|件|套|双|副|条|顶|只)?`,
    'gi'
  );
  
  let match;
  while ((match = itemPattern.exec(cleanText)) !== null) {
    const name = match[1].trim();
    const quantity = parseInt(match[2], 10);
    const unit = match[3] || '个';
    const key = `${name}-${quantity}`;
    
    // 避免重复添加相同物品
    if (!matchedItems.has(key)) {
      matchedItems.add(key);
      items.push({ name, quantity, unit });
    }
  }
  
  // 方法2: 按行匹配（如果全局匹配未找到物品）
  if (items.length === 0) {
    const lines = cleanText.split(/[\n,，;；]/);
    for (const line of lines) {
      const lineMatch = line.match(new RegExp(
        `(${ppeKeywords.join('|')})\\s*[xX*×:]?\\s*(\\d+)\\s*(个|件|套|双|副|条|顶|只)?`,
        'i'
      ));
      
      if (lineMatch) {
        const name = lineMatch[1].trim();
        const quantity = parseInt(lineMatch[2], 10);
        const unit = lineMatch[3] || '个';
        const key = `${name}-${quantity}`;
        
        if (!matchedItems.has(key)) {
          matchedItems.add(key);
          items.push({ name, quantity, unit });
        }
      }
    }
  }
  
  // 提取收货人/领用人
  const recipientPatterns = [
    /(?:收货人|领用人|领料人|申请人|员工|姓名)[：:]\s*(\S+)/,
    /(?:收货|领取|申请)[：:]?\s*(\S{2,4})/,
    /(\S{2,4})\s*(?:领取|收货|申请)/
  ];
  
  let recipient = null;
  for (const pattern of recipientPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      recipient = match[1].trim();
      break;
    }
  }
  
  // 提取日期
  const datePatterns = [
    /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/,
    /(\d{4}\d{2}\d{2})/,
    /(\d{2}[-/]\d{2}[-/]\d{4})/
  ];
  
  let date = null;
  for (const pattern of datePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      date = match[1].replace(/[年月]/g, '-').replace(/日/g, '');
      break;
    }
  }
  
  // 提取订单号
  const orderPatterns = [
    /(?:订单号|单号|编号|No)[：:.#]?\s*([A-Z0-9\-]+)/i,
    /(?:订单|单号)[：:]?\s*(\S+)/
  ];
  
  let orderNumber = null;
  for (const pattern of orderPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      orderNumber = match[1].trim();
      break;
    }
  }
  
  // 计算置信度（基于提取到的信息完整度）
  let confidence = 0;
  if (items.length > 0) confidence += 40;
  if (recipient) confidence += 20;
  if (date) confidence += 20;
  if (orderNumber) confidence += 20;
  
  return {
    items,
    recipient,
    date,
    orderNumber,
    confidence,
    rawText: cleanText
  };
}

/**
 * 主函数：识别送货单
 * Main function: Recognize delivery order
 * 
 * @param {string} imageBase64 - Base64编码的送货单图片
 * @param {Object} options - 可选配置
 * @returns {Promise<Object>} 送货单识别结果
 * 
 * @example
 * const result = await recognizeDeliveryOrder(base64Image);
 * if (result.success) {
 *   console.log('PPE物品:', result.data.items);
 *   console.log('收货人:', result.data.recipient);
 * }
 */
async function recognizeDeliveryOrder(imageBase64, options = {}) {
  // 设置送货单识别的默认配置
  const deliveryOptions = {
    language: 'cn',      // 送货单通常是中文
    location: true,
    probability: true,
    ...options
  };
  
  // 调用OCR识别
  const ocrResult = await recognizeText(imageBase64, deliveryOptions);
  
  if (!ocrResult.success) {
    return ocrResult;
  }
  
  // 提取PPE信息
  const ppeInfo = extractPPEInfo(ocrResult.data);
  
  // 合并结果
  return createResponse(true, {
    ...ppeInfo,
    ocrDetails: ocrResult.data
  }, '送货单识别成功');
}

/**
 * 批量识别多张图片
 * Batch recognize multiple images
 * 
 * @param {Array<string>} imagesBase64 - Base64图片数组
 * @param {Object} options - 可选配置
 * @returns {Promise<Array<Object>>} 批量识别结果
 */
async function batchRecognize(imagesBase64, options = {}) {
  if (!Array.isArray(imagesBase64) || imagesBase64.length === 0) {
    return [createResponse(false, null, '图片数组不能为空')];
  }
  
  const results = [];
  for (let i = 0; i < imagesBase64.length; i++) {
    try {
      const result = await recognizeDeliveryOrder(imagesBase64[i], options);
      results.push({
        index: i,
        ...result
      });
    } catch (error) {
      results.push({
        index: i,
        success: false,
        data: null,
        message: `处理第${i + 1}张图片时出错: ${error.message}`
      });
    }
  }
  
  return results;
}

module.exports = {
  // 主要功能函数
  recognizeText,
  extractPPEInfo,
  recognizeDeliveryOrder,
  batchRecognize,
  
  // 工具函数
  createResponse,
  validateConfig,
  delay
};
