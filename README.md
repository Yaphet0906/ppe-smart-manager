# PPE Smart Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-green.svg)](https://vuejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-blue.svg)](https://nodejs.org/)

> 🏭 专为工厂 HSE 设计的劳保用品管理系统 | 扫码领用 | 截图入库 | 多租户 SaaS

## ✨ 核心功能

### 📱 员工端（扫码领用）
- **无需登录** - 扫码即可自助领用
- **手机适配** - 完美支持手机浏览器
- **简单快捷** - 填姓名+手机号，30秒完成

### 👨‍💼 管理端
- **多租户** - 支持多个公司独立使用
- **截图入库** - 上传邮件/订单截图，AI自动识别
- **二维码管理** - 为每个仓库生成专属二维码
- **库存预警** - 低库存自动提醒
- **一键报表** - HSE审计专用报表导出

## 🚀 快速开始

### 环境要求
- Node.js 18+
- MySQL 8.0+
- 讯飞 OCR API（可选，用于截图识别）

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/Yaphet0906/ppe-smart-manager.git
cd ppe-smart-manager

# 安装依赖
npm install

# 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 配置数据库和讯飞API

# 初始化数据库
mysql -u root -p < backend/database/init.sql

# 启动后端
cd backend
npm install
npm run dev

# 启动前端（新终端）
npm run serve
```

访问：http://localhost:8080

## 📖 使用指南

### 1. 注册公司
- 访问登录页
- 点击"注册新公司"
- 填写公司信息，获取公司代码

### 2. 配置仓库
- 进入"二维码管理"
- 为每个仓库生成二维码
- 打印并贴在仓库墙上

### 3. 员工领用
- 员工扫码墙上的二维码
- 填写姓名+手机号
- 选择物品，确认领用

### 4. 采购入库
- 收到供应商邮件/订单
- 截图并上传
- AI自动识别物品信息
- 确认后一键入库

## 🏗️ 技术架构

### 前端
- **Vue 3** - 渐进式JavaScript框架
- **Element Plus** - UI组件库
- **Vue Router** - 路由管理
- **Pinia** - 状态管理
- **Axios** - HTTP客户端

### 后端
- **Node.js** - JavaScript运行时
- **Express** - Web框架
- **MySQL** - 关系型数据库
- **JWT** - 身份认证
- **讯飞 OCR** - 文字识别

### 数据库设计
- **多租户架构** - company_id 隔离数据
- **软删除** - deleted_at 字段
- **事务支持** - 保证数据一致性

## 📁 项目结构

```
ppe-smart-manager/
├── backend/              # 后端代码
│   ├── routes/          # API路由
│   ├── src/utils/       # 工具函数
│   ├── config/          # 配置文件
│   └── database/        # 数据库脚本
├── frontend/            # 前端代码
│   ├── src/views/       # 页面组件
│   ├── src/router/      # 路由配置
│   └── src/store/       # 状态管理
├── nginx/               # Nginx配置
└── docker-compose.yml   # Docker编排
```

## 🎯 适用场景

- ✅ 化工厂、制药厂（HSE管理规范）
- ✅ 电子厂、机械厂（PPE领用频繁）
- ✅ 建筑工地（人员流动性大）
- ✅ 任何需要管理劳保用品的企业

## 💡 核心优势

| 对比项 | Excel台账 | 钉钉表单 | PPE Smart Manager |
|-------|----------|---------|------------------|
| 部署方式 | 本地文件 | 钉钉云端 | 可内网/云端 |
| 数据主权 | 本地 | 钉钉服务器 | 自己掌控 |
| 扫码领用 | ❌ | ⚠️需配置 | ✅原生支持 |
| 截图入库 | ❌ | ❌ | ✅AI识别 |
| 专业报表 | ❌ | ⚠️需配置 | ✅内置 |
| 多租户 | ❌ | ❌ | ✅支持 |

## 🔒 安全特性

- **密码加密** - bcrypt哈希存储
- **JWT认证** - 无状态身份验证
- **数据隔离** - 多租户严格隔离
- **SQL注入防护** - 参数化查询
- **XSS防护** - 输入过滤

## 🛠️ 开发计划

- [x] 多租户数据隔离
- [x] 响应式布局（手机端）
- [x] 扫码领用（免登录）
- [x] 二维码生成
- [x] 截图OCR入库
- [ ] 一键报表（HSE审计）
- [ ] 数据导出Excel
- [ ] 邮件通知
- [ ] 微信小程序

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证

## 👨‍💻 作者

**Yaphet.seo** - *HSE自动化解决方案*

---

> 💬 有问题或建议？欢迎提交 Issue 或联系作者！

## 🙏 致谢

- [Vue.js](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [讯飞开放平台](https://www.xfyun.cn/)
- [Node.js](https://nodejs.org/)