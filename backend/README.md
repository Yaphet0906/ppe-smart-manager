# PPE智能管理系统 - 后端服务

## 项目简介

PPE智能管理系统是一个劳保用品库存管理系统，使用Node.js + Express + MySQL技术栈开发。

## 技术栈

- **Node.js**: JavaScript运行时环境
- **Express**: Web应用框架
- **MySQL**: 关系型数据库
- **mysql2**: MySQL数据库驱动
- **bcryptjs**: 密码加密
- **jsonwebtoken**: JWT认证
- **helmet**: 安全头中间件
- **express-rate-limit**: 请求限流
- **winston**: 日志记录

## 项目结构

```
backend/
├── app.js                   # 应用入口
├── config/
│   ├── db.js               # 数据库连接配置
│   ├── logger.js           # 日志配置
│   └── ai.js               # AI API配置
├── middleware/
│   ├── auth.js             # JWT认证中间件
│   └── validate.js         # 输入验证中间件
├── routes/
│   ├── user.js             # 用户路由 (/api/user/*)
│   └── ppe.js              # PPE库存路由 (/api/ppe/*)
├── tests/
│   ├── setup.js            # 测试环境配置
│   └── health.test.js      # 健康检查测试
├── package.json
└── README.md               # 本文件
```

## 安装和运行

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接信息
```

**必需的环境变量**:
```bash
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=ppe_smart_manager
JWT_SECRET=你的JWT密钥
CORS_ORIGIN=http://localhost:8088
```

### 3. 初始化数据库

```bash
# 使用项目根目录的 schema.sql
mysql -u root -p < data/schema.sql
```

### 4. 启动服务器

```bash
# 开发模式（使用nodemon）
npm run dev

# 生产模式
npm start

# 运行测试
npm test
```

服务器将在 http://localhost:3001 启动

## API端点列表

### 健康检查
- `GET /api/health` - 服务器健康检查

### 用户管理
- `POST /api/user/login` - 用户登录（公司名称+手机号+密码）
- `POST /api/user/register-company` - 注册新公司
- `GET /api/user/info` - 获取当前用户信息
- `GET /api/user/profile` - 获取当前用户资料
- `POST /api/user/change-password` - 修改密码
- `POST /api/user/quick-outbound` - 扫码领用（免登录）
- `GET /api/user/public-ppe-list` - 获取公司物品列表（免登录）

### PPE库存管理
- `GET /api/ppe/stats` - 获取库存统计数据
- `GET /api/ppe/list` - 获取物品列表
- `GET /api/ppe/warehouse-list` - 获取仓库列表
- `POST /api/ppe/warehouse-add` - 添加仓库
- `POST /api/ppe/inbound` - 物品入库
- `POST /api/ppe/outbound` - 物品出库
- `POST /api/ppe/ocr-inbound` - OCR识别入库
- `DELETE /api/ppe/delete/:id` - 删除物品

## API返回格式

所有API返回统一的JSON格式：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

## 测试账号

**当前数据库中的测试账号**:
- 公司名称: `ABCD`
- 手机号: `18116175082`
- 密码: `123456`

> 注：首次使用请先通过前端页面注册新公司

## 数据库表结构（主要）

> **注意**: 当前版本使用以下新表结构（v1.5+）。数据库中可能残留旧表（users/companies/ppe_items等），这些旧表不会被代码引用，不影响系统运行。

### core_tenants (租户/公司表)
- id, code, name, contact_name, contact_phone, status, created_at

### core_users (用户表)
- id, tenant_id, name, phone, password, role, department, employee_no, is_first_login, created_at

### inv_items (物品表)
- id, tenant_id, warehouse_id, category_code, code, name, specification, brand, model, size, unit, quantity, safety_stock, max_stock

### inv_warehouses (仓库表)
- id, tenant_id, code, name, location, status, created_at

### inv_inbound (入库记录表)
- id, tenant_id, warehouse_id, item_id, quantity, batch_no, supplier, unit_price, operator_id, inbound_date

### inv_outbound (出库记录表)
- id, tenant_id, warehouse_id, item_id, quantity, employee_name, employee_phone, purpose, operator_id, outbound_date

### inv_transactions (库存流水表)
- id, tenant_id, warehouse_id, item_id, type, quantity, before_qty, after_qty, source_no, operator_name, remark, created_at

完整的数据库结构请参考 `data/schema.sql`

### 归档文件说明
- `docs/history/` - 历史文档归档（v1.0-v1.4）
- `backend/database/*.old.deprecated` - 旧版初始化脚本
- `backend/sql/*.old.deprecated` - 旧版SQL脚本
- `data/old_tables_backup_*.sql` - 旧表数据备份（已删除）

这些文件仅作参考，不会被当前代码引用。

## 许可证

MIT
