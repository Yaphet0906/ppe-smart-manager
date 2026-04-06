# 变更日志

所有项目的显著变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且该项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

## [1.5.1] - 2026-04-05

### 安全 🔒

- **移除默认密钥**: 删除了 `docker-compose.yml` 中的默认 JWT_SECRET、DB_PASSWORD、DB_ROOT_PASSWORD
- **强制环境变量**: 应用程序启动时检查 SECRET_KEY、CORS_ORIGIN、DB_PASSWORD 是否设置，未设置则退出
- **增强 CORS 配置**: 从允许所有来源改为强制使用特定来源
- **SQL 注入防护**: 使用参数化查询，移除字符串拼接 SQL

### 新增 ✨

- **Joi 输入验证**: 新增 `backend/middleware/validate.js`，使用 Joi 验证所有输入
- **集中式认证中间件**: 提取 `backend/middleware/auth.js` 统一管理 JWT 验证
- **ESLint 配置**: 添加 `backend/.eslintrc.js`，代码规范检查
- **Prettier 配置**: 添加 `backend/.prettierrc`，统一代码格式
- **Nginx SSL 配置**: 添加 `nginx/nginx-ssl.conf`，支持 HTTPS
- **数据库备份脚本**: 添加 `scripts/backup.sh`，支持自动备份和清理
- **健康检查脚本**: 添加 `scripts/health-check.sh`，监控服务状态

### 变更 ♻️

- **Dockerfile 路径修复**: 修复 `COPY backend/src` 为 `COPY backend/`
- **统一 JWT 验证**: 所有路由使用 `authMiddleware` 替代内联验证
- **统一输入验证**: PPE 路由使用 Joi 验证替代手动验证

### 依赖 ⬆️

- 新增: `joi@17.13.3` - 输入验证
- 新增: `winston@3.17.0` - 日志记录
- 新增: `eslint@8.57.0` - 代码规范
- 新增: `jest@29.7.0` - 测试框架

## [1.5.0] - 2026-03-31

### 安全 🔒

- 新增速率限制：每 IP 100 请求/15分钟
- 新增 Helmet 安全头
- 修复 SQL 注入漏洞（部分）

### 新增 ✨

- 多租户支持
- 仓库管理功能
- 数据导出功能

### 变更 ♻️

- 用户表名从 `users` 改为 `core_users`
- 物品表名从 `ppe_items` 改为 `inv_items`

## [1.0.0] - 2026-03-01

### 新增 ✨

- 初始版本发布
- 基础 PPE 库存管理
- JWT 认证
- 出入库记录
