# PPE智能管理系统 - 重构说明

## 重构日期
2024年

## 重构内容

### 1. 前端技术栈变更
- **原技术栈**: React 18 + Vite + Tailwind CSS
- **新技术栈**: Vue 3 + Vue CLI + Element Plus

### 2. 端口配置更新
- **前端端口**: 8088（替代原来的3000）
- **后端端口**: 3001（保持不变）

### 3. 新增/修改的文件

#### 前端配置
- `vue.config.js` - Vue CLI配置文件，配置跨域代理指向后端3001端口
- `package.json` - 前端依赖配置（Vue3、Element Plus、Pinia等）

#### 前端源码
- `src/main.js` - Vue应用入口
- `src/App.vue` - 根组件
- `src/router/index.js` - Vue Router配置
- `src/store/index.js` - Pinia状态管理
- `src/utils/request.js` - Axios请求封装

#### 前端页面
- `src/views/Login.vue` - 登录页面
- `src/views/Layout.vue` - 布局组件（侧边栏+头部）
- `src/views/Dashboard.vue` - 首页仪表盘
- `src/views/PPEList.vue` - PPE设备管理
- `src/views/PPEInbound.vue` - 入库管理
- `src/views/PPEOutbound.vue` - 出库管理
- `src/views/Alerts.vue` - 预警管理

#### 后端配置
- `backend/.env.example` - 环境变量示例（PORT=3001）
- `backend/config/db.js` - 数据库连接配置
- `backend/app.js` - Express入口（端口3001）
- `backend/package.json` - 后端依赖

#### 后端路由
- `backend/routes/user.js` - 用户相关接口（登录等）
- `backend/routes/ppe.js` - PPE相关接口（CRUD、出入库等）

#### 数据库
- `backend/sql/init.sql` - 数据库初始化脚本

### 4. 启动命令

#### 后端启动
```bash
cd backend
npm install
npm start
# 服务运行在 http://localhost:3001
```

#### 前端启动
```bash
# 在项目根目录
npm install
npm run serve
# 服务运行在 http://localhost:8088
```

### 5. 默认登录账号

> ⚠️ **注意**: 以下账号仅为开发测试使用，生产环境请自行注册公司和管理员

**测试账号**（需先注册公司）：
1. 访问登录页，点击"新公司注册"
2. 填写公司信息创建租户
3. 使用注册时的手机号和密码登录

**当前数据库中的测试账号**:
- 公司名称: `ABCD`
- 手机号: `18116175082`
- 密码: `123456`

### 6. 项目特点
1. **完整功能**: 登录、PPE设备管理、入库、出库、预警
2. **响应式设计**: 基于Element Plus的现代化UI
3. **状态管理**: 使用Pinia管理用户状态
4. **路由守卫**: 未登录自动跳转登录页
5. **GitHub Pages支持**: 配置publicPath适配GitHub Pages
