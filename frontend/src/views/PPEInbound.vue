<template>
  <div class="ppe-inbound">
    <h3>入库管理</h3>
    
    <!-- 入库方式选择 -->
    <el-card class="inbound-method">
      <div class="method-title">选择入库方式：</div>
      <div class="method-buttons">
        <el-button 
          :type="currentMethod === 'manual' ? 'primary' : 'default'" 
          size="large" 
          @click="switchMethod('manual')"
        >
          <el-icon><Edit /></el-icon>
          手动入库
        </el-button>
        <el-button 
          :type="currentMethod === 'ocr' ? 'success' : 'default'" 
          size="large" 
          @click="switchMethod('ocr')"
        >
          <el-icon><Camera /></el-icon>
          截图入库
        </el-button>
      </div>
      <p class="method-tip">
        {{ currentMethod === 'manual' 
          ? '💡 手动选择用品并输入数量进行入库' 
          : '💡 推荐：拍照或上传采购订单截图，AI自动识别物品信息' }}
      </p>
    </el-card>
    
    <!-- 手动入库表单 -->
    <el-card class="inbound-form" v-if="currentMethod === 'manual'">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="选择用品" prop="ppeId">
          <el-select v-model="form.ppeId" placeholder="请选择设备" style="width: 100%">
            <el-option 
              v-for="item in ppeList" 
              :key="item.id" 
              :label="item.name" 
              :value="item.id" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="入库数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" rows="3" />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSubmit">确认入库</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 截图入库表单 -->
    <el-card class="inbound-form" v-if="currentMethod === 'ocr'">
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
        <div class="upload-buttons-ocr">
          <el-button 
            type="success" 
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

      <!-- 桌面端拖拽上传 -->
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
          <el-button @click="resetOcrForm">重新识别</el-button>
          <el-button type="primary" @click="confirmOcrInbound">
            确认入库
          </el-button>
        </div>
      </div>
    </el-card>
    
    <h3 style="margin-top: 30px;">入库记录</h3>
    <el-card>
      <el-table :data="recordList" v-loading="loading" border>
        <el-table-column prop="inbound_no" label="入库单号" width="160" />
        <el-table-column prop="inbound_date" label="入库日期" width="120" />
        <el-table-column prop="item_name" label="用品名称" />
        <el-table-column prop="supplier" label="供应商" width="150" />
        <el-table-column prop="remarks" label="备注" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { reactive, ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import request from '../utils/request';
import { Edit, Camera, Picture, UploadFilled } from '@element-plus/icons-vue';

export default {
  components: {
    Edit, Camera, Picture, UploadFilled
  },
  name: 'PPEInbound',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const loading = ref(false);
    const ppeList = ref([]);
    const recordList = ref([]);
    const formRef = ref(null);
    const currentMethod = ref('manual'); // 'manual' 或 'ocr'
    
    // 手动入库表单
    const form = reactive({
      ppeId: null,
      quantity: 1,
      remark: ''
    });
    
    const rules = {
      ppeId: [{ required: true, message: '请选择设备', trigger: 'change' }],
      quantity: [{ required: true, message: '请输入入库数量', trigger: 'blur' }]
    };

    // OCR 相关
    const fileInput = ref(null);
    const recognitionResult = reactive({
      inbound_no: '',
      inbound_date: '',
      warehouse_name: '',
      remark: '',
      items: []
    });

    const switchMethod = (method) => {
      currentMethod.value = method;
    };

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
      event.target.value = '';
    };

    const handleFileChange = async (file) => {
      await processImage(file.raw);
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

      ElMessage.info('正在处理图片...');
      
      try {
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
      }
    };

    const confirmOcrInbound = async () => {
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
          resetOcrForm();
          fetchRecords();
          // 如果是从库存页面跳转来的，返回库存页面
          if (route.query.from === 'stock') {
            setTimeout(() => {
              router.push('/ppe-list');
            }, 800);
          }
        }
      } catch (error) {
        ElMessage.error('入库失败');
      }
    };

    const resetOcrForm = () => {
      recognitionResult.inbound_no = '';
      recognitionResult.inbound_date = '';
      recognitionResult.warehouse_name = '';
      recognitionResult.remark = '';
      recognitionResult.items = [];
    };
    
    const fetchPPEList = async () => {
      try {
        const res = await request.get('/ppe/list');
        if (res.code === 200) {
          ppeList.value = res.data;
        }
      } catch (error) {
        console.error('获取设备列表失败:', error);
      }
    };
    
    const fetchRecords = async () => {
      loading.value = true;
      try {
        const res = await request.get('/ppe/inbound-records');
        if (res.code === 200) {
          recordList.value = res.data;
        }
      } catch (error) {
        console.error('获取入库记录失败:', error);
      } finally {
        loading.value = false;
      }
    };
    
    const handleSubmit = async () => {
      try {
        await formRef.value.validate();
        const res = await request.post('/ppe/inbound', form);
        if (res.code === 200) {
          ElMessage.success('入库成功');
          handleReset();
          fetchRecords();
          // 如果是从库存页面跳转来的，返回库存页面
          if (route.query.from === 'stock') {
            setTimeout(() => {
              router.push('/ppe-list');
            }, 800);
          }
        }
      } catch (error) {
        console.error('入库失败:', error);
      }
    };
    
    const handleReset = () => {
      formRef.value.resetFields();
    };
    
    onMounted(() => {
      fetchPPEList();
      fetchRecords();
      
      // 检查是否是从库存页面跳转来的
      if (route.query.from === 'stock' && route.query.action === 'add') {
        currentMethod.value = 'manual';
      }
    });
    
    // 监听路由参数变化
    watch(() => route.query, (newQuery) => {
      if (newQuery.from === 'stock' && newQuery.action === 'add') {
        currentMethod.value = 'manual';
      }
    });
    
    return {
      loading,
      ppeList,
      recordList,
      formRef,
      currentMethod,
      form,
      rules,
      fileInput,
      recognitionResult,
      switchMethod,
      handleSubmit,
      handleReset,
      triggerCamera,
      triggerGallery,
      handleFileSelect,
      handleFileChange,
      confirmOcrInbound,
      resetOcrForm
    };
  }
};
</script>

<style scoped>
.inbound-method {
  margin-bottom: 20px;
}

.method-title {
  font-weight: bold;
  margin-bottom: 15px;
  font-size: 16px;
}

.method-buttons {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.method-buttons .el-button {
  flex: 1;
  height: 60px;
  font-size: 16px;
}

.method-buttons .el-icon {
  font-size: 20px;
  margin-right: 8px;
}

.method-tip {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.inbound-form {
  max-width: 800px;
  margin-bottom: 20px;
}

/* OCR 相关样式 */
.mobile-upload {
  padding: 24px 16px;
  text-align: center;
}

.upload-buttons-ocr {
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
  .mobile-upload {
    display: none;
  }
  
  .desktop-only {
    display: block;
  }
  
  .upload-buttons-ocr {
    flex-direction: row;
    justify-content: center;
  }
  
  .upload-btn {
    width: auto;
    min-width: 160px;
  }
}

/* 手机端适配 */
@media (max-width: 768px) {
  .method-buttons {
    flex-direction: column;
    gap: 10px;
  }
  
  .method-buttons .el-button {
    width: 100%;
  }
}
</style>
