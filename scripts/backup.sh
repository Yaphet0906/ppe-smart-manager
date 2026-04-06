#!/bin/bash

# PPE Smart Manager 数据库备份脚本
# 建议添加到 crontab: 0 2 * * * /path/to/backup.sh

# 配置
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD}"
DB_NAME="${DB_NAME:-ppe_smart_manager}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# 检查必要参数
if [ -z "$DB_PASSWORD" ]; then
    echo "错误: DB_PASSWORD 环境变量未设置"
    exit 1
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成备份文件名
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_${TIMESTAMP}.sql"

# 执行备份
echo "开始备份数据库 $DB_NAME..."
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    "$DB_NAME" > "$BACKUP_FILE"

# 检查备份是否成功
if [ $? -eq 0 ]; then
    # 压缩备份
    gzip "$BACKUP_FILE"
    echo "备份成功: ${BACKUP_FILE}.gz"
    
    # 删除旧备份
    find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "已清理 $RETENTION_DAYS 天前的备份"
else
    echo "备份失败"
    exit 1
fi
