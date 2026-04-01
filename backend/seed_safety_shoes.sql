USE ppe_smart_manager;

-- 获取测试工厂的 tenant_id
SET @tenant_id = 1;

-- 插入安全鞋物品
INSERT INTO inv_items (tenant_id, name, brand, model, unit, quantity, category_code, safety_stock) 
VALUES (@tenant_id, '安全鞋', '霍尼韦尔', 'SH-001', '双', 20, 'foot_protection', 5);

SET @item_id = LAST_INSERT_ID();

-- 插入入库记录（昨天）
INSERT INTO inv_inbound (tenant_id, item_id, quantity, supplier, remarks, operator_id, created_at) 
VALUES (@tenant_id, @item_id, 20, '霍尼韦尔官方', '首批采购入库', 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY));

SELECT '安全鞋库存已创建' as result;
