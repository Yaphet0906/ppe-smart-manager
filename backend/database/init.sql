-- PPE智能管理系统 - 数据库初始化脚本
-- 创建数据库和表结构

-- 创建数据库
CREATE DATABASE IF NOT EXISTS ppe_smart_manager 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE ppe_smart_manager;

-- 公司/租户表
CREATE TABLE IF NOT EXISTS companies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL COMMENT '公司名称',
  code VARCHAR(50) NOT NULL COMMENT '公司代码（唯一标识）',
  contact_name VARCHAR(100) COMMENT '联系人姓名',
  contact_phone VARCHAR(20) COMMENT '联系人电话',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_code (code),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公司/租户表';

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL COMMENT '所属公司ID',
  name VARCHAR(100) NOT NULL COMMENT '姓名',
  phone VARCHAR(20) NOT NULL COMMENT '电话',
  password VARCHAR(255) NOT NULL COMMENT '密码',
  role ENUM('admin', 'manager', 'employee') DEFAULT 'employee' COMMENT '角色',
  department VARCHAR(100) COMMENT '部门',
  employee_no VARCHAR(50) COMMENT '工号',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME DEFAULT NULL COMMENT '删除时间（软删除）',
  UNIQUE KEY uk_company_phone (company_id, phone),
  INDEX idx_company_id (company_id),
  INDEX idx_employee_no (employee_no),
  INDEX idx_department (department),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- PPE物品表
CREATE TABLE IF NOT EXISTS ppe_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL COMMENT '所属公司ID',
  name VARCHAR(200) NOT NULL COMMENT '物品名称',
  category VARCHAR(100) DEFAULT '其他' COMMENT '分类',
  specification VARCHAR(500) COMMENT '规格',
  unit VARCHAR(50) DEFAULT '件' COMMENT '单位',
  quantity INT DEFAULT 0 COMMENT '当前库存数量',
  min_stock INT DEFAULT 10 COMMENT '最低库存预警值',
  max_stock INT COMMENT '最高库存限制',
  expiry_date DATE COMMENT '有效期',
  supplier VARCHAR(200) COMMENT '供应商',
  remarks TEXT COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME DEFAULT NULL COMMENT '删除时间（软删除）',
  INDEX idx_company_id (company_id),
  INDEX idx_category (category),
  INDEX idx_name (name),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PPE物品表';

-- 入库记录表
CREATE TABLE IF NOT EXISTS inbound_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL COMMENT '所属公司ID',
  inbound_no VARCHAR(50) NOT NULL COMMENT '入库单号',
  inbound_date DATE NOT NULL COMMENT '入库日期',
  supplier VARCHAR(200) COMMENT '供应商',
  remarks TEXT COMMENT '备注',
  operator_id INT COMMENT '操作人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_company_inbound_no (company_id, inbound_no),
  INDEX idx_company_id (company_id),
  INDEX idx_inbound_date (inbound_date),
  INDEX idx_supplier (supplier),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='入库记录表';

-- 入库明细表
CREATE TABLE IF NOT EXISTS inbound_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inbound_id INT NOT NULL COMMENT '入库记录ID',
  item_id INT NOT NULL COMMENT '物品ID',
  quantity INT NOT NULL COMMENT '入库数量',
  batch_no VARCHAR(100) COMMENT '批次号',
  expiry_date DATE COMMENT '有效期',
  unit_price DECIMAL(10, 2) COMMENT '单价',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_inbound_id (inbound_id),
  INDEX idx_item_id (item_id),
  FOREIGN KEY (inbound_id) REFERENCES inbound_records(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES ppe_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='入库明细表';

-- 出库记录表
CREATE TABLE IF NOT EXISTS outbound_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL COMMENT '所属公司ID',
  outbound_no VARCHAR(50) NOT NULL COMMENT '出库单号',
  outbound_date DATE NOT NULL COMMENT '出库日期',
  employee_id INT COMMENT '领用员工ID',
  employee_name VARCHAR(100) COMMENT '领用人姓名（非系统用户）',
  employee_phone VARCHAR(20) COMMENT '领用人手机号（非系统用户）',
  department VARCHAR(100) COMMENT '部门',
  purpose VARCHAR(500) COMMENT '用途',
  remarks TEXT COMMENT '备注',
  operator_id INT COMMENT '操作人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_company_outbound_no (company_id, outbound_no),
  INDEX idx_company_id (company_id),
  INDEX idx_outbound_date (outbound_date),
  INDEX idx_employee_id (employee_id),
  INDEX idx_employee_phone (employee_phone),
  INDEX idx_department (department),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出库记录表';

-- 出库明细表
CREATE TABLE IF NOT EXISTS outbound_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  outbound_id INT NOT NULL COMMENT '出库记录ID',
  item_id INT NOT NULL COMMENT '物品ID',
  quantity INT NOT NULL COMMENT '出库数量',
  remarks TEXT COMMENT '明细备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_outbound_id (outbound_id),
  INDEX idx_item_id (item_id),
  FOREIGN KEY (outbound_id) REFERENCES outbound_records(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES ppe_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出库明细表';

-- 插入示例公司
INSERT INTO companies (name, code, contact_name, contact_phone, status) VALUES
('示例公司', 'DEMO001', '张三', '13800138000', 'active')
ON DUPLICATE KEY UPDATE name = name;

-- 插入默认管理员用户（密码：admin123）
INSERT INTO users (company_id, name, phone, password, role, department, employee_no) 
SELECT id, '系统管理员', '13800138000', 'admin123', 'admin', '管理部', 'ADMIN001'
FROM companies WHERE code = 'DEMO001'
ON DUPLICATE KEY UPDATE name = name;

-- 插入示例PPE物品数据
INSERT INTO ppe_items (company_id, name, category, specification, unit, quantity, min_stock, supplier, remarks) 
SELECT 
  c.id,
  item.name, item.category, item.specification, item.unit, 
  item.quantity, item.min_stock, item.supplier, item.remarks
FROM companies c
CROSS JOIN (
  SELECT '安全帽' as name, '头部防护' as category, 'ABS材质，白色，可调节' as specification, '顶' as unit, 100 as quantity, 20 as min_stock, '安全用品有限公司' as supplier, '符合GB2811标准' as remarks
  UNION ALL SELECT '防护眼镜', '眼部防护', '防冲击，透明镜片', '副', 50, 10, '安全用品有限公司', '符合GB14866标准'
  UNION ALL SELECT '防尘口罩', '呼吸防护', 'N95级别，一次性', '个', 200, 50, '防护用品厂', '符合GB2626标准'
  UNION ALL SELECT '防护手套', '手部防护', '棉纱材质，防滑', '双', 150, 30, '劳保用品公司', '耐磨防滑'
  UNION ALL SELECT '安全鞋', '足部防护', '钢头防砸，42码', '双', 80, 15, '安全用品有限公司', '符合GB21148标准'
  UNION ALL SELECT '防护服', '身体防护', '一次性，无纺布', '套', 60, 10, '防护用品厂', '防尘防污'
  UNION ALL SELECT '耳塞', '听力防护', '海绵材质，一次性', '副', 300, 50, '劳保用品公司', '降噪30dB'
  UNION ALL SELECT '安全带', '高空防护', '全身式，五点式', '套', 30, 5, '安全用品有限公司', '符合GB6095标准'
) as item
WHERE c.code = 'DEMO001'
ON DUPLICATE KEY UPDATE name = VALUES(name);
