# PPE智能管理系统
基于Vue3 + Node.js + MySQL的个人防护装备（PPE）管理系统

## 快速开始
### 前置条件
- 安装Node.js（v16+）、MySQL（v8+）、Git
- 注册GitHub账号，新建仓库：ppe-smart-manager

### 1. 克隆仓库
```bash
git clone https://github.com/你的用户名/ppe-smart-manager.git
cd ppe-smart-manager
```

### 2. 后端部署
```bash
# 进入后端目录
cd backend
# 安装依赖
npm install
# 复制环境变量示例并配置
cp .env.example .env
# 编辑.env文件，填写数据库密码、JWT密钥等
# 初始化数据库（执行sql/init.sql）
mysql -u root -p < sql/init.sql
# 启动后端
npm run start
```

### 3. 前端部署
```bash
# 回到项目根目录
cd ..
# 安装依赖
npm install
# 本地运行（端口8088）
npm run serve
# 打包并部署到GitHub Pages
npm run build
npm run deploy
```

### 4. 访问地址
- 本地开发：http://localhost:8088
- GitHub Pages：https://你的用户名.github.io/ppe-smart-manager/
- 后端接口：http://localhost:3001/api

## 默认账号
- 用户名：admin
- 密码：admin123

## 项目结构
```
ppe-smart-manager/
├── backend/              # 后端代码
│   ├── config/          # 配置文件
│   ├── routes/          # 路由
│   ├── sql/             # 数据库脚本
│   ├── app.js           # 入口文件
│   ├── package.json     # 依赖配置
│   └── .env.example     # 环境变量示例
├── frontend/src/        # 前端代码
│   ├── components/      # 组件
│   ├── views/           # 页面
│   ├── router/          # 路由配置
│   ├── store/           # 状态管理
│   └── utils/           # 工具函数
├── vue.config.js        # Vue配置
├── package.json         # 前端依赖
└── README.md            # 项目说明
```

## 端口配置
- 前端：8088
- 后端：3001
