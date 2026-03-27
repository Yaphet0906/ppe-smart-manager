# PPE智能管理系统 - 快速启动指南

## 环境要求

- Node.js 18+
- MySQL 8.0+
- npm 或 yarn

## 1. 数据库配置（2分钟）

```bash
# 登录MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE ppe_smart_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 退出
exit

# 导入表结构
mysql -u root -p ppe_smart_manager < data/schema.sql
```

## 2. 后端启动（3分钟）

```bash
cd backend

# 复制环境变量
cp .env.example .env

# 编辑 .env 文件，配置数据库连接
# DB_PASSWORD=你的数据库密码

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

后端服务启动在 http://localhost:3001

测试：`curl http://localhost:3001/api/health`

## 3. 前端启动（3分钟）

```bash
cd frontend

# 复制环境变量
cp .env.example .env

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用启动在 http://localhost:3000

## 4. 访问应用

- 打开浏览器访问 http://localhost:3000
- 使用测试账号登录：
  - 管理员：手机号 `13800138000`
  - 员工：手机号 `13800138001`

## 5. 讯飞API配置（可选，用于AI功能）

1. 访问 https://www.xfyun.cn/ 注册账号
2. 创建应用，获取 APP_ID、API_KEY、API_SECRET
3. 开通「通用文字识别」和「语音听写」服务
4. 将密钥填入 backend/.env 文件

## 常用命令

```bash
# 后端
npm run dev      # 开发模式
npm start        # 生产模式
npm test         # 测试讯飞API

# 前端
npm run dev      # 开发模式
npm run build    # 构建生产包
npm run preview  # 预览生产包
```

## 目录说明

```
ppe-smart-manager/
├── backend/          # 后端代码
│   ├── src/
│   │   ├── controllers/   # API控制器
│   │   ├── models/        # 数据模型
│   │   ├── routes/        # 路由
│   │   └── utils/         # 工具函数（含讯飞API）
│   └── .env               # 环境变量（需创建）
├── frontend/         # 前端代码
│   ├── src/
│   │   ├── pages/         # 页面
│   │   ├── components/    # 组件
│   │   └── hooks/         # 自定义Hooks
│   └── .env               # 环境变量（需创建）
└── data/
    └── schema.sql         # 数据库表结构
```

## 问题排查

### 数据库连接失败
- 检查MySQL服务是否启动
- 检查 .env 中的数据库配置是否正确

### 端口被占用
- 后端默认端口 3001，可在 .env 中修改 PORT
- 前端默认端口 3000，可在 vite.config.ts 中修改

### 跨域问题
- 检查后端 CORS_ORIGIN 配置
- 前端代理配置在 vite.config.ts 中

## 下一步

- [ ] 注册讯飞开放平台账号
- [ ] 测试OCR识别功能
- [ ] 测试语音领取功能
- [ ] 配置生产环境部署
