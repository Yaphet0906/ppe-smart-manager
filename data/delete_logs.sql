-- 删除日志表
CREATE TABLE IF NOT EXISTS delete_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL COMMENT '被删除的表名',
    record_id INT NOT NULL COMMENT '被删除的记录ID',
    record_data JSON COMMENT '被删除记录的完整数据备份',
    deleted_by INT COMMENT '删除人ID',
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '删除时间',
    delete_reason VARCHAR(255) DEFAULT '未填写原因' COMMENT '删除原因',
    tenant_id INT COMMENT '租户ID',
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='删除日志表';

-- 为 inv_items 表添加删除人字段（如果不存在）
ALTER TABLE inv_items 
ADD COLUMN IF NOT EXISTS deleted_by INT DEFAULT NULL COMMENT '删除人ID';
