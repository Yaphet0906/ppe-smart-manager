/**
 * 讯飞语音听写模块
 * Xunfei Speech Recognition Module
 * 
 * 功能：集成讯飞语音听写API，实现语音转文字
 * Features: Integrate Xunfei Speech-to-Text API for voice recognition
 */

const WebSocket = require('ws');
const { generateWebSocketUrl, base64Encode, getRfc1123Date } = require('./xunfei_auth');

// 默认配置
const DEFAULT_CONFIG = {
  // 讯飞API配置（从环境变量读取）
  appId: process.env.XUNFEI_APP_ID || '',
  apiKey: process.env.XUNFEI_API_KEY || '',
  apiSecret: process.env.XUNFEI_API_SECRET || '',
  
  // WebSocket API地址
  speechUrl: process.env.XUNFEI_SPEECH_URL || 'wss://ws-api.xfyun.cn/v2/iat',
  
  // 请求配置
  timeout: 60000,        // 超时时间60秒
  maxRetries: 3,         // 最大重试次数
  retryDelay: 1000,      // 重试间隔1秒
  
  // 语音识别配置
  language: 'zh_cn',     // 语言：zh_cn中文, en_us英文
  domain: 'iat',         // 应用领域：iat日常用语, medical医疗, law法律
  accent: 'mandarin',    // 方言：mandarin普通话, cantonese粤语
  engineType: 'sms16k',  // 引擎类型：sms16k(16k采样率), sms8k(8k采样率)
  
  // 音频配置
  sampleRate: 16000,     // 采样率
  channel: 1,            // 声道数
  format: 'audio/L16;rate=16000'  // 音频格式
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
 * 将音频文件转换为Base64
 * Convert audio file to Base64
 * @param {string|Buffer} audioData - 音频数据（文件路径或Buffer）
 * @returns {Promise<string>} Base64编码的音频数据
 */
async function audioToBase64(audioData) {
  const fs = require('fs').promises;
  
  let buffer;
  if (Buffer.isBuffer(audioData)) {
    buffer = audioData;
  } else if (typeof audioData === 'string') {
    // 如果已经是Base64，直接返回
    if (audioData.startsWith('data:audio') || /^[A-Za-z0-9+/=]+$/.test(audioData)) {
      return audioData;
    }
    // 读取文件
    buffer = await fs.readFile(audioData);
  } else {
    throw new Error('音频数据必须是Buffer或文件路径');
  }
  
  return buffer.toString('base64');
}

/**
 * 检测音频格式
 * Detect audio format from data
 * @param {Buffer} buffer - 音频Buffer
 * @returns {string} 音频格式
 */
function detectAudioFormat(buffer) {
  // 检测文件头
  if (buffer.length < 4) return 'unknown';
  
  // WAV文件头: RIFF....WAVE
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && 
      buffer.toString('ascii', 8, 12) === 'WAVE') {
    return 'wav';
  }
  
  // MP3文件头
  if (buffer[0] === 0xFF && (buffer[1] === 0xFB || buffer[1] === 0xF3 || buffer[1] === 0xF2)) {
    return 'mp3';
  }
  
  // PCM (无文件头，需要用户指定)
  return 'pcm';
}

/**
 * 构建WebSocket帧数据
 * Build WebSocket frame data
 * @param {Object} config - 配置对象
 * @param {string} audioBase64 - Base64音频数据
 * @param {number} status - 状态：0=第一帧, 1=中间帧, 2=最后一帧
 * @returns {Object} 帧数据对象
 */
function buildFrame(config, audioBase64, status) {
  const frame = {
    common: {
      app_id: config.appId
    },
    business: {
      language: config.language,
      domain: config.domain,
      accent: config.accent,
      dwa: 'wpgs',  // 开启动态修正
      // 可选参数
      // ptt: 0,    // 标点符号：0无标点, 1有标点
      // nunum: 0   // 数字转换：0不转换, 1转换为阿拉伯数字
    },
    data: {
      status: status,
      format: config.format,
      encoding: 'raw',
      audio: audioBase64
    }
  };
  
  return frame;
}

/**
 * 语音听写（WebSocket方式）
 * Speech-to-Text via WebSocket
 * 
 * @param {string} audioBase64 - Base64编码的音频数据
 * @param {Object} options - 可选配置
 * @param {string} options.language - 识别语言
 * @param {string} options.domain - 应用领域
 * @param {number} options.timeout - 超时时间
 * @param {number} options.maxRetries - 最大重试次数
 * @returns {Promise<Object>} 识别结果 { success, data, message }
 * 
 * @example
 * const result = await speechToText(base64Audio, { language: 'zh_cn' });
 */
async function speechToText(audioBase64, options = {}) {
  // 合并配置
  const config = { ...DEFAULT_CONFIG, ...options };
  
  // 验证配置
  const validation = validateConfig(config);
  if (!validation.valid) {
    return createResponse(false, null, validation.message);
  }
  
  // 验证音频数据
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return createResponse(false, null, '音频数据不能为空');
  }
  
  // 清理Base64前缀（如果有）
  let cleanBase64 = audioBase64;
  if (audioBase64.includes(',')) {
    cleanBase64 = audioBase64.split(',')[1];
  }
  
  // 验证音频大小（讯飞限制：单次不超过60秒）
  const audioSize = Buffer.byteLength(cleanBase64, 'base64');
  if (audioSize > 2 * 1024 * 1024) {  // 约60秒16kHz音频
    console.warn('音频较大，可能会被截断处理');
  }
  
  // 重试机制
  let lastError = null;
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      const result = await performWebSocketRecognition(config, cleanBase64);
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt < config.maxRetries - 1) {
        console.log(`语音识别失败，${config.retryDelay}ms后重试 (${attempt + 1}/${config.maxRetries})...`);
        await delay(config.retryDelay * (attempt + 1));
        continue;
      }
      
      break;
    }
  }
  
  return createResponse(false, null, `语音识别失败: ${lastError?.message || '未知错误'}`);
}

/**
 * 执行WebSocket语音识别
 * Perform WebSocket speech recognition
 * @param {Object} config - 配置对象
 * @param {string} audioBase64 - Base64音频数据
 * @returns {Promise<Object>} 识别结果
 */
function performWebSocketRecognition(config, audioBase64) {
  return new Promise((resolve, reject) => {
    // 生成WebSocket URL
    const wsUrl = generateWebSocketUrl({
      appId: config.appId,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      baseUrl: config.speechUrl
    });
    
    // 创建WebSocket连接
    const ws = new WebSocket(wsUrl);
    
    let resultText = '';
    let isCompleted = false;
    let timeoutId = null;
    
    // 设置超时
    timeoutId = setTimeout(() => {
      if (!isCompleted) {
        ws.terminate();
        reject(new Error('语音识别超时'));
      }
    }, config.timeout);
    
    // 连接建立
    ws.on('open', () => {
      // 发送第一帧（包含业务参数和音频数据）
      const firstFrame = buildFrame(config, audioBase64, 2);  // 一次性发送
      ws.send(JSON.stringify(firstFrame));
    });
    
    // 接收消息
    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        
        // 检查错误
        if (response.code !== 0) {
          clearTimeout(timeoutId);
          ws.close();
          reject(new Error(`讯飞API错误: ${response.message} (code: ${response.code})`));
          return;
        }
        
        // 解析识别结果
        if (response.data && response.data.result) {
          const result = response.data.result;
          
          // 处理识别结果
          if (result.ws) {
            // 词级结果
            for (const wsItem of result.ws) {
              if (wsItem.cw) {
                for (const cw of wsItem.cw) {
                  resultText += cw.w || '';
                }
              }
            }
          }
        }
        
        // 检查是否完成
        if (response.data && response.data.status === 2) {
          isCompleted = true;
          clearTimeout(timeoutId);
          ws.close();
          
          resolve(createResponse(true, {
            text: resultText.trim(),
            confidence: response.data.result?.sc || 0,  // 置信度
            raw: response
          }, '识别成功'));
        }
        
      } catch (error) {
        clearTimeout(timeoutId);
        ws.close();
        reject(new Error(`解析响应失败: ${error.message}`));
      }
    });
    
    // 连接错误
    ws.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(new Error(`WebSocket错误: ${error.message}`));
    });
    
    // 连接关闭
    ws.on('close', (code, reason) => {
      if (!isCompleted) {
        clearTimeout(timeoutId);
        reject(new Error(`连接意外关闭: ${code} ${reason}`));
      }
    });
  });
}

/**
 * 从识别结果中提取领取信息
 * Extract pickup information from recognized text
 * 
 * @param {string|Object} recognizedText - 识别的文字或识别结果对象
 * @returns {Object} 提取的领取信息
 * 
 * @example
 * const pickupInfo = extractPickupInfo('领取安全帽两个，员工张三');
 * // Returns: { items: [{name: '安全帽', quantity: 2}], employee: '张三', action: '领取' }
 */
function extractPickupInfo(recognizedText) {
  // 如果传入的是对象，提取text字段
  let text = recognizedText;
  if (typeof recognizedText === 'object' && recognizedText !== null) {
    text = recognizedText.text || recognizedText.data?.text || JSON.stringify(recognizedText);
  }
  
  if (!text || typeof text !== 'string') {
    return {
      items: [],
      employee: null,
      action: null,
      department: null,
      date: null,
      confidence: 0
    };
  }
  
  // 清理文本
  const cleanText = text.replace(/\s+/g, '').trim();
  
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
  
  // 提取PPE物品和数量
  const items = [];
  const matchedRanges = []; // 记录已匹配的位置范围，避免重叠匹配
  
  // 方法1: 全局匹配所有物品（支持中文数字和阿拉伯数字）
  // 支持格式：安全帽两个 / 安全帽2个 / 安全帽两顶 / 两顶安全帽
  const chineseNums = '一二三四五六七八九十百千万亿两';
  const units = '个件套双副条顶只';
  
  // 按关键词长度排序（长的优先），避免"防护手套"被拆分为"手套"
  const sortedKeywords = [...ppeKeywords].sort((a, b) => b.length - a.length);
  
  for (const keyword of sortedKeywords) {
    // 模式1: 物品+数量+可选单位 (安全帽两个/安全帽2/安全帽2个)
    const pattern1 = new RegExp(`${keyword}([${chineseNums}\\d]+)([${units}])?`, 'g');
    // 模式2: 数量+可选单位+物品 (两个安全帽/2个安全帽/2安全帽)
    const pattern2 = new RegExp(`([${chineseNums}\\d]+)([${units}])?${keyword}`, 'g');
    
    // 使用全局匹配查找所有匹配项
    let match;
    while ((match = pattern1.exec(cleanText)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;
      
      // 检查是否与已匹配范围重叠
      const isOverlapping = matchedRanges.some(range => 
        (matchStart < range.end && matchEnd > range.start)
      );
      
      if (!isOverlapping) {
        const quantityStr = match[1];
        const unit = match[2] || '个';
        const quantity = chineseToNumber(quantityStr) || parseInt(quantityStr, 10) || 1;
        
        matchedRanges.push({ start: matchStart, end: matchEnd });
        items.push({ name: keyword, quantity, unit });
      }
    }
    
    while ((match = pattern2.exec(cleanText)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;
      
      // 检查是否与已匹配范围重叠
      const isOverlapping = matchedRanges.some(range => 
        (matchStart < range.end && matchEnd > range.start)
      );
      
      if (!isOverlapping) {
        const quantityStr = match[1];
        const unit = match[2] || '个';
        const quantity = chineseToNumber(quantityStr) || parseInt(quantityStr, 10) || 1;
        
        matchedRanges.push({ start: matchStart, end: matchEnd });
        items.push({ name: keyword, quantity, unit });
      }
    }
  }
  
  // 方法2: 通用匹配模式（如果上述方法未找到）
  if (items.length === 0) {
    const genericPattern = new RegExp(`(${sortedKeywords.join('|')})([${chineseNums}\\d]+)`, 'g');
    let match;
    while ((match = genericPattern.exec(cleanText)) !== null) {
      const name = match[1];
      const quantityStr = match[2];
      const quantity = chineseToNumber(quantityStr) || parseInt(quantityStr, 10) || 1;
      const key = `${name}-${quantity}`;
      
      if (!matchedItems.has(key)) {
        matchedItems.add(key);
        items.push({ name, quantity, unit: '个' });
      }
    }
  }
  
  // 提取员工姓名
  const employeePatterns = [
    /(?:员工|姓名|领用人|申请人|我是|我叫)([\u4e00-\u9fa5]{2,4})/,
    /([\u4e00-\u9fa5]{2,4})(?:来领|来取|申请|需要)/
  ];
  
  let employee = null;
  for (const pattern of employeePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      employee = match[1];
      break;
    }
  }
  
  // 提取操作类型
  let action = null;
  if (/领取|领用|来领|来取|申请|需要|要/.test(cleanText)) {
    action = '领取';
  } else if (/归还|退还|交还|退回/.test(cleanText)) {
    action = '归还';
  } else if (/报废|损坏|更换/.test(cleanText)) {
    action = '报废/更换';
  }
  
  // 提取部门
  const departmentPatterns = [
    /(?:部门|车间|班组|科室)([\u4e00-\u9fa5]+?)(?:的|要|需要|申请)/,
    /([\u4e00-\u9fa5]+?)(?:部门|车间|班组|科室)/
  ];
  
  let department = null;
  for (const pattern of departmentPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      department = match[1];
      break;
    }
  }
  
  // 计算置信度
  let confidence = 0;
  if (items.length > 0) confidence += 40;
  if (employee) confidence += 30;
  if (action) confidence += 20;
  if (department) confidence += 10;
  
  return {
    items,
    employee,
    action,
    department,
    date: new Date().toISOString(),
    confidence,
    rawText: text
  };
}

/**
 * 中文数字转阿拉伯数字
 * Convert Chinese number to Arabic number
 * @param {string} chinese - 中文数字
 * @returns {number|null} 阿拉伯数字
 */
function chineseToNumber(chinese) {
  const chineseNums = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
    '十': 10, '百': 100, '千': 1000, '万': 10000, '亿': 100000000
  };
  
  if (!chinese || typeof chinese !== 'string') return null;
  
  // 纯数字直接返回
  if (/^\d+$/.test(chinese)) {
    return parseInt(chinese, 10);
  }
  
  // 简单中文数字
  if (chinese.length === 1 && chineseNums[chinese] !== undefined) {
    return chineseNums[chinese];
  }
  
  // 复杂中文数字（简化处理）
  let result = 0;
  let temp = 0;
  
  for (let i = 0; i < chinese.length; i++) {
    const char = chinese[i];
    const num = chineseNums[char];
    
    if (num === undefined) continue;
    
    if (num >= 10) {
      if (temp === 0) temp = 1;
      result += temp * num;
      temp = 0;
    } else {
      temp = temp * 10 + num;
    }
  }
  
  return result + temp;
}

/**
 * 主函数：识别领取语音
 * Main function: Recognize pickup voice
 * 
 * @param {string} audioBase64 - Base64编码的语音数据
 * @param {Object} options - 可选配置
 * @returns {Promise<Object>} 语音识别结果
 * 
 * @example
 * const result = await recognizePickupVoice(base64Audio);
 * if (result.success) {
 *   console.log('员工:', result.data.employee);
 *   console.log('领取物品:', result.data.items);
 * }
 */
async function recognizePickupVoice(audioBase64, options = {}) {
  // 设置语音领取的默认配置
  const pickupOptions = {
    language: 'zh_cn',   // 中文识别
    domain: 'iat',       // 日常用语
    accent: 'mandarin',  // 普通话
    ...options
  };
  
  // 调用语音识别
  const speechResult = await speechToText(audioBase64, pickupOptions);
  
  if (!speechResult.success) {
    return speechResult;
  }
  
  // 提取领取信息
  const pickupInfo = extractPickupInfo(speechResult.data);
  
  // 合并结果
  return createResponse(true, {
    ...pickupInfo,
    speechDetails: speechResult.data
  }, '语音领取识别成功');
}

/**
 * 流式语音识别（支持长音频）
 * Streaming speech recognition for long audio
 * 
 * @param {string} audioBase64 - Base64编码的音频数据
 * @param {Object} options - 可选配置
 * @returns {Promise<Object>} 识别结果
 */
async function streamingSpeechToText(audioBase64, options = {}) {
  // 合并配置
  const config = { ...DEFAULT_CONFIG, ...options };
  
  // 验证配置
  const validation = validateConfig(config);
  if (!validation.valid) {
    return createResponse(false, null, validation.message);
  }
  
  // 清理Base64
  let cleanBase64 = audioBase64;
  if (audioBase64.includes(',')) {
    cleanBase64 = audioBase64.split(',')[1];
  }
  
  // 将音频分片（每片约200ms）
  const audioBuffer = Buffer.from(cleanBase64, 'base64');
  const frameSize = Math.floor(config.sampleRate * 0.2 * 2);  // 200ms, 16bit
  const frames = [];
  
  for (let i = 0; i < audioBuffer.length; i += frameSize) {
    frames.push(audioBuffer.slice(i, i + frameSize));
  }
  
  return new Promise((resolve, reject) => {
    const wsUrl = generateWebSocketUrl({
      appId: config.appId,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      baseUrl: config.speechUrl
    });
    
    const ws = new WebSocket(wsUrl);
    let frameIndex = 0;
    let resultText = '';
    let isCompleted = false;
    
    const timeoutId = setTimeout(() => {
      if (!isCompleted) {
        ws.terminate();
        reject(new Error('流式识别超时'));
      }
    }, config.timeout);
    
    ws.on('open', () => {
      // 发送第一帧
      sendNextFrame();
    });
    
    function sendNextFrame() {
      if (frameIndex >= frames.length) {
        // 所有帧发送完成
        return;
      }
      
      const frame = frames[frameIndex];
      const isFirst = frameIndex === 0;
      const isLast = frameIndex === frames.length - 1;
      const status = isFirst ? 0 : (isLast ? 2 : 1);
      
      const frameData = buildFrame(config, frame.toString('base64'), status);
      ws.send(JSON.stringify(frameData));
      
      frameIndex++;
      
      // 控制发送速率
      if (!isLast) {
        setTimeout(sendNextFrame, 200);
      }
    }
    
    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        
        if (response.code !== 0) {
          clearTimeout(timeoutId);
          ws.close();
          reject(new Error(`讯飞API错误: ${response.message}`));
          return;
        }
        
        if (response.data && response.data.result) {
          const result = response.data.result;
          if (result.ws) {
            for (const wsItem of result.ws) {
              if (wsItem.cw) {
                for (const cw of wsItem.cw) {
                  resultText += cw.w || '';
                }
              }
            }
          }
        }
        
        if (response.data && response.data.status === 2) {
          isCompleted = true;
          clearTimeout(timeoutId);
          ws.close();
          
          resolve(createResponse(true, {
            text: resultText.trim(),
            raw: response
          }, '流式识别成功'));
        }
        
      } catch (error) {
        clearTimeout(timeoutId);
        ws.close();
        reject(error);
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
    
    ws.on('close', () => {
      if (!isCompleted) {
        clearTimeout(timeoutId);
        reject(new Error('连接意外关闭'));
      }
    });
  });
}

module.exports = {
  // 主要功能函数
  speechToText,
  extractPickupInfo,
  recognizePickupVoice,
  streamingSpeechToText,
  
  // 工具函数
  audioToBase64,
  detectAudioFormat,
  chineseToNumber,
  createResponse,
  validateConfig,
  delay
};
