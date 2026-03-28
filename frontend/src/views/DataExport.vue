<template>
  <div class="data-export">
    <h3>数据导出</h3>
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card>
          <template #header>入库记录导出</template>
          <el-button type="primary" @click="exportInbound" :loading="loading.inbound">导出</el-button>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>出库记录导出</template>
          <el-button type="success" @click="exportOutbound" :loading="loading.outbound">导出</el-button>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>库存报表导出</template>
          <el-button type="warning" @click="exportInventory" :loading="loading.inventory">导出</el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../utils/request';

export default {
  name: 'DataExport',
  setup() {
    const loading = reactive({ inbound: false, outbound: false, inventory: false });

    const downloadExcel = (data, filename) => {
      let csv = '';
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        csv = headers.join(',') + '\n';
        data.forEach(row => {
          csv += headers.map(h => row[h]).join(',') + '\n';
        });
      }
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    };

    const exportInbound = async () => {
      loading.inbound = true;
      try {
        const res = await request.get('/ppe/inbound-records');
        if (res.code === 200) {
          downloadExcel(res.data, `入库记录_${new Date().toISOString().split('T')[0]}.csv`);
          ElMessage.success('导出成功');
        }
      } catch (error) {
        ElMessage.error('导出失败');
      }
      loading.inbound = false;
    };

    const exportOutbound = async () => {
      loading.outbound = true;
      try {
        const res = await request.get('/ppe/outbound-records');
        if (res.code === 200) {
          downloadExcel(res.data, `出库记录_${new Date().toISOString().split('T')[0]}.csv`);
          ElMessage.success('导出成功');
        }
      } catch (error) {
        ElMessage.error('导出失败');
      }
      loading.outbound = false;
    };

    const exportInventory = async () => {
      loading.inventory = true;
      try {
        const res = await request.get('/ppe/list');
        if (res.code === 200) {
          downloadExcel(res.data, `库存报表_${new Date().toISOString().split('T')[0]}.csv`);
          ElMessage.success('导出成功');
        }
      } catch (error) {
        ElMessage.error('导出失败');
      }
      loading.inventory = false;
    };

    return { loading, exportInbound, exportOutbound, exportInventory };
  }
};
</script>

<style scoped>
.data-export {
  padding: 20px;
}
</style>