-- 创建数据库
CREATE DATABASE IF NOT EXISTS ppe_manager DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ppe_manager;

-- 用户表
CREATE TABLE IF NOT EXISTS user (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL, -- 存储加密后的密码
  role VARCHAR(20) DEFAULT 'user', -- admin/user
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- PPE设备表
CREATE TABLE IF NOT EXISTS ppe (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL, -- 设备名称
  type VARCHAR(50) NOT NULL, -- 设备类型（口罩/手套/防护服）
  stock INT DEFAULT 0, -- 库存数量
  status VARCHAR(20) DEFAULT 'normal', -- normal/low/out
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 入库记录表
CREATE TABLE IF NOT EXISTS inbound_record (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ppe_id INT NOT NULL,
  quantity INT NOT NULL,
  remark TEXT,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ppe_id) REFERENCES ppe(id)
);

-- 出库记录表
CREATE TABLE IF NOT EXISTS outbound_record (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ppe_id INT NOT NULL,
  quantity INT NOT NULL,
  receiver VARCHAR(50) NOT NULL,
  remark TEXT,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ppe_id) REFERENCES ppe(id)
);

-- 初始化管理员账号（密码：admin123，已用bcrypt加密）
INSERT INTO user (username, password, role) VALUES 
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEKjN7Xh7mJ3QY0g6e', 'admin')
ON DUPLICATE KEY UPDATE username = username;
