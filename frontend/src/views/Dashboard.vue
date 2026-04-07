<template>
  <div class="dashboard">
    <h2>欢迎使用PPE智能管理系统</h2>
    
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card class="stat-card" @click="goToPPEList('all')">
          <div class="stat-item">
            <div class="stat-icon" style="background: #409EFF;">
              <el-icon><Box /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">用品总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card" @click="goToPPEList('normal')">
          <div class="stat-item">
            <div class="stat-icon" style="background: #67C23A;">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.normal }}</div>
              <div class="stat-label">库存正常</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card" @click="goToPPEList('low')">
          <div class="stat-item">
            <div class="stat-icon" style="background: #E6A23C;">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.low }}</div>
              <div class="stat-label">库存偏低</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card" @click="goToPPEList('critical')">
          <div class="stat-item">
            <div class="stat-icon" style="background: #F56C6C;">
              <el-icon><CircleClose /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.out }}</div>
              <div class="stat-label">库存告急</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';

export default {
  name: 'Dashboard',
  setup() {
    const router = useRouter();
    
    const stats = reactive({
      total: 0,
      normal: 0,
      low: 0,
      out: 0
    });
    
    const fetchStats = async () => {
      try {
        const res = await request.get('/ppe/stats');
        if (res.code === 200) {
          Object.assign(stats, res.data);
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
      }
    };
    
    // 跳转到库存管理页面并带筛选参数
    const goToPPEList = (filter) => {
      router.push({
        path: '/ppe-list',
        query: { filter }
      });
    };
    
    onMounted(() => {
      fetchStats();
    });
    
    return {
      stats,
      goToPPEList
    };
  }
};
</script>

<style scoped>
.dashboard h2 {
  margin-bottom: 20px;
  color: #303133;
}

.stat-cards {
  margin-top: 20px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.stat-item {
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28px;
}

.stat-info {
  margin-left: 15px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}
</style>
