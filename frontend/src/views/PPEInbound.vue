<template>
  <div class="ppe-inbound">
    <h3>入库管理</h3>
    
    <!-- 入库方式选择 -->
    <el-card class="inbound-method">
      <div class="method-title">选择入库方式：</div>
      <div class="method-buttons">
        <el-button type="primary" size="large" @click="showManualForm = true">
          <el-icon><Edit /></el-icon>
          手动入库
        </el-button>
        <el-button type="success" size="large" @click="$router.push('/ocr-inbound')">
          <el-icon><Camera /></el-icon>
          截图入库
        </el-button>
      </div>
      <p class="method-tip">💡 推荐：收到供应商邮件/订单时，使用"截图入库"自动识别</p>
    </el-card>
    
    <!-- 手动入库表单 -->
    <el-card class="inbound-form" v-if="showManualForm">
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
          <el-button @click="showManualForm = false">关闭</el-button>
        </el-form-item>
      </el-form>
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
import { reactive, ref, onMounted } from 'vue';
import request from '../utils/request';
import { Edit, Camera } from '@element-plus/icons-vue';

export default {
  components: {
    Edit, Camera
  },
  name: 'PPEInbound',
  setup() {
    const loading = ref(false);
    const ppeList = ref([]);
    const recordList = ref([]);
    const formRef = ref(null);
    const showManualForm = ref(false);
    
    const form = reactive({
      ppeId: null,
      quantity: 1,
      remark: ''
    });
    
    const rules = {
      ppeId: [{ required: true, message: '请选择设备', trigger: 'change' }],
      quantity: [{ required: true, message: '请输入入库数量', trigger: 'blur' }]
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
    });
    
    return {
      loading,
      ppeList,
      recordList,
      formRef,
      showManualForm,
      form,
      rules,
      handleSubmit,
      handleReset
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
  max-width: 600px;
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
