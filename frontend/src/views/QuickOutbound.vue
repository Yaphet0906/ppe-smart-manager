<template>
  <div class="quick-outbound">
    <h2 class="page-title">📦 扫码领用</h2>
    <p class="desc">无需登录，快速领用劳动防护用品</p>

    <el-card class="outbound-form" shadow="never">
      <el-form 
        :model="form" 
        :rules="rules" 
        ref="formRef" 
        label-position="top"
        class="mobile-form"
      >
        <el-form-item label="公司名称" prop="companyName">
          <el-input 
            v-model="form.companyName" 
            placeholder="请输入公司名称"
            size="large"
            clearable
          />
        </el-form-item>

        <el-form-item label="领用人" prop="employeeName">
          <el-input 
            v-model="form.employeeName" 
            placeholder="请输入姓名"
            size="large"
            clearable
          />
        </el-form-item>

        <el-form-item label="手机号" prop="employeePhone">
          <el-input 
            v-model="form.employeePhone" 
            placeholder="请输入11位手机号" 
            maxlength="11"
            size="large"
            clearable
            inputmode="tel"
            pattern="[0-9]*"
            @input="form.employeePhone = form.employeePhone.replace(/\D/g, '')"
          />
        </el-form-item>

        <el-form-item label="选择用品" prop="itemId">
          <el-select 
            v-model="form.itemId" 
            placeholder="请选择用品" 
            style="width: 100%"
            size="large"
            filterable
          >
            <el-option
              v-for="item in itemList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="数量" prop="quantity">
          <div class="quantity-control">
            <el-button 
              circle 
              :disabled="form.quantity <= 1"
              @click="form.quantity--"
            >-</el-button>
            <span class="quantity-display">{{ form.quantity }}</span>
            <el-button 
              circle 
              @click="form.quantity++"
            >+</el-button>
          </div>
        </el-form-item>

        <el-form-item class="submit-item">
          <el-button 
            type="primary" 
            @click="handleSubmit" 
            size="large"
            class="submit-btn"
          >
            <el-icon><Check /></el-icon>
            确认领用
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { reactive, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Check } from '@element-plus/icons-vue';
import request from '../utils/request';

export default {
  name: 'QuickOutbound',
  components: { Check },
  setup() {
    const route = useRoute();
    const itemList = ref([]);
    const formRef = ref(null);

    const form = reactive({
      companyName: route.query.company || '',
      employeeName: '',
      employeePhone: '',
      itemId: null,
      quantity: 1
    });

    const rules = {
      companyName: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
      employeeName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
      employeePhone: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1\d{10}$/, message: '手机号格式错误', trigger: 'blur' }
      ],
      itemId: [{ required: true, message: '请选择用品', trigger: 'change' }],
      quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
    };

    const fetchItems = async () => {
      if (!form.companyName) return;
      try {
        const res = await request.get('/ppe/public-list', { params: { companyName: form.companyName } });
        if (res.code === 200) {
          itemList.value = res.data;
        }
      } catch (error) {
        console.error('获取用品列表失败:', error);
      }
    };

    const handleSubmit = async () => {
      try {
        await formRef.value.validate();
        const res = await request.post('/ppe/quick-outbound', form);
        if (res.code === 200) {
          ElMessage.success('领用成功');
          form.employeeName = '';
          form.employeePhone = '';
          form.itemId = null;
          form.quantity = 1;
        }
      } catch (error) {
        ElMessage.error('领用失败');
      }
    };

    onMounted(() => {
      fetchItems();
    });

    return {
      form,
      rules,
      formRef,
      itemList,
      handleSubmit
    };
  }
};
</script>

<style scoped>
.quick-outbound {
  max-width: 100%;
  min-height: 100vh;
  padding: 16px;
  background: #f5f7fa;
}

.page-title {
  text-align: center;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  margin-top: 24px;
}

.desc {
  color: #909399;
  text-align: center;
  font-size: 14px;
  margin-bottom: 24px;
}

.outbound-form {
  background: #fff;
  border-radius: 12px;
}

.mobile-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
  padding-bottom: 8px;
}

.mobile-form :deep(.el-input__inner) {
  height: 44px;
  line-height: 44px;
}

.quantity-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 0;
}

.quantity-control .el-button {
  width: 40px;
  height: 40px;
  font-size: 18px;
  font-weight: bold;
}

.quantity-display {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  min-width: 48px;
  text-align: center;
}

.submit-item {
  margin-top: 32px;
  margin-bottom: 0 !important;
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
}

.submit-btn .el-icon {
  margin-right: 4px;
}

/* 平板及以上设备 */
@media (min-width: 768px) {
  .quick-outbound {
    max-width: 500px;
    margin: 0 auto;
    padding: 40px 20px;
  }
  
  .page-title {
    font-size: 28px;
    margin-top: 40px;
  }
}

/* 安全区域适配 iPhone X+ */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .quick-outbound {
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }
}
</style>