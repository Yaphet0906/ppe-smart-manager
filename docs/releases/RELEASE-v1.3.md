# PPE Smart Manager v1.3 "仓库管家"

**版本号**: v1.3  
**版本代号**: 仓库管家 (Warehouse Keeper)  
**发布日期**: 2026-04-02  
**提交数**: 22 commits

---

## 🎯 核心特性

### 1. 多仓库管理 (核心功能)
- ✅ 支持创建多个仓库（主仓库、分仓、备用仓）
- ✅ 库存数据按仓库隔离，切换仓库实时刷新
- ✅ 入库/出库记录关联具体仓库
- ✅ 统计数据支持按仓库筛选

### 2. 智能仓库编码
- ✅ 自动编码生成（WH001 → WH002 → WH003...）
- ✅ 多租户独立编号，各公司互不影响
- ✅ 支持手动自定义编码

### 3. 数据库架构升级
- ✅ 全面迁移到新表结构 `inv_` 系列表
  - `inv_warehouses` - 仓库表
  - `inv_items` - 物品表（支持 warehouse_id）
  - `inv_inbound` - 入库记录表
  - `inv_outbound` - 出库记录表
  - `inv_transactions` - 库存流水表
- ✅ 数据迁移脚本 `migrate_to_inv_tables.sql`

### 4. 移动端优化
- ✅ OCR入库支持拍照/相册选择
- ✅ 图片压缩优化
- ✅ 扫码领用表单适配移动端
- ✅ PWA 配置支持

---

## 📁 主要改动文件

### 后端 (Backend)
| 文件 | 改动说明 |
|------|---------|
| `routes/ppe.js` | 全部接口迁移到新表，支持仓库筛选 |
| `routes/user.js` | 扫码领用接口迁移到新表 |
| `models/PPEItem.js` | 完整迁移到 inv_items |
| `models/InboundRecord.js` | 迁移到 inv_inbound，支持库存流水 |
| `models/OutboundRecord.js` | 迁移到 inv_outbound，支持库存流水 |
| `migrate_to_inv_tables.sql` | 数据迁移脚本 |

### 前端 (Frontend)
| 文件 | 改动说明 |
|------|---------|
| `views/PPEList.vue` | 添加仓库选择器，支持按仓库筛选 |
| `views/OCRInbound.vue` | 移动端拍照、图片压缩 |
| `views/QuickOutbound.vue` | 移动端表单优化 |
| `public/manifest.json` | PWA 配置 |

---

## 🚀 升级指南

### 1. 更新代码
```bash
git pull origin main
```

### 2. 执行数据库迁移
```bash
cd backend
mysql -u root -p < migrate_to_inv_tables.sql
```

### 3. 重启服务
```bash
# 后端
cd backend && npm start

# 前端
npm run serve
```

---

## 🐛 修复的问题

| 问题 | 状态 |
|------|------|
| 切换仓库后仍显示所有物品 | ✅ 已修复 |
| warehouse_id 字符串/整数类型不匹配 | ✅ 已修复 |
| 仓库编码不规范（中文code） | ✅ 已修复 |
| 旧表ppe_items数据无法筛选仓库 | ✅ 已迁移到新表 |

---

## 📊 数据库结构

```
inv_warehouses (仓库)
  ├── id, code(WH001), name, tenant_id
  
inv_items (物品) 
  ├── id, name, warehouse_id → 关联仓库
  
inv_inbound (入库记录)
  ├── id, warehouse_id, item_id, quantity
  
inv_outbound (出库记录)
  ├── id, warehouse_id, item_id, quantity
  
inv_transactions (库存流水)
  ├── 记录每次库存变动的前后数量
```

---

## 🎉 版本意义

**v1.3 "仓库管家"** 是 PPE Smart Manager 的里程碑版本，标志着系统从**单仓库**向**多仓库**的跨越。

从此，企业可以：
- 📦 管理多个仓库（总仓、分仓、现场仓）
- 📊 分别查看各仓库库存
- 🏢 支持多公司独立使用
- 📱 移动端便捷操作

---

**发布者**: Rebecca  
**代号含义**: 专注于仓库精细化管理，像管家一样井井有条
