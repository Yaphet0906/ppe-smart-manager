<template>
  <div class="alerts">
    <h3>预警管理</h3>
    
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="库存偏低" name="low">
        <el-table :data="lowStockList" v-loading="loading" border>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="设备名称" />
          <el-table-column prop="type" label="类型" />
          <el-table-column prop="stock" label="当前库存" width="100">
            <template #default="{ row }">
              <el-tag type="warning">{{ row.stock }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleInbound(row)">入库</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      
      <el-tab-pane label="库存告急" name="out">
        <el-table :data="outStockList" v-loading="loading" border>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="设备名称" />
          <el-table-column prop="type" label="类型" />
          <el-table-column prop="stock" label="当前库存" width="100">
            <template #default="{ row }">
              <el-tag type="danger">{{ row.stock }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleInbound(row)">入库</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';

export default {
  name: 'Alerts',
  setup() {
    const router = useRouter();
    const loading = ref(false);
    const activeTab = ref('low');
    const lowStockList = ref([]);
    const outStockList = ref([]);
    
    const fetchData = async () => {
      loading.value = true;
      try {
        const res = await request.get('/ppe/alerts');
        if (res.code === 200) {
          lowStockList.value = res.data.low || [];
          outStockList.value = res.data.out || [];
        }
      } catch (error) {
        console.error('获取预警数据失败:', error);
      } finally {
        loading.value = false;
      }
    };
    
    const handleInbound = (row) => {
      router.push('/ppe-inbound');
    };
    
    onMounted(() => {
      fetchData();
    });
    
    return {
      loading,
      activeTab,
      lowStockList,
      outStockList,
      handleInbound
    };
  }
};
</script>

<style scoped>
.alerts h3 {
  margin-bottom: 20px;
}
</style>
