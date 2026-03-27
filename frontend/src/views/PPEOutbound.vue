<template>
  <div class="ppe-outbound">
    <h3>出库管理</h3>
    
    <el-card class="outbound-form">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="选择设备" prop="ppeId">
          <el-select v-model="form.ppeId" placeholder="请选择设备" style="width: 100%">
            <el-option 
              v-for="item in ppeList" 
              :key="item.id" 
              :label="`${item.name} (库存: ${item.stock})`" 
              :value="item.id" 
              :disabled="item.stock === 0"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="出库数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        
        <el-form-item label="领用人" prop="receiver">
          <el-input v-model="form.receiver" placeholder="请输入领用人姓名" />
        </el-form-item>
        
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" rows="3" />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSubmit">确认出库</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <h3 style="margin-top: 30px;">出库记录</h3>
    <el-card>
      <el-table :data="recordList" v-loading="loading" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="ppeName" label="设备名称" />
        <el-table-column prop="quantity" label="出库数量" width="100" />
        <el-table-column prop="receiver" label="领用人" width="120" />
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
        <el-table-column prop="createTime" label="出库时间" width="180" />
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { reactive, ref, onMounted } from 'vue';
import request from '../utils/request';

export default {
  name: 'PPEOutbound',
  setup() {
    const loading = ref(false);
    const ppeList = ref([]);
    const recordList = ref([]);
    const formRef = ref(null);
    
    const form = reactive({
      ppeId: null,
      quantity: 1,
      receiver: '',
      remark: ''
    });
    
    const rules = {
      ppeId: [{ required: true, message: '请选择设备', trigger: 'change' }],
      quantity: [{ required: true, message: '请输入出库数量', trigger: 'blur' }],
      receiver: [{ required: true, message: '请输入领用人', trigger: 'blur' }]
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
        const res = await request.get('/ppe/outbound-records');
        if (res.code === 200) {
          recordList.value = res.data;
        }
      } catch (error) {
        console.error('获取出库记录失败:', error);
      } finally {
        loading.value = false;
      }
    };
    
    const handleSubmit = async () => {
      try {
        await formRef.value.validate();
        const res = await request.post('/ppe/outbound', form);
        if (res.code === 200) {
          ElMessage.success('出库成功');
          handleReset();
          fetchPPEList();
          fetchRecords();
        }
      } catch (error) {
        console.error('出库失败:', error);
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
      form,
      rules,
      handleSubmit,
      handleReset
    };
  }
};
</script>

<style scoped>
.outbound-form {
  max-width: 600px;
}
</style>
