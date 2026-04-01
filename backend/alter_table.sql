-- 添加 brand 和 model 字段到 ppe_items 表
ALTER TABLE ppe_items 
ADD COLUMN brand VARCHAR(100) COMMENT '品牌' AFTER name,
ADD COLUMN model VARCHAR(100) COMMENT '型号' AFTER brand;

-- 添加 warehouse_id 字段到 inbound_records 表
ALTER TABLE inbound_records 
ADD COLUMN warehouse_id INT COMMENT '仓库ID' AFTER company_id;
