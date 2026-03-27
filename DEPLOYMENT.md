# PPE智能管理系统 - 部署指南

## 项目概述

PPE智能管理系统是一个劳保用品库存管理系统，使用Node.js + Express + MySQL + React技术栈。

## 快速开始

### 方式1: Docker Compose（推荐）

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd ppe-smart-manager

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量

# 3. 启动服务
docker-compose up -d

# 4. 访问应用
# 前端: http://localhost
# 后端API: http://localhost:3001/api
```

### 方式2: 手动部署

#### 后端部署

```bash
cd backend

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 初始化数据库
mysql -u root -p < ../data/schema.sql

# 4. 启动服务
# 开发模式
npm run dev

# 生产模式（使用PM2）
npm install -g pm2
npm run pm2:start
```

#### 前端部署

```bash
cd frontend

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 构建生产包
npm run build

# 4. 部署到Web服务器
# 将dist目录内容部署到Nginx/Apache
```

## 环境变量配置

### 后端环境变量 (.env)

```bash
# 服务器配置
NODE_ENV=production
PORT=3001

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ppe_smart_manager

# JWT配置
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=7d

# 讯飞API配置（可选）
XUNFEI_APP_ID=your_app_id
XUNFEI_API_KEY=your_api_key
XUNFEI_API_SECRET=your_api_secret

# CORS配置
CORS_ORIGIN=https://yourdomain.com
```

### 前端环境变量 (.env)

```bash
VITE_API_URL=/api
```

## GitHub Actions CI/CD

项目已配置GitHub Actions，支持自动测试和部署。

### 配置GitHub Secrets

在GitHub仓库设置中添加以下Secrets：

- `DB_HOST`: 数据库主机
- `DB_USER`: 数据库用户
- `DB_PASSWORD`: 数据库密码
- `DB_NAME`: 数据库名称
- `JWT_SECRET`: JWT密钥
- `DEPLOY_KEY`: 部署密钥（如需要）

### 触发CI/CD

- Push到`main`分支：触发完整CI/CD流程
- Pull Request到`main`分支：触发测试流程

## 生产环境检查清单

- [ ] 修改JWT_SECRET为强密钥
- [ ] 配置CORS_ORIGIN为具体域名
- [ ] 配置数据库连接
- [ ] 配置讯飞API密钥（如使用AI功能）
- [ ] 配置SSL证书
- [ ] 配置防火墙规则
- [ ] 配置日志监控
- [ ] 配置备份策略

## 常见问题

### 数据库连接失败

检查：
1. MySQL服务是否运行
2. 数据库用户权限
3. 防火墙设置

### 前端API请求失败

检查：
1. 后端服务是否运行
2. CORS配置
3. API地址配置

## 技术支持

如有问题，请提交GitHub Issue。
