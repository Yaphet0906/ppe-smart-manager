<template>
  <div class="qrcode-page">
    <h3>仓库二维码管理</h3>
    <p class="desc">为每个仓库生成专属二维码，员工扫码即可自助领用</p>

    <el-card class="generate-card">
      <el-form :model="form" ref="formRef" label-position="top">
        <el-form-item label="选择仓库">
          <el-select v-model="form.warehouseId" placeholder="请选择仓库" style="width: 100%">
            <el-option
              v-for="warehouse in warehouseList"
              :key="warehouse.id"
              :label="warehouse.name"
              :value="warehouse.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :disabled="!form.warehouseId"
            @click="generateQRCode"
            style="width: 100%"
          >
            生成二维码
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="qrList.length > 0">
      <div v-for="(item, index) in qrList" :key="index" class="qr-item">
        <canvas :id="'qr-' + index" width="200" height="200"></canvas>
        <p>{{ item.warehouseName }}</p>
        <p>{{ item.location }}</p>
      </div>
    </el-card>
  </div>
</template>

<script>
import { reactive, ref, onMounted, nextTick } from 'vue';
import { useUserStore } from '../store';
import request from '../utils/request';

export default {
  name: 'QRCodeManage',
  setup() {
    const userStore = useUserStore();
    const warehouseList = ref([]);
    const qrList = ref([]);

    const form = reactive({
      warehouseId: null
    });

    const fetchWarehouses = async () => {
      const res = await request.get('/ppe/warehouse-list');
      if (res.code === 200) {
        warehouseList.value = res.data;
      }
    };

    const generateQRCode = async () => {
      const warehouse = warehouseList.value.find(w => w.id === form.warehouseId);
      if (!warehouse) return;

      const companyCode = userStore.userInfo?.companyCode || 'DEMO';
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/#/quick-outbound?code=${companyCode}&warehouse=${warehouse.id}`;

      qrList.value.push({
        warehouseName: warehouse.name,
        location: warehouse.location,
        url: url
      });

      await nextTick();
      drawQR(qrList.value.length - 1);
    };

    const drawQR = (index) => {
      const canvas = document.getElementById('qr-' + index);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('二维码占位', 100, 100);
    };

    onMounted(() => {
      fetchWarehouses();
    });

    return {
      warehouseList,
      qrList,
      form,
      generateQRCode
    };
  }
};
</script>

<style scoped>
.qrcode-page {
  padding: 20px;
}

.desc {
  color: #666;
  margin-bottom: 20px;
}

.generate-card {
  max-width: 500px;
  margin-bottom: 30px;
}

.qr-item {
  text-align: center;
  margin: 20px 0;
}
</style>