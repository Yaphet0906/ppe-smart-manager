USE ppe_smart_manager;
SELECT '=== 当前仓库1的物品 ===' as info;
SELECT id, name, size, quantity as stock, warehouse_id 
FROM inv_items 
WHERE tenant_id = 1 AND warehouse_id = 1 AND deleted_at IS NULL;
