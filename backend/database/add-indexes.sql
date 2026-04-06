-- 数据库索引优化脚本
-- 执行此脚本以优化查询性能

USE ppe_smart_manager;

-- inv_items 表索引
CREATE INDEX IF NOT EXISTS idx_inv_items_tenant_id ON inv_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_warehouse_id ON inv_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_category_code ON inv_items(category_code);
CREATE INDEX IF NOT EXISTS idx_inv_items_deleted_at ON inv_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_inv_items_name ON inv_items(name);

-- inv_inbound 表索引
CREATE INDEX IF NOT EXISTS idx_inv_inbound_tenant_id ON inv_inbound(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_inbound_warehouse_id ON inv_inbound(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_inbound_item_id ON inv_inbound(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_inbound_inbound_date ON inv_inbound(inbound_date);

-- inv_outbound 表索引
CREATE INDEX IF NOT EXISTS idx_inv_outbound_tenant_id ON inv_outbound(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_outbound_warehouse_id ON inv_outbound(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_outbound_item_id ON inv_outbound(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_outbound_outbound_date ON inv_outbound(outbound_date);
CREATE INDEX IF NOT EXISTS idx_inv_outbound_employee_phone ON inv_outbound(employee_phone);

-- inv_transactions 表索引
CREATE INDEX IF NOT EXISTS idx_inv_transactions_tenant_id ON inv_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_item_id ON inv_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_type ON inv_transactions(type);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_created_at ON inv_transactions(created_at);

-- core_users 表索引
CREATE INDEX IF NOT EXISTS idx_core_users_tenant_id ON core_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_users_phone ON core_users(phone);
CREATE INDEX IF NOT EXISTS idx_core_users_deleted_at ON core_users(deleted_at);

-- core_tenants 表索引
CREATE INDEX IF NOT EXISTS idx_core_tenants_name ON core_tenants(name);

-- inv_warehouses 表索引
CREATE INDEX IF NOT EXISTS idx_inv_warehouses_tenant_id ON inv_warehouses(tenant_id);

SELECT '数据库索引添加完成' AS status;
