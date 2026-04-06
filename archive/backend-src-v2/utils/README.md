# 讯飞AI API 集成模块

PPE智能管理系统的讯飞AI API集成模块，提供OCR文字识别和语音听写功能。

## 文件结构

```
utils/
├── xunfei_auth.js      # 讯飞API认证工具
├── xunfei_ocr.js       # OCR文字识别
├── xunfei_speech.js    # 语音听写
├── test_xunfei.js      # 测试文件
└── README.md           # 本文档
```

## 环境变量配置

在项目根目录创建 `.env` 文件，配置以下环境变量：

```bash
# 讯飞开放平台配置
XUNFEI_APP_ID=your_app_id
XUNFEI_API_KEY=your_api_key
XUNFEI_API_SECRET=your_api_secret

# API地址（可选，使用默认值）
XUNFEI_OCR_URL=https://api.xfyun.cn/v2/ocr/general
XUNFEI_SPEECH_URL=wss://ws-api.xfyun.cn/v2/iat
```

## 安装依赖

```bash
cd backend
npm install
```

## 使用方法

### 1. OCR文字识别

```javascript
const { recognizeDeliveryOrder } = require('./utils/xunfei_ocr');

// 识别送货单
async function processDeliveryOrder(imageBase64) {
  const result = await recognizeDeliveryOrder(imageBase64);
  
  if (result.success) {
    console.log('PPE物品:', result.data.items);
    // 输出: [{ name: '安全帽', quantity: 20, unit: '个' }, ...]
    
    console.log('收货人:', result.data.recipient);
    // 输出: '张三'
    
    console.log('日期:', result.data.date);
    // 输出: '2024-01-15'
    
    console.log('订单号:', result.data.orderNumber);
    // 输出: 'SO2024001'
    
    console.log('置信度:', result.data.confidence);
    // 输出: 100
  } else {
    console.error('识别失败:', result.message);
  }
}
```

### 2. 语音听写

```javascript
const { recognizePickupVoice } = require('./utils/xunfei_speech');

// 识别领取语音
async function processPickupVoice(audioBase64) {
  const result = await recognizePickupVoice(audioBase64);
  
  if (result.success) {
    console.log('员工:', result.data.employee);
    // 输出: '张三'
    
    console.log('领取物品:', result.data.items);
    // 输出: [{ name: '安全帽', quantity: 2, unit: '个' }, ...]
    
    console.log('操作类型:', result.data.action);
    // 输出: '领取'
    
    console.log('部门:', result.data.department);
    // 输出: '施工一部'
  } else {
    console.error('识别失败:', result.message);
  }
}
```

### 3. 低级API调用

#### OCR基础识别

```javascript
const { recognizeText } = require('./utils/xunfei_ocr');

const result = await recognizeText(imageBase64, {
  language: 'cn',      // 语言: 'cn'中文, 'en'英文
  location: true,      // 返回位置信息
  probability: true,   // 返回置信度
  timeout: 30000,      // 超时时间
  maxRetries: 3        // 最大重试次数
});
```

#### 语音基础识别

```javascript
const { speechToText } = require('./utils/xunfei_speech');

const result = await speechToText(audioBase64, {
  language: 'zh_cn',   // 语言: 'zh_cn'中文, 'en_us'英文
  domain: 'iat',       // 领域: 'iat'日常, 'medical'医疗
  accent: 'mandarin',  // 方言: 'mandarin'普通话
  timeout: 60000,      // 超时时间
  maxRetries: 3        // 最大重试次数
});
```

### 4. 认证工具

```javascript
const { 
  generateRequestHeaders, 
  generateWebSocketUrl,
  hmacSha256,
  base64Encode
} = require('./utils/xunfei_auth');

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
```

## 测试

### 运行所有测试

```bash
npm test
```

### 运行特定模块测试

```bash
npm run test:auth    # 测试认证模块
npm run test:ocr     # 测试OCR模块
npm run test:speech  # 测试语音模块
npm run test:mock    # 测试模拟数据
```

### 查看使用示例

```bash
npm run test:examples
```

## API响应格式

所有函数返回统一的响应格式：

```javascript
{
  success: true/false,    // 是否成功
  data: {},               // 返回数据
  message: "错误信息"      // 错误描述
}
```

## 错误处理

模块自动处理以下错误：

- 网络错误（超时、连接重置等）
- API返回错误
- 参数验证错误
- 重试机制（默认3次）

## 支持的PPE物品

系统可识别以下PPE物品：

- 头部防护：安全帽、头盔
- 眼部防护：护目镜、防护眼镜、安全眼镜
- 呼吸防护：口罩、防尘口罩、防毒面具
- 手部防护：手套、防护手套、劳保手套、绝缘手套、防切割手套
- 足部防护：安全鞋、防护鞋、劳保鞋
- 身体防护：防护服、工作服、反光背心、防化服
- 坠落防护：安全带、安全绳
- 听力防护：耳塞、耳罩
- 其他：安全网、警示带、焊接面罩

## 讯飞开放平台

- 官网：https://www.xfyun.cn/
- 文档：https://doc.xfyun.cn/
- 控制台：https://console.xfyun.cn/

## 注意事项

1. **API密钥安全**：不要将API密钥硬编码在代码中，使用环境变量
2. **图片大小限制**：OCR图片Base64编码后不超过4MB
3. **音频时长限制**：语音识别单次不超过60秒
4. **网络稳定性**：生产环境建议添加更多重试和降级逻辑

## License

MIT
