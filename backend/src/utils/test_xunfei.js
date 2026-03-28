/**
 * 讯飞AI API 测试模块
 * Xunfei AI API Test Module
 * 
 * 功能：测试讯飞OCR和语音API的各项功能
 * Features: Test Xunfei OCR and Speech API functionalities
 */

const fs = require('fs');
const path = require('path');

// 导入讯飞模块
const xunfeiAuth = require('./xunfei_auth');
const xunfeiOcr = require('./xunfei_ocr');
const xunfeiSpeech = require('./xunfei_speech');

// 测试配置
const TEST_CONFIG = {
  // 测试用的模拟API密钥（仅用于测试签名算法）
  mockAppId: 'test_app_id_12345',
  mockApiKey: 'test_api_key_67890',
  mockApiSecret: 'test_api_secret_abcdef',
  
  // 测试图片路径（如果有）
  testImagePath: null,
  
  // 测试音频路径（如果有）
  testAudioPath: null
};

/**
 * 测试工具函数
 * Test utility functions
 */
class TestRunner {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }
  
  /**
   * 运行单个测试
   * Run a single test
   */
  async test(name, testFn) {
    try {
      console.log(`\n📝 测试: ${name}`);
      await testFn();
      console.log(`✅ 通过: ${name}`);
      this.passed++;
      this.results.push({ name, status: 'passed' });
    } catch (error) {
      console.log(`❌ 失败: ${name}`);
      console.log(`   错误: ${error.message}`);
      this.failed++;
      this.results.push({ name, status: 'failed', error: error.message });
    }
  }
  
  /**
   * 打印测试报告
   * Print test report
   */
  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试报告');
    console.log('='.repeat(60));
    console.log(`总测试数: ${this.passed + this.failed}`);
    console.log(`✅ 通过: ${this.passed}`);
    console.log(`❌ 失败: ${this.failed}`);
    console.log('='.repeat(60));
    
    if (this.failed > 0) {
      console.log('\n失败的测试:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }
  }
}

/**
 * 测试讯飞认证模块
 * Test Xunfei authentication module
 */
async function testAuthModule(runner) {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 测试讯飞认证模块');
  console.log('='.repeat(60));
  
  // 测试 RFC1123 时间戳生成
  await runner.test('RFC1123时间戳生成', () => {
    const date = xunfeiAuth.getRfc1123Date();
    if (!date || typeof date !== 'string') {
      throw new Error('时间戳生成失败');
    }
    // 验证格式：应该包含星期、日期、时间、GMT
    if (!/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(date)) {
      throw new Error(`时间戳格式不正确: ${date}`);
    }
    console.log(`   生成的时间戳: ${date}`);
  });
  
  // 测试 Base64 编码
  await runner.test('Base64编码', () => {
    const testString = 'Hello, 讯飞AI!';
    const encoded = xunfeiAuth.base64Encode(testString);
    const decoded = xunfeiAuth.base64Decode(encoded);
    
    if (decoded !== testString) {
      throw new Error('Base64编解码失败');
    }
    console.log(`   原文: ${testString}`);
    console.log(`   编码: ${encoded}`);
    console.log(`   解码: ${decoded}`);
  });
  
  // 测试 HMAC-SHA256 签名
  await runner.test('HMAC-SHA256签名', () => {
    const message = 'test message';
    const secret = 'test secret';
    const signature = xunfeiAuth.hmacSha256(message, secret);
    
    if (!signature || typeof signature !== 'string') {
      throw new Error('签名生成失败');
    }
    console.log(`   消息: ${message}`);
    console.log(`   密钥: ${secret}`);
    console.log(`   签名: ${signature}`);
  });
  
  // 测试 HTTP 签名生成
  await runner.test('HTTP签名生成', () => {
    const authorization = xunfeiAuth.generateHttpSignature(
      TEST_CONFIG.mockApiKey,
      TEST_CONFIG.mockApiSecret,
      'api.xfyun.cn',
      'Mon, 01 Jan 2024 00:00:00 GMT',
      'POST /v2/ocr HTTP/1.1'
    );
    
    if (!authorization || !authorization.includes('api_key=')) {
      throw new Error('Authorization头生成失败');
    }
    console.log(`   Authorization: ${authorization.substring(0, 80)}...`);
  });
  
  // 测试 WebSocket 签名生成
  await runner.test('WebSocket签名生成', () => {
    const result = xunfeiAuth.generateWebSocketSignature(
      TEST_CONFIG.mockApiKey,
      TEST_CONFIG.mockApiSecret
    );
    
    if (!result.date || !result.authorization) {
      throw new Error('WebSocket签名生成失败');
    }
    console.log(`   Date: ${result.date}`);
    console.log(`   Authorization (Base64): ${result.authorization.substring(0, 50)}...`);
  });
  
  // 测试请求头生成
  await runner.test('请求头生成', () => {
    const headers = xunfeiAuth.generateRequestHeaders({
      appId: TEST_CONFIG.mockAppId,
      apiKey: TEST_CONFIG.mockApiKey,
      apiSecret: TEST_CONFIG.mockApiSecret,
      host: 'api.xfyun.cn',
      requestLine: 'POST /v2/ocr HTTP/1.1'
    });
    
    if (!headers['Content-Type'] || !headers['Authorization'] || !headers['X-Appid']) {
      throw new Error('请求头生成不完整');
    }
    console.log(`   Content-Type: ${headers['Content-Type']}`);
    console.log(`   X-Appid: ${headers['X-Appid']}`);
    console.log(`   Authorization: ${headers['Authorization'].substring(0, 50)}...`);
  });
  
  // 测试 WebSocket URL 生成
  await runner.test('WebSocket URL生成', () => {
    const url = xunfeiAuth.generateWebSocketUrl({
      appId: TEST_CONFIG.mockAppId,
      apiKey: TEST_CONFIG.mockApiKey,
      apiSecret: TEST_CONFIG.mockApiSecret,
      baseUrl: 'wss://ws-api.xfyun.cn/v2/iat'
    });
    
    if (!url || !url.startsWith('wss://')) {
      throw new Error('WebSocket URL生成失败');
    }
    console.log(`   URL: ${url.substring(0, 100)}...`);
  });
  
  // 测试参数排序编码
  await runner.test('参数排序编码', () => {
    const params = { z: '1', a: '2', m: '3' };
    const encoded = xunfeiAuth.sortAndEncodeParams(params);
    
    if (!encoded.includes('a=') || !encoded.includes('m=') || !encoded.includes('z=')) {
      throw new Error('参数排序编码失败');
    }
    console.log(`   原始参数: ${JSON.stringify(params)}`);
    console.log(`   排序编码: ${encoded}`);
  });
  
  // 测试 MD5 哈希
  await runner.test('MD5哈希', () => {
    const hash = xunfeiAuth.md5Hash('test');
    if (hash !== '098f6bcd4621d373cade4e832627b4f6') {
      throw new Error('MD5哈希结果不正确');
    }
    console.log(`   MD5("test"): ${hash}`);
  });
  
  // 测试 SHA256 哈希
  await runner.test('SHA256哈希', () => {
    const hash = xunfeiAuth.sha256Hash('test');
    if (hash.length !== 64) {
      throw new Error('SHA256哈希结果长度不正确');
    }
    console.log(`   SHA256("test"): ${hash.substring(0, 32)}...`);
  });
  
  // 测试随机字符串生成
  await runner.test('随机字符串生成', () => {
    const nonce1 = xunfeiAuth.generateNonce(16);
    const nonce2 = xunfeiAuth.generateNonce(16);
    
    if (nonce1.length !== 16 || nonce2.length !== 16) {
      throw new Error('随机字符串长度不正确');
    }
    if (nonce1 === nonce2) {
      throw new Error('随机字符串重复');
    }
    console.log(`   Nonce 1: ${nonce1}`);
    console.log(`   Nonce 2: ${nonce2}`);
  });
}

/**
 * 测试OCR模块
 * Test OCR module
 */
async function testOcrModule(runner) {
  console.log('\n' + '='.repeat(60));
  console.log('📷 测试OCR模块');
  console.log('='.repeat(60));
  
  // 测试配置验证
  await runner.test('OCR配置验证', () => {
    const validConfig = xunfeiOcr.validateConfig({
      appId: 'test',
      apiKey: 'test',
      apiSecret: 'test'
    });
    
    if (!validConfig.valid) {
      throw new Error('有效配置验证失败');
    }
    
    const invalidConfig = xunfeiOcr.validateConfig({
      appId: '',
      apiKey: '',
      apiSecret: ''
    });
    
    if (invalidConfig.valid) {
      throw new Error('无效配置应该验证失败');
    }
    console.log(`   有效配置: ${JSON.stringify(validConfig)}`);
    console.log(`   无效配置: ${JSON.stringify(invalidConfig)}`);
  });
  
  // 测试 PPE 信息提取
  await runner.test('PPE信息提取', () => {
    const testCases = [
      {
        text: '送货单 安全帽10个 防护手套5双 收货人张三 2024-01-15',
        expected: { itemsCount: 2, hasRecipient: true, hasDate: true }
      },
      {
        text: '安全鞋3双 工作服2套 李四',
        expected: { itemsCount: 2, hasRecipient: true, hasDate: false }
      },
      {
        text: '订单号SO2024001 护目镜20个 防尘口罩50个',
        expected: { itemsCount: 2, hasRecipient: false, hasOrderNumber: true }
      }
    ];
    
    for (const testCase of testCases) {
      const result = xunfeiOcr.extractPPEInfo(testCase.text);
      console.log(`   输入: ${testCase.text}`);
      console.log(`   提取结果: ${JSON.stringify(result, null, 2)}`);
    }
  });
  
  // 测试响应格式创建
  await runner.test('响应格式创建', () => {
    const successResponse = xunfeiOcr.createResponse(true, { text: 'test' }, '成功');
    const failResponse = xunfeiOcr.createResponse(false, null, '失败');
    
    if (!successResponse.success || successResponse.data.text !== 'test') {
      throw new Error('成功响应格式不正确');
    }
    if (failResponse.success || failResponse.message !== '失败') {
      throw new Error('失败响应格式不正确');
    }
    console.log(`   成功响应: ${JSON.stringify(successResponse)}`);
    console.log(`   失败响应: ${JSON.stringify(failResponse)}`);
  });
  
  // 测试延迟函数
  await runner.test('延迟函数', async () => {
    const start = Date.now();
    await xunfeiOcr.delay(100);
    const elapsed = Date.now() - start;
    
    if (elapsed < 90 || elapsed > 150) {
      throw new Error(`延迟时间不正确: ${elapsed}ms`);
    }
    console.log(`   延迟: ${elapsed}ms`);
  });
}

/**
 * 测试语音模块
 * Test Speech module
 */
async function testSpeechModule(runner) {
  console.log('\n' + '='.repeat(60));
  console.log('🎤 测试语音模块');
  console.log('='.repeat(60));
  
  // 测试配置验证
  await runner.test('语音配置验证', () => {
    const validConfig = xunfeiSpeech.validateConfig({
      appId: 'test',
      apiKey: 'test',
      apiSecret: 'test'
    });
    
    if (!validConfig.valid) {
      throw new Error('有效配置验证失败');
    }
    console.log(`   验证结果: ${JSON.stringify(validConfig)}`);
  });
  
  // 测试中文数字转换
  await runner.test('中文数字转换', () => {
    const testCases = [
      { input: '一', expected: 1 },
      { input: '十', expected: 10 },
      { input: '十五', expected: 15 },
      { input: '二十', expected: 20 },
      { input: '一百二十三', expected: 123 },
      { input: '2', expected: 2 },
      { input: '两', expected: 2 }
    ];
    
    for (const testCase of testCases) {
      const result = xunfeiSpeech.chineseToNumber(testCase.input);
      console.log(`   "${testCase.input}" => ${result} (期望: ${testCase.expected})`);
      if (result !== testCase.expected) {
        throw new Error(`转换失败: ${testCase.input} => ${result}, 期望 ${testCase.expected}`);
      }
    }
  });
  
  // 测试领取信息提取
  await runner.test('领取信息提取', () => {
    const testCases = [
      {
        text: '我是张三，领取安全帽两个，防护手套一双',
        expected: { hasEmployee: true, hasItems: true, action: '领取' }
      },
      {
        text: '李四申请工作服三套，安全鞋两双',
        expected: { hasEmployee: true, hasItems: true, action: '领取' }
      },
      {
        text: '王五归还安全帽一个',
        expected: { hasEmployee: true, hasItems: true, action: '归还' }
      }
    ];
    
    for (const testCase of testCases) {
      const result = xunfeiSpeech.extractPickupInfo(testCase.text);
      console.log(`   输入: ${testCase.text}`);
      console.log(`   提取结果: ${JSON.stringify(result, null, 2)}`);
    }
  });
  
  // 测试音频格式检测
  await runner.test('音频格式检测', () => {
    // WAV文件头
    const wavHeader = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
    // MP3文件头
    const mp3Header = Buffer.from([0xFF, 0xFB, 0x00, 0x00]);
    
    const wavFormat = xunfeiSpeech.detectAudioFormat(wavHeader);
    const mp3Format = xunfeiSpeech.detectAudioFormat(mp3Header);
    
    if (wavFormat !== 'wav') {
      throw new Error(`WAV格式检测失败: ${wavFormat}`);
    }
    if (mp3Format !== 'mp3') {
      throw new Error(`MP3格式检测失败: ${mp3Format}`);
    }
    console.log(`   WAV格式: ${wavFormat}`);
    console.log(`   MP3格式: ${mp3Format}`);
  });
}

/**
 * 测试模拟数据
 * Test with mock data
 */
async function testMockData(runner) {
  console.log('\n' + '='.repeat(60));
  console.log('📦 测试模拟数据');
  console.log('='.repeat(60));
  
  // 模拟送货单OCR结果
  await runner.test('模拟送货单OCR处理', () => {
    const mockOcrResult = {
      text: '送货单\n订单号: SO2024001\n安全帽 20个\n防护手套 10双\n安全鞋 5双\n收货人: 张三\n日期: 2024-01-15',
      lines: [
        { text: '安全帽 20个' },
        { text: '防护手套 10双' },
        { text: '安全鞋 5双' }
      ]
    };
    
    const ppeInfo = xunfeiOcr.extractPPEInfo(mockOcrResult);
    
    if (ppeInfo.items.length !== 3) {
      throw new Error(`应提取3个物品，实际提取${ppeInfo.items.length}个`);
    }
    if (ppeInfo.recipient !== '张三') {
      throw new Error(`收货人应为张三，实际为${ppeInfo.recipient}`);
    }
    
    console.log(`   OCR文本: ${mockOcrResult.text.substring(0, 50)}...`);
    console.log(`   提取物品: ${JSON.stringify(ppeInfo.items)}`);
    console.log(`   收货人: ${ppeInfo.recipient}`);
    console.log(`   日期: ${ppeInfo.date}`);
    console.log(`   订单号: ${ppeInfo.orderNumber}`);
    console.log(`   置信度: ${ppeInfo.confidence}%`);
  });
  
  // 模拟语音领取结果
  await runner.test('模拟语音领取处理', () => {
    const mockSpeechResult = {
      text: '我是李四，需要领取安全帽三个，防护手套两双',
      confidence: 95
    };
    
    const pickupInfo = xunfeiSpeech.extractPickupInfo(mockSpeechResult);
    
    if (pickupInfo.items.length !== 2) {
      throw new Error(`应提取2个物品，实际提取${pickupInfo.items.length}个`);
    }
    if (pickupInfo.employee !== '李四') {
      throw new Error(`员工应为李四，实际为${pickupInfo.employee}`);
    }
    
    console.log(`   语音文本: ${mockSpeechResult.text}`);
    console.log(`   提取物品: ${JSON.stringify(pickupInfo.items)}`);
    console.log(`   员工: ${pickupInfo.employee}`);
    console.log(`   操作: ${pickupInfo.action}`);
    console.log(`   置信度: ${pickupInfo.confidence}%`);
  });
  
  // 模拟复杂场景
  await runner.test('模拟复杂场景处理', () => {
    const complexTexts = [
      {
        type: 'OCR',
        text: 'PPE物资出库单 单号: CK20240115001 安全帽(黄色) 30顶 安全帽(红色) 20顶 反光背心 50件 收货部门: 施工一部 收货人: 王五 2024年1月15日',
        expectedItems: 3
      },
      {
        type: 'Speech',
        text: '施工二部的赵六来领取安全鞋十双，还有防尘口罩一百个',
        expectedItems: 2
      }
    ];
    
    for (const testCase of complexTexts) {
      let result;
      if (testCase.type === 'OCR') {
        result = xunfeiOcr.extractPPEInfo(testCase.text);
      } else {
        result = xunfeiSpeech.extractPickupInfo(testCase.text);
      }
      
      console.log(`   [${testCase.type}] ${testCase.text.substring(0, 40)}...`);
      console.log(`   提取到 ${result.items.length} 个物品 (期望: ${testCase.expectedItems})`);
      console.log(`   物品列表: ${JSON.stringify(result.items)}`);
    }
  });
}

/**
 * 运行所有测试
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 讯飞AI API 集成测试');
  console.log('='.repeat(60));
  console.log('开始时间:', new Date().toLocaleString());
  
  const runner = new TestRunner();
  
  try {
    // 测试认证模块
    await testAuthModule(runner);
    
    // 测试OCR模块
    await testOcrModule(runner);
    
    // 测试语音模块
    await testSpeechModule(runner);
    
    // 测试模拟数据
    await testMockData(runner);
    
  } catch (error) {
    console.error('\n❌ 测试执行出错:', error.message);
    console.error(error.stack);
  }
  
  // 打印测试报告
  runner.printReport();
  
  console.log('\n结束时间:', new Date().toLocaleString());
  console.log('='.repeat(60));
  
  return runner.results;
}

/**
 * 运行特定测试
 * Run specific test
 */
async function runSpecificTest(moduleName) {
  const runner = new TestRunner();
  
  switch (moduleName) {
    case 'auth':
      await testAuthModule(runner);
      break;
    case 'ocr':
      await testOcrModule(runner);
      break;
    case 'speech':
      await testSpeechModule(runner);
      break;
    case 'mock':
      await testMockData(runner);
      break;
    default:
      console.log(`未知测试模块: ${moduleName}`);
      console.log('可用模块: auth, ocr, speech, mock');
      return;
  }
  
  runner.printReport();
  return runner.results;
}

/**
 * 演示使用示例
 * Demo usage examples
 */
function showExamples() {
  console.log('\n' + '='.repeat(60));
  console.log('📖 使用示例');
  console.log('='.repeat(60));
  
  console.log(`
// ========== OCR 使用示例 ==========

const { recognizeDeliveryOrder } = require('./xunfei_ocr');

// 识别送货单
async function processDeliveryOrder(imageBase64) {
  const result = await recognizeDeliveryOrder(imageBase64);
  
  if (result.success) {
    console.log('PPE物品:', result.data.items);
    console.log('收货人:', result.data.recipient);
    console.log('日期:', result.data.date);
    console.log('订单号:', result.data.orderNumber);
  } else {
    console.error('识别失败:', result.message);
  }
}

// ========== 语音使用示例 ==========

const { recognizePickupVoice } = require('./xunfei_speech');

// 识别领取语音
async function processPickupVoice(audioBase64) {
  const result = await recognizePickupVoice(audioBase64);
  
  if (result.success) {
    console.log('员工:', result.data.employee);
    console.log('领取物品:', result.data.items);
    console.log('操作类型:', result.data.action);
  } else {
    console.error('识别失败:', result.message);
  }
}

// ========== 认证工具使用示例 ==========

const { generateRequestHeaders, generateWebSocketUrl } = require('./xunfei_auth');

// 生成HTTP请求头
const headers = generateRequestHeaders({
  appId: 'your_app_id',
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret',
  host: 'api.xfyun.cn',
  requestLine: 'POST /v2/ocr HTTP/1.1'
});

// 生成WebSocket URL
const wsUrl = generateWebSocketUrl({
  appId: 'your_app_id',
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret',
  baseUrl: 'wss://ws-api.xfyun.cn/v2/iat'
});
`);
}

// 如果直接运行此文件
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--examples') || args.includes('-e')) {
    showExamples();
  } else if (args.includes('--module') || args.includes('-m')) {
    const moduleIndex = args.findIndex(arg => arg === '--module' || arg === '-m');
    const moduleName = args[moduleIndex + 1];
    runSpecificTest(moduleName);
  } else {
    runAllTests();
  }
}

module.exports = {
  // 测试运行器
  TestRunner,
  
  // 测试函数
  testAuthModule,
  testOcrModule,
  testSpeechModule,
  testMockData,
  
  // 主函数
  runAllTests,
  runSpecificTest,
  showExamples
};
