-- =============================================================================
-- PPE Smart Manager - 完整数据库结构 (精简版)
-- 作者: 数据库架构师
-- 版本: 1.0
-- 日期: 2026-03-28
-- 说明: 小工具定位，无成本模块，高扩展性设计
-- =============================================================================

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- 核心模块表
-- =============================================================================

-- 租户表 (core_tenants)
CREATE TABLE IF NOT EXISTS core_tenants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(32) UNIQUE COMMENT '公司代码',
    name VARCHAR(100) NOT NULL COMMENT '公司名称',
    contact_name VARCHAR(50) COMMENT '联系人姓名',
    contact_phone VARCHAR(20) COMMENT '联系电话',
    status TINYINT DEFAULT 1 COMMENT '状态: 0禁用 1启用',
    
    -- 扩展配置
    config JSON COMMENT '扩展配置',
    
    -- 预留字段（10个）
    ext_1 VARCHAR(100) COMMENT '扩展字段1',
    ext_2 VARCHAR(100) COMMENT '扩展字段2', 
    ext_3 VARCHAR(100) COMMENT '扩展字段3',
    ext_4 VARCHAR(100) COMMENT '扩展字段4',
    ext_5 VARCHAR(100) COMMENT '扩展字段5',
    ext_6 VARCHAR(100) COMMENT '扩展字段6',
    ext_7 VARCHAR(100) COMMENT '扩展字段7',
    ext_8 VARCHAR(100) COMMENT '扩展字段8',
    ext_9 VARCHAR(100) COMMENT '扩展字段9',
    ext_10 TEXT COMMENT '扩展字段10',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_by BIGINT UNSIGNED COMMENT '创建人ID',
    updated_by BIGINT UNSIGNED COMMENT '更新人ID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户表 (core_users)
CREATE TABLE IF NOT EXISTS core_users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
    
    -- 基础信息
    employee_no VARCHAR(50) COMMENT '工号',
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    phone VARCHAR(20) COMMENT '手机号',
    email VARCHAR(100) COMMENT '邮箱',
    password VARCHAR(255) COMMENT '密码',
    department VARCHAR(50) COMMENT '部门',
    position VARCHAR(50) COMMENT '职位',
    role VARCHAR(20) DEFAULT 'user' COMMENT '角色: admin/user/viewer',
    
    -- 扩展信息（预留）
    id_card VARCHAR(18) COMMENT '身份证号',
    gender VARCHAR(10) COMMENT '性别',
    birthday DATE COMMENT '生日',
    entry_date DATE COMMENT '入职日期',
    job_type VARCHAR(50) COMMENT '工种',
    work_area VARCHAR(100) COMMENT '工作区域',
    
    -- 状态管理
    status TINYINT DEFAULT 1 COMMENT '状态: 0禁用 1启用',
    is_first_login TINYINT DEFAULT 1 COMMENT '是否首次登录: 0否 1是',
    last_login_at TIMESTAMP COMMENT '最后登录时间',
    
    -- 预留字段（10个）
    ext_1 VARCHAR(100) COMMENT '扩展字段1',
    ext_2 VARCHAR(100) COMMENT '扩展字段2',
    ext_3 VARCHAR(100) COMMENT '扩展字段3',
    ext_4 VARCHAR(100) COMMENT '扩展字段4',
    ext_5 VARCHAR(100) COMMENT '扩展字段5',
    ext_6 VARCHAR(100) COMMENT '扩展字段6',
    ext_7 VARCHAR(100) COMMENT '扩展字段7',
    ext_8 VARCHAR(100) COMMENT '扩展字段8',
    ext_9 VARCHAR(100) COMMENT '扩展字段9',
    ext_10 TEXT COMMENT '扩展字段10',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 系统配置模块
-- =============================================================================

-- 数据字典表 (sys_dicts)
CREATE TABLE IF NOT EXISTS sys_dicts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED DEFAULT 0 COMMENT '租户ID: 0表示系统级',
    dict_type VARCHAR(50) NOT NULL COMMENT '字典类型',
    dict_code VARCHAR(50) NOT NULL COMMENT '字典编码',
    dict_name VARCHAR(100) NOT NULL COMMENT '字典名称',
    parent_id BIGINT UNSIGNED DEFAULT 0 COMMENT '上级ID',
    sort_order INT DEFAULT 0 COMMENT '排序权重',
    status TINYINT DEFAULT 1 COMMENT '状态: 0禁用 1启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_dict (tenant_id, dict_type, dict_code),
    INDEX idx_type (dict_type, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 库存管理模块
-- =============================================================================

-- 仓库表 (inv_warehouses)
CREATE TABLE IF NOT EXISTS inv_warehouses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
    code VARCHAR(50) COMMENT '仓库代码',
    name VARCHAR(100) NOT NULL COMMENT '仓库名称',
    type VARCHAR(20) DEFAULT 'room' COMMENT '类型: room/cabinet/shelf',
    location VARCHAR(200) COMMENT '位置描述',
    building VARCHAR(50) COMMENT '楼栋',
    floor VARCHAR(20) COMMENT '楼层',
    room_no VARCHAR(50) COMMENT '房间号',
    manager_name VARCHAR(50) COMMENT '负责人姓名',
    manager_phone VARCHAR(20) COMMENT '负责人电话',
    qr_code VARCHAR(500) COMMENT '仓库二维码',
    status TINYINT DEFAULT 1 COMMENT '状态: 0禁用 1启用',
    
    -- 预留字段（10个）
    ext_1 VARCHAR(100) COMMENT '扩展字段1',
    ext_2 VARCHAR(100) COMMENT '扩展字段2',
    ext_3 VARCHAR(100) COMMENT '扩展字段3',
    ext_4 VARCHAR(100) COMMENT '扩展字段4',
    ext_5 VARCHAR(100) COMMENT '扩展字段5',
    ext_6 VARCHAR(100) COMMENT '扩展字段6',
    ext_7 VARCHAR(100) COMMENT '扩展字段7',
    ext_8 VARCHAR(100) COMMENT '扩展字段8',
    ext_9 VARCHAR(100) COMMENT '扩展字段9',
    ext_10 TEXT COMMENT '扩展字段10',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 劳保用品表 (inv_items)
CREATE TABLE IF NOT EXISTS inv_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
    warehouse_id BIGINT UNSIGNED COMMENT '仓库ID',
    category_code VARCHAR(50) COMMENT '分类编码',
    code VARCHAR(50) COMMENT '物品编码',
    name VARCHAR(100) NOT NULL COMMENT '物品名称',
    specification VARCHAR(200) COMMENT '规格型号',
    brand VARCHAR(50) COMMENT '品牌',
    model VARCHAR(50) COMMENT '型号',
    unit VARCHAR(20) COMMENT '单位',
    
    -- 库存管理
    quantity INT DEFAULT 0 COMMENT '当前库存',
    safety_stock INT DEFAULT 0 COMMENT '安全库存',
    max_stock INT DEFAULT 0 COMMENT '最大库存',
    
    -- 预警设置
    alert_enabled TINYINT DEFAULT 1 COMMENT '预警启用: 0禁用 1启用',
    alert_threshold INT DEFAULT 0 COMMENT '预警阈值',
    
    -- 员工领用限制
    employee_limit_enabled TINYINT DEFAULT 0 COMMENT '员工限制启用: 0禁用 1启用',
    employee_limit_qty INT DEFAULT 0 COMMENT '员工限制数量',
    employee_limit_period VARCHAR(20) COMMENT '限制周期: month/quarter/year',
    
    -- 图片
    image_url VARCHAR(500) COMMENT '图片URL',
    
    -- 状态
    status TINYINT DEFAULT 1 COMMENT '状态: 0停用 1启用',
    remark TEXT COMMENT '备注',
    
    -- 预留字段（10个）
    ext_1 VARCHAR(100) COMMENT '扩展字段1',
    ext_2 VARCHAR(100) COMMENT '扩展字段2',
    ext_3 VARCHAR(100) COMMENT '扩展字段3',
    ext_4 VARCHAR(100) COMMENT '扩展字段4',
    ext_5 VARCHAR(100) COMMENT '扩展字段5',
    ext_6 VARCHAR(100) COMMENT '扩展字段6',
    ext_7 VARCHAR(100) COMMENT '扩展字段7',
    ext_8 VARCHAR(100) COMMENT '扩展字段8',
    ext_9 VARCHAR(100) COMMENT '扩展字段9',
    ext_10 TEXT COMMENT '扩展字段10',
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 库存流水表 (inv_transactions)
CREATE TABLE IF NOT EXISTS inv_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
    warehouse_id BIGINT UNSIGNED COMMENT '仓库ID',
    item_id BIGINT UNSIGNED NOT NULL COMMENT '物品ID',
    
    -- 交易类型
    type VARCHAR(20) COMMENT '类型: inbound/outbound/adjust',
    subtype VARCHAR(50) COMMENT '子类型',
    
    -- 数量
    quantity INT NOT NULL COMMENT '变动数量',
    before_qty INT COMMENT '变动前数量',
    after_qty INT COMMENT '变动后数量',
    
    -- 关联单据
    source_id BIGINT UNSIGNED COMMENT '来源ID',
    source_no VARCHAR(100) COMMENT '来源单号',
    
    -- 操作信息
    operator_id BIGINT UNSIGNED COMMENT '操作人ID',
    operator_name VARCHAR(50) COMMENT '操作人姓名',
    operated_at TIMESTAMP COMMENT '操作时间',
    
    -- 备注
    remark TEXT COMMENT '备注',
    attachments JSON COMMENT '附件',
    
    -- 预留字段（10个）
    ext_1 VARCHAR(100) COMMENT '扩展字段1',
    ext_2 VARCHAR(100) COMMENT '扩展字段2',
    ext_3 VARCHAR(100) COMMENT '扩展字段3',
    ext_4 VARCHAR(100) COMMENT '扩展字段4',
    ext_5 VARCHAR(100) COMMENT '扩展字段5',
    ext_6 VARCHAR(100) COMMENT '扩展字段6',
    ext_7 VARCHAR(100) COMMENT '扩展字段7',
    ext_8 VARCHAR(100) COMMENT '扩展字段8',
    ext_9 VARCHAR(100) COMMENT '扩展字段9',
    ext_10 TEXT COMMENT '扩展字段10',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 入库记录表 (inv_inbound)
CREATE TABLE IF NOT EXISTS inv_inbound (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
    warehouse_id BIGINT UNSIGNED COMMENT '仓库ID',
    transaction_id BIGINT UNSIGNED COMMENT '交易ID',
    item_id BIGINT UNSIGNED COMMENT '物品ID',
    quantity INT COMMENT '入库数量',
    
    -- 入库方式
    source_type VARCHAR(20) COMMENT '来源类型: ocr/manual',
    
    -- OCR相关
    ocr_image_url VARCHAR(500) COMMENT 'OCR图片URL',
    ocr_raw_text TEXT COMMENT 'OCR原始文本',
    ocr_confidence DECIMAL(5,2) COMMENT 'OCR置信度',
    
    -- 操作人
    operator_id BIGINT UNSIGNED COMMENT '操作人ID',
    operator_name VARCHAR(50) COMMENT '操作人姓名',
    inbound_date DATE COMMENT '入库日期',
    
    -- 备注
    remark TEXT COMMENT '备注',
    
    -- 预留字段（10个）
    ext_1 VARCHAR(100) COMMENT '扩展字段1',
    ext_2 VARCHAR(100) COMMENT '扩展字段2',
    ext_3 VARCHAR(100) COMMENT '扩展字段3',
    ext_4 VARCHAR(100) COMMENT '扩展字段4',
    ext_5 VARCHAR(100) COMMENT '扩展字段5',
    ext_6 VARCHAR(100) COMMENT '扩展字段6',
    ext_7 VARCHAR(100) COMMENT '扩展字段7',
    ext_8 VARCHAR(100) COMMENT '扩展字段8',
    ext_9 VARCHAR(100) COMMENT '扩展字段9',
    ext_10 TEXT COMMENT '扩展字段10',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 出库记录表 (inv_outbound)
CREATE TABLE IF NOT EXISTS inv_outbound (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL COMMENT '租户ID',
    warehouse_id BIGINT UNSIGNED COMMENT '仓库ID',
    transaction_id BIGINT UNSIGNED COMMENT '交易ID',
    item_id BIGINT UNSIGNED COMMENT '物品ID',
    quantity INT COMMENT '出库数量',
    
    -- 领用人信息
    employee_id BIGINT UNSIGNED COMMENT '员工ID',
    employee_name VARCHAR(50) COMMENT '员工姓名',
    employee_phone VARCHAR(20) COMMENT '员工手机号',
    employee_department VARCHAR(50) COMMENT '员工部门',
    
    -- 领用方式
    source_type VARCHAR(20) COMMENT '来源类型: scan/web/manual',
    qr_code VARCHAR(500) COMMENT '二维码',
    
    -- 用途
    purpose VARCHAR(200) COMMENT '用途',
    work_area VARCHAR(100) COMMENT '工作区域',
    
    -- 审批（预留）
    approval_status TINYINT DEFAULT 1 COMMENT '审批状态: 0待审 1通过 2拒绝',
    
    -- 操作人
    operator_id BIGINT UNSIGNED COMMENT '操作人ID',
    operator_name VARCHAR(50) COMMENT '操作人姓名',
    outbound_date DATE COMMENT '出库日期',
    
    -- 备注
    remark TEXT COMMENT '备注',
    
    -- 预留字段（10个）
    ext_1 VARCHAR(100) COMMENT '扩展字段1',
    ext_2 VARCHAR(100) COMMENT '扩展字段2',
    ext_3 VARCHAR(100) COMMENT '扩展字段3',
    ext_4 VARCHAR(100) COMMENT '扩展字段4',
    ext_5 VARCHAR(100) COMMENT '扩展字段5',
    ext_6 VARCHAR(100) COMMENT '扩展字段6',
    ext_7 VARCHAR(100) COMMENT '扩展字段7',
    ext_8 VARCHAR(100) COMMENT '扩展字段8',
    ext_9 VARCHAR(100) COMMENT '扩展字段9',
    ext_10 TEXT COMMENT '扩展字段10',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 索引优化
-- =============================================================================

-- 租户表索引
CREATE UNIQUE INDEX uk_tenants_code ON core_tenants(code);
CREATE INDEX idx_tenants_status ON core_tenants(status);

-- 用户表索引
CREATE UNIQUE INDEX uk_users_tenant_phone ON core_users(tenant_id, phone);
CREATE INDEX idx_users_employee_no ON core_users(tenant_id, employee_no);
CREATE INDEX idx_users_department ON core_users(tenant_id, department);

-- 仓库表索引
CREATE INDEX idx_warehouses_tenant ON inv_warehouses(tenant_id, status);

-- 劳保用品表索引
CREATE INDEX idx_items_tenant_warehouse ON inv_items(tenant_id, warehouse_id, status);
CREATE INDEX idx_items_category ON inv_items(tenant_id, category_code);
CREATE INDEX idx_items_code ON inv_items(tenant_id, code);

-- 库存流水表索引
CREATE INDEX idx_transactions_item_time ON inv_transactions(tenant_id, item_id, created_at DESC);
CREATE INDEX idx_transactions_type_time ON inv_transactions(tenant_id, type, created_at DESC);
CREATE INDEX idx_transactions_warehouse ON inv_transactions(tenant_id, warehouse_id, created_at DESC);

-- 入库记录表索引
CREATE INDEX idx_inbound_tenant_warehouse ON inv_inbound(tenant_id, warehouse_id, inbound_date DESC);
CREATE INDEX idx_inbound_operator ON inv_inbound(tenant_id, operator_id, inbound_date DESC);

-- 出库记录表索引
CREATE INDEX idx_outbound_employee ON inv_outbound(tenant_id, employee_phone, outbound_date DESC);
CREATE INDEX idx_outbound_warehouse ON inv_outbound(tenant_id, warehouse_id, outbound_date DESC);
CREATE INDEX idx_outbound_item ON inv_outbound(tenant_id, item_id, outbound_date DESC);

-- =============================================================================
-- 视图定义
-- =============================================================================

-- 库存实时视图
CREATE OR REPLACE VIEW vw_inventory_current AS
SELECT 
    i.id AS item_id,
    i.tenant_id,
    i.code AS item_code,
    i.name AS item_name,
    i.category_code,
    d.dict_name AS category_name,
    i.specification,
    i.unit,
    w.id AS warehouse_id,
    w.code AS warehouse_code,
    w.name AS warehouse_name,
    COALESCE(SUM(CASE 
        WHEN t.type = 'inbound' THEN t.quantity 
        WHEN t.type = 'outbound' THEN -t.quantity 
        ELSE 0 
    END), 0) AS current_qty,
    i.safety_stock,
    i.max_stock,
    CASE 
        WHEN COALESCE(SUM(CASE 
            WHEN t.type = 'inbound' THEN t.quantity 
            WHEN t.type = 'outbound' THEN -t.quantity 
            ELSE 0 
        END), 0) <= i.safety_stock THEN 'low'
        ELSE 'normal'
    END AS stock_status,
    i.status AS item_status
FROM inv_items i
LEFT JOIN inv_warehouses w ON i.warehouse_id = w.id
LEFT JOIN sys_dicts d ON i.category_code = d.dict_code 
    AND d.dict_type = 'item_category' 
    AND d.tenant_id = i.tenant_id
LEFT JOIN inv_transactions t ON i.id = t.item_id AND t.deleted_at IS NULL
WHERE i.deleted_at IS NULL
GROUP BY i.id, w.id;

-- 员工领用统计视图
CREATE OR REPLACE VIEW vw_employee_usage AS
SELECT 
    o.tenant_id,
    o.employee_id,
    o.employee_name,
    o.employee_phone,
    o.employee_department,
    i.id AS item_id,
    i.name AS item_name,
    d.dict_name AS category_name,
    i.unit,
    SUM(o.quantity) AS total_qty,
    COUNT(*) AS total_times,
    MIN(o.outbound_date) AS first_date,
    MAX(o.outbound_date) AS last_date
FROM inv_outbound o
JOIN inv_items i ON o.item_id = i.id
LEFT JOIN sys_dicts d ON i.category_code = d.dict_code AND d.dict_type = 'item_category'
WHERE o.deleted_at IS NULL
GROUP BY o.tenant_id, o.employee_id, i.id;

-- =============================================================================
-- 初始数据
-- =============================================================================

-- 数据字典初始化
INSERT IGNORE INTO sys_dicts (dict_type, dict_code, dict_name, sort_order) VALUES
-- 物品分类
('item_category', 'head', '头部防护', 1),
('item_category', 'eye', '眼部防护', 2),
('item_category', 'hand', '手部防护', 3),
('item_category', 'foot', '足部防护', 4),
('item_category', 'body', '身体防护', 5),
('item_category', 'resp', '呼吸防护', 6),

-- 仓库类型
('warehouse_type', 'room', '仓库房间', 1),
('warehouse_type', 'cabinet', '智能柜', 2),
('warehouse_type', 'shelf', '货架区', 3),

-- 用户角色
('user_role', 'admin', '管理员', 1),
('user_role', 'operator', '操作员', 2),
('user_role', 'viewer', '查看员', 3),

-- 入库方式
('inbound_type', 'ocr', '截图识别', 1),
('inbound_type', 'manual', '手工录入', 2),

-- 出库方式
('outbound_type', 'scan', '扫码领用', 1),
('outbound_type', 'web', '网页领用', 2);

-- =============================================================================
-- 权限检查（可选）
-- =============================================================================

-- 检查表是否创建成功
SELECT 'Database schema created successfully!' AS message;

-- 重置外键检查
SET FOREIGN_KEY_CHECKS = 1;