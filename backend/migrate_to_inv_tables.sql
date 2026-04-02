-- =============================================================================
-- 数据迁移脚本：将旧表数据迁移到新表
-- 从: ppe_items, inbound_records, inbound_items, outbound_records, outbound_items
-- 到: inv_items, inv_inbound, inv_outbound, inv_transactions
-- =============================================================================

-- 关闭外键检查
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- 第一步：清空新表（如果已有数据）
-- =============================================================================
TRUNCATE TABLE inv_transactions;
TRUNCATE TABLE inv_inbound;
TRUNCATE TABLE inv_outbound;
TRUNCATE TABLE inv_items;

-- =============================================================================
-- 第二步：迁移物品数据 (ppe_items -> inv_items)
-- =============================================================================
INSERT INTO inv_items (
    id,                    -- 保持原ID
    tenant_id,             -- 使用 company_id 作为 tenant_id
    warehouse_id,          -- 默认 NULL，需要手动分配
    name,
    category_code,         -- 使用 category 作为 category_code
    specification,
    brand,
    model,
    unit,
    quantity,
    safety_stock,          -- 使用 min_stock 作为 safety_stock
    status,
    remark,
    created_at,
    updated_at,
    deleted_at
)
SELECT 
    id,
    company_id as tenant_id,
    NULL as warehouse_id,  -- 默认为空，需要后续手动分配仓库
    name,
    COALESCE(category, 'other') as category_code,
    specification,
    brand,
    model,
    COALESCE(unit, '件') as unit,
    COALESCE(quantity, 0) as quantity,
    COALESCE(min_stock, 10) as safety_stock,
    1 as status,           -- 默认启用
    remarks as remark,
    created_at,
    updated_at,
    deleted_at
FROM ppe_items
WHERE deleted_at IS NULL;

-- 显示迁移的物品数量
SELECT CONCAT('已迁移 ', COUNT(*), ' 条物品记录') as message FROM inv_items;

-- =============================================================================
-- 第三步：创建默认仓库（如果没有仓库的话）
-- =============================================================================
-- 检查是否已存在仓库
SET @warehouse_count = (SELECT COUNT(*) FROM inv_warehouses WHERE deleted_at IS NULL);

-- 如果不存在仓库，为每个租户创建一个默认仓库
INSERT INTO inv_warehouses (tenant_id, code, name, location, status, created_at)
SELECT DISTINCT 
    company_id as tenant_id,
    'MAIN' as code,
    '主仓库' as name,
    '默认位置' as location,
    1 as status,
    NOW() as created_at
FROM ppe_items
WHERE company_id NOT IN (SELECT tenant_id FROM inv_warehouses WHERE deleted_at IS NULL);

-- =============================================================================
-- 第四步：将物品分配到默认仓库
-- =============================================================================
-- 更新所有没有仓库的物品，将其分配到该租户的默认仓库
UPDATE inv_items i
SET warehouse_id = (
    SELECT id FROM inv_warehouses w 
    WHERE w.tenant_id = i.tenant_id 
    AND w.deleted_at IS NULL 
    ORDER BY id ASC 
    LIMIT 1
)
WHERE i.warehouse_id IS NULL;

-- =============================================================================
-- 第五步：迁移入库记录
-- 注意：由于旧表结构和新表结构差异较大，这里做简化处理
-- =============================================================================
-- 创建触发器来自动生成入库记录（可选）

-- =============================================================================
-- 第六步：数据验证
-- =============================================================================
-- 检查物品总数
SELECT 
    '物品总数' as check_item,
    COUNT(*) as count 
FROM inv_items 
WHERE deleted_at IS NULL;

-- 检查按租户分布
SELECT 
    '按租户分布' as check_item,
    tenant_id,
    COUNT(*) as item_count
FROM inv_items 
WHERE deleted_at IS NULL
GROUP BY tenant_id;

-- 检查按仓库分布
SELECT 
    '按仓库分布' as check_item,
    w.name as warehouse_name,
    COUNT(i.id) as item_count
FROM inv_warehouses w
LEFT JOIN inv_items i ON w.id = i.warehouse_id AND i.deleted_at IS NULL
WHERE w.deleted_at IS NULL
GROUP BY w.id, w.name;

-- =============================================================================
-- 第七步：启用外键检查
-- =============================================================================
SET FOREIGN_KEY_CHECKS = 1;

-- 完成提示
SELECT '数据迁移完成！请检查上面的统计信息。' as message;
SELECT '注意：入库/出库历史记录需要单独处理，建议重新开始使用新表。' as notice;
