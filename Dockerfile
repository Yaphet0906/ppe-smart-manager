# PPE智能管理系统 - Docker配置
# 多阶段构建，减小最终镜像大小

# ============================================
# 阶段1: 构建前端
# ============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端依赖配置
COPY frontend/package*.json ./
RUN npm ci

# 复制前端源代码
COPY frontend/ ./

# 构建前端
RUN npm run build

# ============================================
# 阶段2: 构建后端
# ============================================
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# 复制后端依赖配置
COPY backend/package*.json ./
RUN npm ci --only=production

# 复制后端源代码
COPY backend/ ./

# ============================================
# 阶段3: 最终镜像
# ============================================
FROM node:18-alpine

# 安装必要的系统依赖
RUN apk add --no-cache dumb-init

# 创建应用目录
WORKDIR /app

# 复制后端依赖和代码
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/src ./src
COPY --from=backend-builder /app/backend/package.json ./

# 复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist ./public

# 创建非root用户运行应用
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置文件权限
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
