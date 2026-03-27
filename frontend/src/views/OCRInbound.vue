<template>
  <div class="ocr-inbound">
    <h3>截图入库</h3>
    <p class="desc">上传邮件/订单截图，自动识别物品信息</p>
    
    <!-- 步骤1：上传图片 -->
    <el-card v-if="step === 1" class="upload-card">
      <el-upload
        class="upload-area"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        :show-file-list="false"
        accept="image/*"
      >
        <el-icon class="upload-icon"><Upload /></el-icon>
        <div class="upload-text">
          <p>点击或拖拽图片到此处</p>
          <p class="upload-tip">支持：截图、拍照、邮件附件</p>
        </div>
      </el-upload>
      
      <div class="example-section">
        <p class="example-title">💡 使用示例：</p>
        <ol>
          <li>收到供应商邮件/订单</li>
          <li>截图邮件中的物品清单</li>
          <li>上传截图，系统自动识别</li>
          <li>确认无误，一键入库</li>
        </ol>
      </div>
    </el-card>
    
    <!-- 步骤2：识别中 -->
    <el-card v-if="step === 2" class="loading-card">
      <div class="loading-content">
        <el-icon class="loading-icon" :size="50"><Loading /></el-icon>
        <p>正在识别图片...</p>
        <p class="loading-tip">请稍候，AI 正在分析文字</p>
      </div>
    </el-card>
    
    <!-- 步骤3：确认识别结果 -->
    <el-card v-if="step === 3" class="result-card">
      <template #header>
        <div class="card-header">
          <span>识别结果确认</span>
          <el-tag v-if="recognizeResult.confidence >= 60" type="success">置信度 {{ recognizeResult.confidence }}%</el-tag>
          <el-tag v-else type="warning">置信度 {{ recognizeResult.confidence }}%</el-tag>
        </div>
      </template>
      
      <!-- 识别的原始文字 -->
      <div class="raw-text" v-if="recognizeResult.recognizedText">
        <p class="label">识别到的文字：</p>
        <pre>{{ recognizeResult.recognizedText }}</pre>
      </div>
      
      <!-- 识别出的物品列表 -->
      <div class="items-section">
        <p class="label">识别到的物品：</p>
        <el-table :data="editableItems" border>
          <el-table-column label="物品名称" min-width="150">
            <template #default="{ row, $index }">
              <el-input v-model="row.name" size="small" />
              <el-tag v-if="row.isNew" type="warning" size="small" style="margin-top: 5px;">新物品</el-tag>
              <el-tag v-else type="success" size="small" style="margin-top: 5px;">已匹配</el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="数量" width="120">
            <template #default="{ row }">
              <el-input-number v-model="row.quantity" :min="1" size="small" style="width: 100px;" />
            </template>
          </el-table-column>
          
          <el-table-column label="单位" width="100">
            <template #default="{ row }">
              <el-input v-model="row.unit" size="small" />
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="80">
            <template #default="{ $index }">
              <el-button type="danger" size="small" @click="removeItem($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <el-button type="primary" plain @click="addItem" style="margin-top: 10px;">
          + 添加物品
        </el-button>
      </div>
      
      <!-- 供应商信息 -->
      <div class="supplier-section">
        <el-form :model="inboundForm" label-position="top">
          <el-form-item label="供应商">
            <el-input v-model="inboundForm.supplier" placeholder="如：安全用品有限公司" />
          </el-form-item>
          
          <el-form-item label="备注">
            <el-input v-model="inboundForm.remarks" type="textarea" rows="2" placeholder="其他备注信息" />
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button @click="step = 1">重新上传</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmInbound">
          确认入库
        </el-button>
      </div>
    </el-card>
    
    <!-- 步骤4：入库成功 -->
    <el-card v-if="step === 4" class="success-card">
      <div class="success-content">
        <el-icon class="success-icon" :size="60" color="#67C23A"><CircleCheck /></el-icon>
        <h3>入库成功！</h3>
        <p class="success-info">
          入库单号：{{ inboundResult.inboundNo }}<br>
          共入库 {{ inboundResult.items.length }} 种物品
        </p>
        <div class="success-items">
          <el-tag v-for="item in inboundResult.items" :key="item.itemId" style="margin: 5px;">
            {{ item.name }} x {{ item.quantity }}
          </el-tag>
        </div>
        <div class="success-actions">
          <el-button @click="step = 1">继续入库</el-button>
          <el-button type="primary" @click="$router.push('/ppe-list')">查看库存</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { reactive, ref } from 'vue';
import request from '../utils/request';
import { Upload, Loading, CircleCheck } from '@element-plus/icons-vue';

export default {
  name: 'OCRInbound',
  components: {
    Upload, Loading, CircleCheck
  },
  setup() {
    const step = ref(1); // 1:上传 2:识别中 3:确认 4:成功
    const loading = ref(false);
    const submitting = ref(false);
    const recognizeResult = ref({});
    const editableItems = ref([]);
    const inboundResult = ref({});
    
    const inboundForm = reactive({
      supplier: '',
      remarks: ''
    });
    
    // 处理文件选择
    const handleFileChange = async (file) => {
      if (!file) return;
      
      // 转换为 base64
      const reader = new FileReader();
      reader.readAsDataURL(file.raw);
      reader.onload = async () => {
        const base64 = reader.result;
        await recognizeImage(base64);
      };
    };
    
    // 识别图片
    const recognizeImage = async (base64) => {
      step.value = 2;
      loading.value = true;
      
      try {
        const res = await request.post('/ppe/ocr-recognize', {
          imageBase64: base64
        });
        
        if (res.code === 200) {
          recognizeResult.value = res.data;
          editableItems.value = res.data.items.map(item => ({ ...item }));
          
          // 自动填充供应商（如果识别到）
          if (res.data.supplier) {
            inboundForm.supplier = res.data.supplier;
          }
          
          step.value = 3;
        } else {
          ElMessage.error(res.msg || '识别失败');
          step.value = 1;
        }
      } catch (error) {
        console.error('识别失败:', error);
        ElMessage.error('识别失败，请检查网络');
        step.value = 1;
      } finally {
        loading.value = false;
      }
    };
    
    // 添加物品
    const addItem = () => {
      editableItems.value.push({
        name: '',
        quantity: 1,
        unit: '件',
        isNew: true,
        matchedId: null
      });
    };
    
    // 删除物品
    const removeItem = (index) => {
      editableItems.value.splice(index, 1);
    };
    
    // 确认入库
    const confirmInbound = async () => {
      if (editableItems.value.length === 0) {
        ElMessage.error('请至少添加一个物品');
        return;
      }
      
      // 验证物品名称
      const emptyName = editableItems.value.find(item => !item.name.trim());
      if (emptyName) {
        ElMessage.error('物品名称不能为空');
        return;
      }
      
      submitting.value = true;
      
      try {
        const res = await request.post('/ppe/ocr-inbound', {
          items: editableItems.value,
          supplier: inboundForm.supplier,
          remarks: inboundForm.remarks
        });
        
        if (res.code === 200) {
          inboundResult.value = res.data;
          step.value = 4;
          ElMessage.success('入库成功！');
        } else {
          ElMessage.error(res.msg || '入库失败');
        }
      } catch (error) {
        console.error('入库失败:', error);
        ElMessage.error('入库失败，请检查网络');
      } finally {
        submitting.value = false;
      }
    };
    
    return {
      step,
      loading,
      submitting,
      recognizeResult,
      editableItems,
      inboundForm,
      inboundResult,
      handleFileChange,
      addItem,
      removeItem,
      confirmInbound
    };
  }
};
</script>

<style scoped>
.ocr-inbound {
  padding: 20px;
}

.desc {
  color: #666;
  margin-bottom: 20px;
}

.upload-card {
  max-width: 600px;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.upload-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 10px;
}

.upload-text {
  text-align: center;
}

.upload-text p {
  margin: 5px 0;
}

.upload-tip {
  color: #999;
  font-size: 12px;
}

.example-section {
  margin-top: 30px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.example-title {
  font-weight: bold;
  margin-bottom: 10px;
}

.example-section ol {
  margin: 0;
  padding-left: 20px;
  color: #666;
}

.example-section li {
  margin: 5px 0;
}

.loading-card {
  max-width: 400px;
  margin: 0 auto;
}

.loading-content {
  text-align: center;
  padding: 40px;
}

.loading-icon {
  animation: rotating 2s linear infinite;
  margin-bottom: 20px;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-tip {
  color: #999;
  font-size: 12px;
}

.result-card {
  max-width: 800px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-weight: bold;
  margin-bottom: 10px;
}

.raw-text {
  margin-bottom: 20px;
}

.raw-text pre {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 100px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.items-section {
  margin-bottom: 20px;
}

.supplier-section {
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}

.success-card {
  max-width: 500px;
  margin: 0 auto;
}

.success-content {
  text-align: center;
  padding: 30px;
}

.success-icon {
  margin-bottom: 20px;
}

.success-info {
  color: #666;
  line-height: 1.8;
  margin: 20px 0;
}

.success-items {
  margin: 20px 0;
}

.success-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}

/* 手机端适配 */
@media (max-width: 768px) {
  .ocr-inbound {
    padding: 10px;
  }
  
  .upload-card,
  .result-card,
  .success-card {
    margin: 0 -5px;
  }
  
  .action-buttons,
  .success-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .action-buttons .el-button,
  .success-actions .el-button {
    width: 100%;
  }
}
</style>