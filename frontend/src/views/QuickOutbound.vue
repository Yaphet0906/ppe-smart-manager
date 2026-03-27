<template>
  <div class="quick-outbound">
    <div class="header">
      <h2>{{ companyName || 'PPE领用' }}</h2>
      <p class="subtitle">扫码自助领用</p>
    </div>
    
    <el-card class="outbound-form" v-if="!success">
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="您的姓名" prop="employeeName">
          <el-input 
            v-model="form.employeeName" 
            placeholder="请输入您的姓名"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item label="您的手机号" prop="employeePhone">
          <el-input 
            v-model="form.employeePhone" 
            placeholder="请输入您的手机号"
            prefix-icon="Iphone"
            maxlength="11"
          />
        </el-form-item>
        
        <el-form-item label="选择物品" prop="ppeId">
          <el-select 
            v-model="form.ppeId" 
            placeholder="请选择要领取的物品"
            style="width: 100%"
            filterable
          >
            <el-option 
              v-for="item in ppeList" 
              :key="item.id" 
              :label="`${item.name} (库存: ${item.quantity} ${item.unit})`" 
              :value="item.id"
              :disabled="item.quantity === 0"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="领取数量" prop="quantity">
          <el-input-number 
            v-model="form.quantity" 
            :min="1" 
            :max="maxQuantity"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="用途说明" prop="purpose">
          <el-input 
            v-model="form.purpose" 
            type="textarea" 
            rows="2"
            placeholder="请简单说明用途（如：日常作业、设备维护等）"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            :loading="loading"
            @click="handleSubmit"
            style="width: 100%; height: 44px; font-size: 16px;"
          >
            确认领用
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 领用成功 -->
    <el-card class="success-card" v-else>
      <div class="success-icon">
        <el-icon size="60" color="#67C23A"><CircleCheck /></el-icon>
      </div>
      <h3>领用成功！</h3>
      <p class="success-info">
        物品：{{ selectedItemName }}<br>
        数量：{{ form.quantity }} {{ selectedItemUnit }}<br>
        单号：{{ outboundNo }}
      </p>
      <el-button type="primary" @click="resetForm" style="width: 100%; margin-top: 20px;">
        继续领用
      </el-button>
    </el-card>
    
    <!-- 库存不足提示 -->
    <el-empty v-if="ppeList.length === 0 && !loading" description="暂无库存物品" />
  </div>
</template>

<script>
import { reactive, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import request from '../utils/request';
import { User, Iphone, CircleCheck } from '@element-plus/icons-vue';

export default {
  name: 'QuickOutbound',
  components: {
    User, Iphone, CircleCheck
  },
  setup() {
    const route = useRoute();
    const formRef = ref(null);
    const loading = ref(false);
    const success = ref(false);
    const ppeList = ref([]);
    const companyName = ref('');
    const outboundNo = ref('');
    
    // 从 URL 获取公司代码
    const companyCode = computed(() => {
      return route.query.code || route.params.code || '';
    });
    
    const form = reactive({
      employeeName: '',
      employeePhone: '',
      ppeId: null,
      quantity: 1,
      purpose: ''
    });
    
    const rules = {
      employeeName: [
        { required: true, message: '请输入您的姓名', trigger: 'blur' },
        { min: 2, message: '姓名至少2个字', trigger: 'blur' }
      ],
      employeePhone: [
        { required: true, message: '请输入您的手机号', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
      ],
      ppeId: [{ required: true, message: '请选择物品', trigger: 'change' }],
      quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
    };
    
    // 最大可领数量
    const maxQuantity = computed(() => {
      const item = ppeList.value.find(i => i.id === form.ppeId);
      return item ? item.quantity : 1;
    });
    
    // 选中的物品名称
    const selectedItemName = computed(() => {
      const item = ppeList.value.find(i => i.id === form.ppeId);
      return item ? item.name : '';
    });
    
    // 选中的物品单位
    const selectedItemUnit = computed(() => {
      const item = ppeList.value.find(i => i.id === form.ppeId);
      return item ? item.unit : '件';
    });
    
    // 获取物品列表
    const fetchPPEList = async () => {
      if (!companyCode.value) {
        ElMessage.error('缺少公司代码，请重新扫码');
        return;
      }
      
      loading.value = true;
      try {
        const res = await request.get('/user/public-ppe-list', {
          params: { companyCode: companyCode.value }
        });
        
        if (res.code === 200) {
          ppeList.value = res.data.filter(item => item.quantity > 0);
          if (ppeList.value.length === 0) {
            ElMessage.warning('当前没有可领用的物品');
          }
        } else {
          ElMessage.error(res.msg || '获取物品列表失败');
        }
      } catch (error) {
        console.error('获取物品列表失败:', error);
        ElMessage.error('获取物品列表失败，请检查网络');
      } finally {
        loading.value = false;
      }
    };
    
    // 提交领用
    const handleSubmit = async () => {
      try {
        await formRef.value.validate();
        
        if (!companyCode.value) {
          ElMessage.error('缺少公司代码');
          return;
        }
        
        loading.value = true;
        
        const res = await request.post('/user/quick-outbound', {
          companyCode: companyCode.value,
          employeeName: form.employeeName,
          employeePhone: form.employeePhone,
          ppeId: form.ppeId,
          quantity: form.quantity,
          purpose: form.purpose
        });
        
        if (res.code === 200) {
          success.value = true;
          outboundNo.value = res.data.outboundNo;
          ElMessage.success('领用成功！');
        } else {
          ElMessage.error(res.msg || '领用失败');
        }
      } catch (error) {
        console.error('领用失败:', error);
        ElMessage.error('领用失败，请检查网络');
      } finally {
        loading.value = false;
      }
    };
    
    // 重置表单
    const resetForm = () => {
      success.value = false;
      form.employeeName = '';
      form.employeePhone = '';
      form.ppeId = null;
      form.quantity = 1;
      form.purpose = '';
      outboundNo.value = '';
      fetchPPEList();
    };
    
    onMounted(() => {
      fetchPPEList();
    });
    
    return {
      form,
      rules,
      formRef,
      loading,
      success,
      ppeList,
      companyName,
      outboundNo,
      maxQuantity,
      selectedItemName,
      selectedItemUnit,
      handleSubmit,
      resetForm
    };
  }
};
</script>

<style scoped>
.quick-outbound {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.header {
  text-align: center;
  padding: 20px 0;
}

.header h2 {
  margin: 0;
  color: #303133;
  font-size: 22px;
}

.subtitle {
  margin: 5px 0 0;
  color: #909399;
  font-size: 14px;
}

.outbound-form {
  max-width: 400px;
  margin: 0 auto;
}

.success-card {
  max-width: 400px;
  margin: 0 auto;
  text-align: center;
  padding: 30px;
}

.success-icon {
  margin-bottom: 20px;
}

.success-info {
  color: #606266;
  line-height: 1.8;
  margin-top: 15px;
}

/* 手机端适配 */
@media (max-width: 768px) {
  .quick-outbound {
    padding: 10px;
  }
  
  .header {
    padding: 15px 0;
  }
  
  .header h2 {
    font-size: 20px;
  }
  
  .outbound-form,
  .success-card {
    margin: 0 -5px;
  }
}
</style>