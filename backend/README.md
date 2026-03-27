# PPE智能管理系统 - 后端服务

## 项目简介

PPE智能管理系统是一个劳保用品库存管理系统，使用Node.js + Express + MySQL技术栈开发。

## 技术栈

- **Node.js**: JavaScript运行时环境
- **Express**: Web应用框架
- **MySQL**: 关系型数据库
- **mysql2**: MySQL数据库驱动
- **exceljs**: Excel文件生成库
- **cors**: 跨域资源共享中间件
- **dotenv**: 环境变量管理

## 项目结构

```
backend/
├── src/
│   ├── config/
│   │   └── database.js      # 数据库配置
│   ├── controllers/
│   │   ├── userController.js       # 用户控制器
│   │   ├── inventoryController.js  # 库存控制器
│   │   ├── inboundController.js    # 入库控制器
│   │   ├── outboundController.js   # 出库控制器
│   │   └── exportController.js     # 导出控制器
│   ├── models/
│   │   ├── User.js          # 用户模型
│   │   ├── PPEItem.js       # PPE物品模型
│   │   ├── InboundRecord.js # 入库记录模型
│   │   └── OutboundRecord.js# 出库记录模型
│   ├── routes/
│   │   ├── users.js         # 用户路由
│   │   ├── inventory.js     # 库存路由
│   │   ├── inbound.js       # 入库路由
│   │   ├── outbound.js      # 出库路由
│   │   └── export.js        # 导出路由
│   ├── utils/
│   │   └── export.js        # Excel导出工具
│   └── index.js             # 入口文件
├── database/
│   └── init.sql             # 数据库初始化脚本
├── .env.example             # 环境变量示例
├── package.json             # 项目配置
└── README.md                # 项目说明
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

### 3. 初始化数据库

```bash
# 使用MySQL客户端执行初始化脚本
mysql -u root -p < database/init.sql
```

### 4. 启动服务器

```bash
# 开发模式（使用nodemon）
npm run dev

# 生产模式
npm start
```

服务器将在 http://localhost:3001 启动

## API端点列表

### 健康检查
- `GET /api/health` - 服务器健康检查

### 用户管理
- `POST /api/users/login` - 用户登录
- `GET /api/users` - 获取用户列表
- `GET /api/users/statistics` - 获取用户统计
- `GET /api/users/:id` - 获取单个用户
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 库存管理
- `GET /api/inventory` - 获取库存列表
- `GET /api/inventory/statistics` - 获取库存统计
- `GET /api/inventory/categories` - 获取分类列表
- `GET /api/inventory/alerts/low-stock` - 低库存预警
- `GET /api/inventory/alerts/expiring` - 有效期预警
- `GET /api/inventory/:id` - 获取单个物品
- `POST /api/inventory` - 创建物品
- `PUT /api/inventory/:id` - 更新物品
- `DELETE /api/inventory/:id` - 删除物品

### 入库管理
- `GET /api/inbound` - 获取入库记录列表
- `GET /api/inbound/statistics` - 入库统计
- `GET /api/inbound/item-statistics` - 入库物品统计
- `GET /api/inbound/date-range` - 按日期范围查询
- `GET /api/inbound/:id` - 获取单个入库记录
- `POST /api/inbound` - 创建入库记录

### 出库管理
- `GET /api/outbound` - 获取出库记录列表
- `GET /api/outbound/statistics` - 出库统计
- `GET /api/outbound/item-statistics` - 出库物品统计
- `GET /api/outbound/employee-statistics` - 员工领用统计
- `GET /api/outbound/employee/:employeeId` - 按员工查询
- `GET /api/outbound/:id` - 获取单个出库记录
- `POST /api/outbound` - 创建出库记录

### 数据导出
- `GET /api/export/inbound` - 导出入库记录Excel
- `GET /api/export/outbound` - 导出发放记录Excel
- `GET /api/export/inventory` - 导出库存报表Excel

## API返回格式

所有API返回统一的JSON格式：

```json
{
  "success": true/false,
  "data": {},
  "message": "操作成功/失败原因"
}
```

## 默认账号

- **管理员**: 电话 `13800138000`，密码 `admin123`

## 数据库表结构

### users (用户表)
- id, name, phone, password, role, department, employee_no, created_at, updated_at, deleted_at

### ppe_items (PPE物品表)
- id, name, category, specification, unit, quantity, min_stock, max_stock, expiry_date, supplier, remarks, created_at, updated_at, deleted_at

### inbound_records (入库记录表)
- id, inbound_no, inbound_date, supplier, remarks, operator_id, created_at

### inbound_items (入库明细表)
- id, inbound_id, item_id, quantity, batch_no, expiry_date, unit_price, created_at

### outbound_records (出库记录表)
- id, outbound_no, outbound_date, employee_id, employee_name, department, purpose, remarks, operator_id, created_at

### outbound_items (出库明细表)
- id, outbound_id, item_id, quantity, remarks, created_at

## 许可证

MIT
