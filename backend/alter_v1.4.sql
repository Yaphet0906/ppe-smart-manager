USE ppe_smart_manager;

-- =============================================================================
-- v1.4 数据库升级脚本 - 尺码管理
-- =============================================================================

-- 1. 添加尺码字段
ALTER TABLE inv_items ADD COLUMN size VARCHAR(20) COMMENT '尺码/规格' AFTER model;

-- 2. 创建尺码配置表（用于前端下拉选择）
CREATE TABLE IF NOT EXISTS sys_size_config (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(50) NOT NULL COMMENT '类别编码',
    size_value VARCHAR(20) NOT NULL COMMENT '尺码值',
    sort_order INT DEFAULT 0 COMMENT '排序',
    UNIQUE KEY uk_category_size (category_code, size_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 清空并初始化尺码配置
TRUNCATE TABLE sys_size_config;

-- 安全鞋尺码
INSERT INTO sys_size_config (category_code, size_value, sort_order) VALUES
('safety_shoes', '36码', 1),
('safety_shoes', '37码', 2),
('safety_shoes', '38码', 3),
('safety_shoes', '39码', 4),
('safety_shoes', '40码', 5),
('safety_shoes', '41码', 6),
('safety_shoes', '42码', 7),
('safety_shoes', '43码', 8),
('safety_shoes', '44码', 9),
('safety_shoes', '45码', 10),
('safety_shoes', '46码', 11);

-- 工作服尺码
INSERT INTO sys_size_config (category_code, size_value, sort_order) VALUES
('work_clothes', 'S', 1),
('work_clothes', 'M', 2),
('work_clothes', 'L', 3),
('work_clothes', 'XL', 4),
('work_clothes', 'XXL', 5),
('work_clothes', 'XXXL', 6);

-- 手套尺码
INSERT INTO sys_size_config (category_code, size_value, sort_order) VALUES
('gloves', 'S', 1),
('gloves', 'M', 2),
('gloves', 'L', 3),
('gloves', 'XL', 4);

-- 安全帽尺码
INSERT INTO sys_size_config (category_code, size_value, sort_order) VALUES
('helmet', '52-56cm', 1),
('helmet', '57-62cm', 2);

-- 口罩
INSERT INTO sys_size_config (category_code, size_value, sort_order) VALUES
('mask', '均码', 1);

-- 4. 迁移现有数据（如果有 model 字段且是尺码格式）
-- 注意：这里假设 model 字段可能存储了尺码信息
UPDATE inv_items SET size = model 
WHERE model REGEXP '^[0-9]+码$' OR model IN ('S', 'M', 'L', 'XL', 'XXL', 'XXXL', '52-56cm', '57-62cm', '均码');

-- 5. 查看升级结果
SELECT '=== v1.4 数据库升级完成 ===' as message;
SELECT '尺码字段已添加' as info;
SELECT CONCAT('已配置 ', COUNT(*), ' 条尺码选项') as info FROM sys_size_config;
SELECT CONCAT('已有 ', COUNT(*), ' 条物品设置了尺码') as info FROM inv_items WHERE size IS NOT NULL;
