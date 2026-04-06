#!/bin/bash

# PPE Smart Manager 健康检查脚本

API_URL="${API_URL:-http://localhost:3001/api/health}"
LOG_FILE="${LOG_FILE:-./logs/health-check.log}"

# 创建日志目录
mkdir -p "$(dirname "$LOG_FILE")"

# 执行健康检查
response=$(curl -s -w "\n%{http_code}" "$API_URL" 2>/dev/null)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

timestamp=$(date '+%Y-%m-%d %H:%M:%S')

if [ "$http_code" = "200" ]; then
    echo "[$timestamp] ✅ 服务健康: $body" | tee -a "$LOG_FILE"
    exit 0
else
    echo "[$timestamp] ❌ 服务异常: HTTP $http_code" | tee -a "$LOG_FILE"
    # 可选: 发送告警通知
    # curl -X POST "https://api.alert-service.com/notify" -d "message=服务异常"
    exit 1
fi
