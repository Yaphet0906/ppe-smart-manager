USE ppe_smart_manager;
ALTER TABLE ppe_items 
ADD COLUMN brand VARCHAR(100) COMMENT '品牌' AFTER name,
ADD COLUMN model VARCHAR(100) COMMENT '型号' AFTER brand;
