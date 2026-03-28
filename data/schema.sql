-- =====================================================
-- PPE智能管理系统 - 数据库Schema
-- PPE Smart Management System Database Schema
-- 版本: 1.0.0
-- 创建日期: 2024
-- =====================================================

-- 设置字符集和存储引擎
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS ppe_smart_manager
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE ppe_smart_manager;

-- =====================================================
-- 1. 用户表 (users)
-- 存储系统用户信息，包括管理员、员工和老板
-- =====================================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID，主键自增',
    `name` VARCHAR(100) NOT NULL COMMENT '用户姓名',
    `phone` VARCHAR(20) NOT NULL COMMENT '联系电话，唯一',
    `department` VARCHAR(100) DEFAULT NULL COMMENT '所属部门',
    `role` ENUM('admin', 'employee', 'boss') NOT NULL DEFAULT 'employee' COMMENT '用户角色：admin-管理员, employee-员工, boss-老板',
    `password_hash` VARCHAR(255) DEFAULT NULL COMMENT '密码哈希（可选，用于系统登录）',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用, 1-启用',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_phone` (`phone`),
    KEY `idx_role` (`role`),
    KEY `idx_department` (`department`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表 - 存储系统用户信息';

-- =====================================================
-- 2. PPE物品表 (ppe_items)
-- 存储劳保用品的基础信息和库存信息
-- =====================================================
DROP TABLE IF EXISTS `ppe_items`;
CREATE TABLE `ppe_items` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '物品ID，主键自增',
    `name` VARCHAR(100) NOT NULL COMMENT '物品名称，如：安全帽、防护手套',
    `brand` VARCHAR(100) DEFAULT NULL COMMENT '品牌，如：3M、霍尼韦尔',
    `size` VARCHAR(50) DEFAULT NULL COMMENT '规格/尺码，如：L、XL、42码',
    `model` VARCHAR(100) DEFAULT NULL COMMENT '型号',
    `unit` VARCHAR(20) NOT NULL DEFAULT '个' COMMENT '计量单位：个/双/件/副/套等',
    `stock_quantity` INT NOT NULL DEFAULT 0 COMMENT '当前库存数量',
    `safety_stock` INT NOT NULL DEFAULT 10 COMMENT '安全库存阈值，低于此值触发预警',
    `location` VARCHAR(100) DEFAULT NULL COMMENT '库位信息，如：A区-01架-02层',
    `production_date` DATE DEFAULT NULL COMMENT '生产日期',
    `expiry_date` DATE DEFAULT NULL COMMENT '有效期/过期日期',
    `shelf_life_months` INT DEFAULT NULL COMMENT '保质期（月）',
    `la_cert_no` VARCHAR(100) DEFAULT NULL COMMENT 'LA认证编号（特种劳动防护用品安全标志）',
    `la_cert_image` VARCHAR(500) DEFAULT NULL COMMENT 'LA标志图片URL',
    `la_cert_expiry` DATE DEFAULT NULL COMMENT 'LA证书有效期',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-停用, 1-启用',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_name` (`name`),
    KEY `idx_brand` (`brand`),
    KEY `idx_expiry_date` (`expiry_date`),
    KEY `idx_la_cert_no` (`la_cert_no`),
    KEY `idx_stock_quantity` (`stock_quantity`),
    KEY `idx_location` (`location`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PPE物品表 - 存储劳保用品基础信息和库存';

-- =====================================================
-- 3. 入库记录表 (inbound_records)
-- 存储PPE物品入库的主记录信息
-- =====================================================
DROP TABLE IF EXISTS `inbound_records`;
CREATE TABLE `inbound_records` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '入库记录ID，主键自增',
    `operator_id` INT UNSIGNED NOT NULL COMMENT '操作员ID，关联users表',
    `source_type` ENUM('ocr', 'scan', 'manual') NOT NULL DEFAULT 'manual' COMMENT '入库方式：ocr-OCR识别, scan-扫码, manual-手动录入',
    `total_items` INT NOT NULL DEFAULT 0 COMMENT '本次入库的物品种类数',
    `total_quantity` INT NOT NULL DEFAULT 0 COMMENT '本次入库的总数量',
    `notes` TEXT DEFAULT NULL COMMENT '备注信息',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_operator_id` (`operator_id`),
    KEY `idx_source_type` (`source_type`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='入库记录表 - 存储PPE物品入库主记录';

-- =====================================================
-- 4. 入库明细表 (inbound_items)
-- 存储每次入库的具体物品明细
-- =====================================================
DROP TABLE IF EXISTS `inbound_items`;
CREATE TABLE `inbound_items` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '入库明细ID，主键自增',
    `inbound_id` INT UNSIGNED NOT NULL COMMENT '入库记录ID，关联inbound_records表',
    `ppe_item_id` INT UNSIGNED NOT NULL COMMENT 'PPE物品ID，关联ppe_items表',
    `quantity` INT NOT NULL DEFAULT 0 COMMENT '入库数量',
    `production_date` DATE DEFAULT NULL COMMENT '生产日期（本次入库批次）',
    `expiry_date` DATE DEFAULT NULL COMMENT '有效期（本次入库批次）',
    `la_cert_no` VARCHAR(100) DEFAULT NULL COMMENT 'LA认证编号（本次入库批次）',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_inbound_id` (`inbound_id`),
    KEY `idx_ppe_item_id` (`ppe_item_id`),
    KEY `idx_expiry_date` (`expiry_date`),
    KEY `idx_created_at` (`created_at`),
    -- 外键约束
    CONSTRAINT `fk_inbound_items_inbound` FOREIGN KEY (`inbound_id`) REFERENCES `inbound_records` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_inbound_items_ppe` FOREIGN KEY (`ppe_item_id`) REFERENCES `ppe_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='入库明细表 - 存储入库物品详细信息';

-- =====================================================
-- 5. 领取记录表 (outbound_records)
-- 存储PPE物品领取/出库的主记录信息
-- =====================================================
DROP TABLE IF EXISTS `outbound_records`;
CREATE TABLE `outbound_records` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '出库记录ID，主键自增',
    `employee_id` INT UNSIGNED NOT NULL COMMENT '领取员工ID，关联users表',
    `operator_id` INT UNSIGNED NOT NULL COMMENT '操作员ID，关联users表',
    `source_type` ENUM('voice', 'manual') NOT NULL DEFAULT 'manual' COMMENT '领取方式：voice-语音, manual-手动',
    `total_items` INT NOT NULL DEFAULT 0 COMMENT '本次领取的物品种类数',
    `total_quantity` INT NOT NULL DEFAULT 0 COMMENT '本次领取的总数量',
    `notes` TEXT DEFAULT NULL COMMENT '备注信息',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_employee_id` (`employee_id`),
    KEY `idx_operator_id` (`operator_id`),
    KEY `idx_source_type` (`source_type`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='领取记录表 - 存储PPE物品领取主记录';

-- =====================================================
-- 6. 出库明细表 (outbound_items)
-- 存储每次领取/出库的具体物品明细
-- =====================================================
DROP TABLE IF EXISTS `outbound_items`;
CREATE TABLE `outbound_items` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '出库明细ID，主键自增',
    `outbound_id` INT UNSIGNED NOT NULL COMMENT '出库记录ID，关联outbound_records表',
    `ppe_item_id` INT UNSIGNED NOT NULL COMMENT 'PPE物品ID，关联ppe_items表',
    `quantity` INT NOT NULL DEFAULT 0 COMMENT '领取数量',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_outbound_id` (`outbound_id`),
    KEY `idx_ppe_item_id` (`ppe_item_id`),
    KEY `idx_created_at` (`created_at`),
    -- 外键约束
    CONSTRAINT `fk_outbound_items_outbound` FOREIGN KEY (`outbound_id`) REFERENCES `outbound_records` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_outbound_items_ppe` FOREIGN KEY (`ppe_item_id`) REFERENCES `ppe_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出库明细表 - 存储领取物品详细信息';

-- =====================================================
-- 添加外键约束（inbound_records和outbound_records的外键）
-- 需要在users表创建后添加
-- =====================================================

-- 入库记录表外键
ALTER TABLE `inbound_records`
    ADD CONSTRAINT `fk_inbound_operator` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- 领取记录表外键
ALTER TABLE `outbound_records`
    ADD CONSTRAINT `fk_outbound_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_outbound_operator` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================
-- 创建触发器：自动更新ppe_items库存数量
-- =====================================================

DELIMITER //

-- 入库触发器：增加库存
CREATE TRIGGER `trg_after_inbound_insert`
AFTER INSERT ON `inbound_items`
FOR EACH ROW
BEGIN
    UPDATE `ppe_items`
    SET `stock_quantity` = `stock_quantity` + NEW.quantity,
        `updated_at` = NOW()
    WHERE `id` = NEW.ppe_item_id;
END//

-- 出库触发器：减少库存
CREATE TRIGGER `trg_after_outbound_insert`
AFTER INSERT ON `outbound_items`
FOR EACH ROW
BEGIN
    UPDATE `ppe_items`
    SET `stock_quantity` = `stock_quantity` - NEW.quantity,
        `updated_at` = NOW()
    WHERE `id` = NEW.ppe_item_id;
END//

DELIMITER ;

-- =====================================================
-- 创建视图：库存预警视图
-- =====================================================
CREATE OR REPLACE VIEW `v_stock_alert` AS
SELECT 
    `id`,
    `name`,
    `brand`,
    `size`,
    `stock_quantity`,
    `safety_stock`,
    (`stock_quantity` - `safety_stock`) AS `stock_diff`,
    `location`,
    CASE 
        WHEN `stock_quantity` = 0 THEN '缺货'
        WHEN `stock_quantity` < `safety_stock` THEN '库存不足'
        ELSE '正常'
    END AS `alert_level`
FROM `ppe_items`
WHERE `stock_quantity` < `safety_stock`
ORDER BY `stock_quantity` ASC;

-- =====================================================
-- 创建视图：即将过期物品视图
-- =====================================================
CREATE OR REPLACE VIEW `v_expiry_alert` AS
SELECT 
    `id`,
    `name`,
    `brand`,
    `expiry_date`,
    `stock_quantity`,
    DATEDIFF(`expiry_date`, CURDATE()) AS `days_until_expiry`,
    CASE 
        WHEN `expiry_date` < CURDATE() THEN '已过期'
        WHEN DATEDIFF(`expiry_date`, CURDATE()) <= 30 THEN '即将过期'
        ELSE '正常'
    END AS `expiry_status`
FROM `ppe_items`
WHERE `expiry_date` IS NOT NULL
  AND (`expiry_date` < DATE_ADD(CURDATE(), INTERVAL 30 DAY) OR `expiry_date` < CURDATE())
ORDER BY `expiry_date` ASC;

-- =====================================================
-- 示例数据插入
-- =====================================================

-- 1. 插入用户数据
INSERT INTO `users` (`name`, `phone`, `department`, `role`, `status`) VALUES
('系统管理员', '13800138000', '信息技术部', 'admin', 1),
('张经理', '13800138001', '安全管理部', 'boss', 1),
('李安全员', '13800138002', '安全管理部', 'admin', 1),
('王工人', '13800138003', '生产一部', 'employee', 1),
('赵工人', '13800138004', '生产一部', 'employee', 1),
('刘工人', '13800138005', '生产二部', 'employee', 1),
('陈工人', '13800138006', '生产二部', 'employee', 1),
('杨质检', '13800138007', '质量检验部', 'employee', 1);

-- 2. 插入PPE物品数据
INSERT INTO `ppe_items` (`name`, `brand`, `size`, `model`, `unit`, `stock_quantity`, `safety_stock`, `location`, `production_date`, `expiry_date`, `shelf_life_months`, `la_cert_no`, `la_cert_expiry`) VALUES
('安全帽', '3M', '均码', 'H-700', '个', 50, 20, 'A区-01架-01层', '2024-01-15', '2027-01-14', 36, 'LA-2024-001', '2026-12-31'),
('防护手套', '霍尼韦尔', 'L', '2094141', '双', 100, 30, 'A区-01架-02层', '2024-02-01', '2026-02-01', 24, 'LA-2024-002', '2025-12-31'),
('防护手套', '霍尼韦尔', 'XL', '2094141', '双', 80, 30, 'A区-01架-02层', '2024-02-01', '2026-02-01', 24, 'LA-2024-002', '2025-12-31'),
('防尘口罩', '3M', '均码', '9501V', '个', 200, 50, 'A区-02架-01层', '2024-03-01', '2027-03-01', 36, 'LA-2024-003', '2026-12-31'),
('防护眼镜', '代尔塔', '均码', '101104', '副', 60, 20, 'A区-02架-02层', '2024-01-20', '2026-01-20', 24, 'LA-2024-004', '2025-12-31'),
('安全鞋', '赛固', '42', 'SG-801', '双', 40, 15, 'B区-01架-01层', '2024-01-10', '2027-01-10', 36, 'LA-2024-005', '2026-12-31'),
('安全鞋', '赛固', '43', 'SG-801', '双', 35, 15, 'B区-01架-01层', '2024-01-10', '2027-01-10', 36, 'LA-2024-005', '2026-12-31'),
('防护服', '杜邦', 'L', 'Tyvek-400', '件', 25, 10, 'B区-02架-01层', '2024-02-15', '2029-02-15', 60, 'LA-2024-006', '2028-12-31'),
('耳塞', '3M', '均码', '1250', '副', 500, 100, 'A区-03架-01层', '2024-03-10', '2026-03-10', 24, 'LA-2024-007', '2025-12-31'),
('防护面罩', '3M', '均码', '6800', '个', 15, 5, 'A区-02架-03层', '2024-01-05', '2027-01-05', 36, 'LA-2024-008', '2026-12-31');

-- 3. 插入入库记录
INSERT INTO `inbound_records` (`operator_id`, `source_type`, `total_items`, `total_quantity`, `notes`) VALUES
(1, 'manual', 3, 150, '2024年3月首批采购入库'),
(2, 'scan', 2, 80, '扫码快速入库'),
(3, 'ocr', 4, 200, 'OCR识别入库');

-- 4. 插入入库明细
INSERT INTO `inbound_items` (`inbound_id`, `ppe_item_id`, `quantity`, `production_date`, `expiry_date`, `la_cert_no`) VALUES
(1, 1, 50, '2024-01-15', '2027-01-14', 'LA-2024-001'),
(1, 2, 60, '2024-02-01', '2026-02-01', 'LA-2024-002'),
(1, 4, 40, '2024-03-01', '2027-03-01', 'LA-2024-003'),
(2, 3, 40, '2024-02-01', '2026-02-01', 'LA-2024-002'),
(2, 5, 40, '2024-01-20', '2026-01-20', 'LA-2024-004'),
(3, 6, 20, '2024-01-10', '2027-01-10', 'LA-2024-005'),
(3, 7, 20, '2024-01-10', '2027-01-10', 'LA-2024-005'),
(3, 8, 15, '2024-02-15', '2029-02-15', 'LA-2024-006'),
(3, 9, 100, '2024-03-10', '2026-03-10', 'LA-2024-007');

-- 5. 插入领取记录
INSERT INTO `outbound_records` (`employee_id`, `operator_id`, `source_type`, `total_items`, `total_quantity`, `notes`) VALUES
(4, 2, 'manual', 2, 3, '新员工入职领取'),
(5, 2, 'voice', 1, 2, '语音领取'),
(6, 3, 'manual', 3, 5, '季度更换'),
(7, 3, 'manual', 2, 4, '正常领取');

-- 6. 插入出库明细
INSERT INTO `outbound_items` (`outbound_id`, `ppe_item_id`, `quantity`) VALUES
(1, 1, 1),
(1, 2, 2),
(2, 4, 2),
(3, 1, 1),
(3, 2, 2),
(3, 6, 2),
(4, 3, 2),
(4, 5, 2);

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- Schema创建完成
-- =====================================================
SELECT 'PPE智能管理系统数据库Schema创建成功！' AS `message`;
