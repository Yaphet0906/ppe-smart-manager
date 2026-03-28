<template>
  <div class="quick-outbound">
    <h2>扫码领用</h2>
    <p class="desc">无需登录，快速领用劳动防护用品</p>

    <el-card class="outbound-form">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="公司代码" prop="companyCode">
          <el-input v-model="form.companyCode" placeholder="请输入公司代码" />
        </el-form-item>

        <el-form-item label="领用人" prop="employeeName">
          <el-input v-model="form.employeeName" placeholder="请输入姓名" />
        </el-form-item>

        <el-form-item label="手机号" prop="employeePhone">
          <el-input v-model="form.employeePhone" placeholder="请输入11位手机号" maxlength="11" />
        </el-form-item>

        <el-form-item label="选择用品" prop="itemId">
          <el-select v-model="form.itemId" placeholder="请选择用品" style="width: 100%">
            <el-option
              v-for="item in itemList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" style="width: 100%" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" style="width: 100%">确认领用</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { reactive, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '../utils/request';

export default {
  name: 'QuickOutbound',
  setup() {
    const route = useRoute();
    const itemList = ref([]);
    const formRef = ref(null);

    const form = reactive({
      companyCode: route.query.code || '',
      employeeName: '',
      employeePhone: '',
      itemId: null,
      quantity: 1
    });

    const rules = {
      companyCode: [{ required: true, message: '请输入公司代码', trigger: 'blur' }],
      employeeName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
      employeePhone: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1\d{10}$/, message: '手机号格式错误', trigger: 'blur' }
      ],
      itemId: [{ required: true, message: '请选择用品', trigger: 'change' }],
      quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
    };

    const fetchItems = async () => {
      if (!form.companyCode) return;
      try {
        const res = await request.post('/ppe/public-list', { companyCode: form.companyCode });
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
  max-width: 500px;
  margin: 50px auto;
  padding: 20px;
}

.desc {
  color: #666;
  text-align: center;
  margin-bottom: 30px;
}

.outbound-form {
  padding: 20px;
}
</style>