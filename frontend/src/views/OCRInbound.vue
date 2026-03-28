<template>
  <div class="ocr-inbound">
    <h3>截图入库</h3>
    <p class="desc">上传采购订单截图，自动识别物品信息并入库</p>

    <el-card>
      <el-upload
        class="upload-demo"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        accept="image/*"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          拖拽图片到此处或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 jpg/png 格式图片
          </div>
        </template>
      </el-upload>

      <div v-if="recognizedItems.length > 0" class="recognized-result">
        <h4>识别结果</h4>
        <el-table :data="recognizedItems" border>
          <el-table-column prop="name" label="物品名称" />
          <el-table-column prop="quantity" label="数量" width="100" />
          <el-table-column prop="isNew" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.isNew ? 'success' : 'info'">
                {{ row.isNew ? '新品' : '已有' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-button type="primary" @click="confirmInbound" style="margin-top: 20px;">
          确认入库
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import request from '../utils/request';

export default {
  name: 'OCRInbound',
  components: { UploadFilled },
  setup() {
    const recognizedItems = ref([]);

    const handleFileChange = async (file) => {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file.raw);
        reader.onload = async () => {
          const base64 = reader.result.split(',')[1];
          const res = await request.post('/ppe/ocr-recognize', { imageBase64: base64 });
          if (res.code === 200) {
            recognizedItems.value = res.data.items || [];
            ElMessage.success('识别成功');
          }
        };
      } catch (error) {
        ElMessage.error('识别失败');
      }
    };

    const confirmInbound = async () => {
      try {
        const res = await request.post('/ppe/ocr-inbound', { items: recognizedItems.value });
        if (res.code === 200) {
          ElMessage.success('入库成功');
          recognizedItems.value = [];
        }
      } catch (error) {
        ElMessage.error('入库失败');
      }
    };

    return {
      recognizedItems,
      handleFileChange,
      confirmInbound
    };
  }
};
</script>

<style scoped>
.desc {
  color: #666;
  margin-bottom: 20px;
}

.recognized-result {
  margin-top: 30px;
}
</style>