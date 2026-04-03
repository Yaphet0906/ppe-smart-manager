<template>
  <div class="ppe-inbound">
    <h3>入库管理</h3>
    
    <!-- 模块一：截图入库 -->
    <el-card class="inbound-section">
      <div class="section-title">
        <el-icon><Camera /></el-icon>
        <span>截图入库</span>
        <el-tag type="success" size="small" class="section-tag">推荐</el-tag>
      </div>
      <p class="section-desc">拍照或上传采购订单截图，AI自动识别物品信息</p>
      
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
        <el-divider>识别结果</el-divider>
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

    <!-- 模块二：手动入库 -->
    <el-card class="inbound-section">
      <div class="section-title">
        <el-icon><Edit /></el-icon>
        <span>手动入库</span>
      </div>
      <p class="section-desc">手动录入入库信息，支持选择已有用品或新增用品</p>
      
      <!-- 手动入库表单 -->
      <el-form :model="manualForm" :rules="manualRules" ref="manualFormRef" label-width="100px" class="inbound-form">
        <el-form-item label="用品名称" prop="name">
          <el-input v-model="manualForm.name" placeholder="如：安全鞋、工作服" />
        </el-form-item>
        
        <el-form-item label="所属仓库" prop="warehouse_id">
          <el-select v-model="manualForm.warehouse_id" style="width: 100%" placeholder="请选择仓库">
            <el-option
              v-for="warehouse in warehouseList"
              :key="warehouse.id"
              :label="warehouse.name"
              :value="parseInt(warehouse.id)"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="类别" prop="category">
          <el-select v-model="manualForm.category" style="width: 100%" @change="handleCategoryChange" placeholder="请选择类别">
            <el-option label="安全鞋" value="safety_shoes" />
            <el-option label="工作服" value="work_clothes" />
            <el-option label="手套" value="gloves" />
            <el-option label="安全帽" value="helmet" />
            <el-option label="口罩" value="mask" />
          </el-select>
        </el-form-item>
        
        <!-- 尺码选择 - 根据类别动态显示 -->
        <el-form-item label="尺码" prop="size" v-if="sizeOptions.length > 0">
          <el-select v-model="manualForm.size" style="width: 100%" placeholder="请选择尺码">
            <el-option
              v-for="size in sizeOptions"
              :key="size"
              :label="size"
              :value="size"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="品牌" prop="brand">
          <el-input v-model="manualForm.brand" placeholder="可选" />
        </el-form-item>
        
        <el-form-item label="型号" prop="model">
          <el-input v-model="manualForm.model" placeholder="可选" />
        </el-form-item>
        
        <el-form-item label="入库数量" prop="quantity">
          <el-input-number v-model="manualForm.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        
        <el-form-item label="备注" prop="remark">
          <el-input v-model="manualForm.remark" type="textarea" rows="2" placeholder="可选" />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleManualSubmit">确认入库</el-button>
          <el-button @click="handleManualReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 模块三：入库记录 -->
    <el-card class="inbound-section">
      <div class="section-title">
        <el-icon><List /></el-icon>
        <span>入库记录</span>
      </div>
      
      <el-table :data="recordList" v-loading="loading" border>
        <el-table-column prop="inbound_no" label="入库单号" width="160" />
        <el-table-column label="入库日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.inbound_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="item_name" label="用品名称" />
        <el-table-column prop="quantity" label="入库数量" width="100" />
        <el-table-column prop="operator_name" label="操作人" width="120" />
        <el-table-column prop="remarks" label="备注" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { reactive, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import request from '../utils/request';
import { Edit, Camera, Picture, UploadFilled, List } from '@element-plus/icons-vue';

export default {
  components: {
    Edit, Camera, Picture, UploadFilled, List
  },
  name: 'PPEInbound',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const loading = ref(false);
    const ppeList = ref([]);
    const warehouseList = ref([]);
    const recordList = ref([]);
    const existingFormRef = ref(null);
    const newFormRef = ref(null);
    
    // 手动入库表单
    const manualFormRef = ref(null);
    const manualForm = reactive({
      name: '',
      warehouse_id: null,
      category: '',
      size: '',
      brand: '',
      model: '',
      quantity: 1,
      remark: ''
    });
    
    const manualRules = {
      name: [{ required: true, message: '请输入用品名称', trigger: 'blur' }],
      category: [{ required: true, message: '请选择类别', trigger: 'change' }],
      warehouse_id: [{ required: true, message: '请选择仓库', trigger: 'change' }],
      quantity: [{ required: true, message: '请输入入库数量', trigger: 'blur' }]
    };
    
    // 尺码选项
    const sizeOptions = ref([]);
    
    // 类别改变时获取尺码选项
    const handleCategoryChange = async (category) => {
      manualForm.size = '';
      sizeOptions.value = [];
      if (!category) return;
      
      try {
        const res = await request.get('/ppe/size-options', {
          params: { category }
        });
        if (res.code === 200) {
          sizeOptions.value = res.data;
        }
      } catch (error) {
        console.error('获取尺码选项失败:', error);
      }
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
          fetchPPEList();
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
        console.error('获取用品列表失败:', error);
      }
    };
    
    const fetchWarehouses = async () => {
      try {
        const res = await request.get('/ppe/warehouse-list');
        if (res.code === 200) {
          warehouseList.value = res.data;
          if (res.data.length > 0 && !manualForm.warehouse_id) {
            manualForm.warehouse_id = res.data[0].id;
          }
        }
      } catch (error) {
        console.error('获取仓库列表失败:', error);
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
    
    // 手动入库提交
    const handleManualSubmit = async () => {
      try {
        await manualFormRef.value.validate();
        const res = await request.post('/ppe/add', {
          name: manualForm.name,
          warehouse_id: manualForm.warehouse_id,
          category: manualForm.category,
          size: manualForm.size,
          brand: manualForm.brand,
          model: manualForm.model,
          quantity: manualForm.quantity,
          remark: manualForm.remark
        });
        if (res.code === 200) {
          ElMessage.success('新增用品入库成功');
          handleManualReset();
          fetchRecords();
          fetchPPEList();
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
    
    const handleManualReset = () => {
      manualFormRef.value.resetFields();
      sizeOptions.value = [];
    };
    
    // 格式化日期
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
    };
    
    onMounted(() => {
      fetchPPEList();
      fetchWarehouses();
      fetchRecords();
    });
    
    return {
      loading,
      ppeList,
      warehouseList,
      recordList,
      manualFormRef,
      manualForm,
      manualRules,
      sizeOptions,
      fileInput,
      recognitionResult,
      formatDate,
      handleCategoryChange,
      handleManualSubmit,
      handleManualReset,
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
.ppe-inbound {
  padding-bottom: 20px;
}

/* 模块样式 */
.inbound-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.section-title .el-icon {
  font-size: 20px;
}

.section-tag {
  margin-left: 8px;
}

.section-desc {
  color: #909399;
  font-size: 14px;
  margin-bottom: 20px;
  margin-top: 0;
}



/* 表单样式 */
.inbound-form {
  max-width: 600px;
}

/* OCR 相关样式 */
.mobile-upload {
  padding: 16px;
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
  
  .section-title {
    font-size: 20px;
  }
  
  .inbound-form {
    margin: 0 auto;
  }
}
</style>
