<template>
  <div class="ocr-inbound">
    <h3 class="page-title">📸 截图入库</h3>
    <p class="desc">拍照或上传采购订单截图，AI自动识别物品信息</p>

    <el-card shadow="never" class="upload-card">
      <!-- 移动端拍照/选择 -->
      <div class="mobile-upload">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          capture="environment"
          style="display: none"
          @change="handleFileSelect"
        />
        <div class="upload-buttons">
          <el-button 
            type="primary" 
            size="large" 
            class="upload-btn"
            @click="triggerCamera"
          >
            <el-icon><Camera /></el-icon>
            拍照识别
          </el-button>
          <el-button 
            size="large" 
            class="upload-btn"
            @click="triggerGallery"
          >
            <el-icon><Picture /></el-icon>
            从相册选择
          </el-button>
        </div>
        <p class="upload-tip">支持 JPG/PNG 格式，建议文件小于 5MB</p>
      </div>

      <!-- 桌面端拖拽上传（仅桌面显示） -->
      <el-upload
        class="upload-demo desktop-only"
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
import { UploadFilled, Camera, Picture } from '@element-plus/icons-vue';
import request from '../utils/request';

export default {
  name: 'OCRInbound',
  components: { UploadFilled, Camera, Picture },
  setup() {
    const recognitionResult = reactive({
      inbound_no: '',
      inbound_date: '',
      warehouse_name: '',
      remark: '',
      items: []
    });

    const fileInput = ref(null);
    const isCompressing = ref(false);

    // 图片压缩函数
    const compressImage = (file, maxWidth = 1280, maxHeight = 1280, quality = 0.8) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target.result;
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            
            // 计算缩放比例
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width *= ratio;
              height *= ratio;
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // 转换为 base64
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64.split(',')[1]);
          };
        };
      });
    };

    const triggerCamera = () => {
      fileInput.value.setAttribute('capture', 'environment');
      fileInput.value.click();
    };

    const triggerGallery = () => {
      fileInput.value.removeAttribute('capture');
      fileInput.value.click();
    };

    const handleFileSelect = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      await processImage(file);
      event.target.value = ''; // 清空以便重复选择
    };

    const processImage = async (file) => {
      if (!file.type.startsWith('image/')) {
        ElMessage.error('请选择图片文件');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        ElMessage.error('图片大小不能超过 10MB');
        return;
      }

      isCompressing.value = true;
      ElMessage.info('正在处理图片...');
      
      try {
        // 压缩图片
        const compressedBase64 = await compressImage(file);
        
        const res = await request.post('/ppe/ocr-recognize', { 
          imageBase64: compressedBase64 
        });
        
        if (res.code === 200) {
          Object.assign(recognitionResult, res.data);
          ElMessage.success('识别成功，请检查并确认');
        }
      } catch (error) {
        ElMessage.error('识别失败，请重试');
        console.error('OCR error:', error);
      } finally {
        isCompressing.value = false;
      }
    };

    const handleFileChange = async (file) => {
      await processImage(file.raw);
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
      fileInput,
      isCompressing,
      triggerCamera,
      triggerGallery,
      handleFileSelect,
      handleFileChange,
      confirmInbound,
      resetForm
    };
  }
};
</script>

<style scoped>
.ocr-inbound {
  padding: 16px;
  max-width: 100%;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.desc {
  color: #909399;
  font-size: 14px;
  margin-bottom: 20px;
}

.upload-card {
  border-radius: 12px;
}

/* 移动端上传按钮 */
.mobile-upload {
  padding: 24px 16px;
  text-align: center;
}

.upload-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.upload-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  border-radius: 8px;
}

.upload-btn .el-icon {
  margin-right: 6px;
  font-size: 18px;
}

.upload-tip {
  color: #909399;
  font-size: 13px;
  margin: 0;
}

/* 桌面端拖拽上传 - 移动端隐藏 */
.desktop-only {
  display: none;
}

.inbound-summary {
  margin-top: 24px;
}

.recognized-result {
  margin-top: 20px;
}

.action-buttons {
  margin-top: 24px;
  text-align: center;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-buttons .el-button {
  flex: 1;
  max-width: 160px;
  height: 44px;
  border-radius: 8px;
}

/* 平板及以上 */
@media (min-width: 768px) {
  .ocr-inbound {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .mobile-upload {
    display: none;
  }
  
  .desktop-only {
    display: block;
  }
  
  .upload-buttons {
    flex-direction: row;
    justify-content: center;
  }
  
  .upload-btn {
    width: auto;
    min-width: 160px;
  }
}

/* 安全区域适配 */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .ocr-inbound {
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }
}
</style>