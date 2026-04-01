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

      <!-- 识别结果汇总 -->
      <div v-if="recognitionResult.inbound_date" class="inbound-summary">
        <el-divider>入库信息汇总</el-divider>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="入库单号">{{ recognitionResult.inbound_no || '系统自动生成' }}</el-descriptions-item>
          <el-descriptions-item label="入库日期">{{ recognitionResult.inbound_date }}</el-descriptions-item>
          <el-descriptions-item label="仓库名称">{{ recognitionResult.warehouse_name || '默认仓库' }}</el-descriptions-item>
          <el-descriptions-item label="识别物品数">{{ recognitionResult.items?.length || 0 }} 件</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 识别详情表格 -->
      <div v-if="recognitionResult.items?.length > 0" class="recognized-result">
        <el-divider>识别详情</el-divider>
        <el-table :data="recognitionResult.items" border>
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="name" label="劳防用品名称" />
          <el-table-column prop="brand" label="品牌" width="120" />
          <el-table-column prop="model" label="型号" width="120" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column prop="remark" label="备注" />
        </el-table>
        
        <div class="action-buttons">
          <el-button @click="resetForm">重新识别</el-button>
          <el-button type="primary" @click="confirmInbound">
            确认入库
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import request from '../utils/request';

export default {
  name: 'OCRInbound',
  components: { UploadFilled },
  setup() {
    const recognitionResult = reactive({
      inbound_no: '',
      inbound_date: '',
      warehouse_name: '',
      remark: '',
      items: []
    });

    const handleFileChange = async (file) => {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file.raw);
        reader.onload = async () => {
          const base64 = reader.result.split(',')[1];
          const res = await request.post('/ppe/ocr-recognize', { imageBase64: base64 });
          if (res.code === 200) {
            Object.assign(recognitionResult, res.data);
            ElMessage.success('识别成功，请检查并确认');
          }
        };
      } catch (error) {
        ElMessage.error('识别失败');
      }
    };

    const confirmInbound = async () => {
      try {
        const res = await request.post('/ppe/ocr-inbound', { 
          items: recognitionResult.items,
          inbound_no: recognitionResult.inbound_no,
          inbound_date: recognitionResult.inbound_date,
          warehouse_name: recognitionResult.warehouse_name,
          remark: recognitionResult.remark
        });
        if (res.code === 200) {
          ElMessage.success('入库成功');
          resetForm();
        }
      } catch (error) {
        ElMessage.error('入库失败');
      }
    };

    const resetForm = () => {
      recognitionResult.inbound_no = '';
      recognitionResult.inbound_date = '';
      recognitionResult.warehouse_name = '';
      recognitionResult.remark = '';
      recognitionResult.items = [];
    };

    return {
      recognitionResult,
      handleFileChange,
      confirmInbound,
      resetForm
    };
  }
};
</script>

<style scoped>
.desc {
  color: #666;
  margin-bottom: 20px;
}

.inbound-summary {
  margin-top: 30px;
}

.recognized-result {
  margin-top: 20px;
}

.action-buttons {
  margin-top: 20px;
  text-align: center;
}
</style>