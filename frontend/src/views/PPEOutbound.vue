<template>
  <div class="ppe-outbound">
    <h3>出库管理</h3>
    
    <el-card class="outbound-form">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="选择用品" prop="ppeId">
          <el-select v-model="form.ppeId" placeholder="请选择用品" style="width: 100%">
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

        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入11位手机号" maxlength="11" />
        </el-form-item>
        
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" placeholder="请输入备注" />
        </el-form-item>

        <!-- 智能识别填单 -->
        <el-divider>智能识别填单</el-divider>
        
        <el-form-item label="智能识别">
          <el-input 
            v-model="aiNote" 
            type="textarea" 
            :rows="3" 
            placeholder="粘贴语音转文字内容或输入自然语言描述，如：张三 13812345678 领5个安全帽 车间用"
          />
          <el-button 
            type="success" 
            @click="handleAIRecognize" 
            :loading="aiLoading"
            style="margin-top: 10px;"
          >
            开始识别
          </el-button>
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
        <el-table-column prop="ppeName" label="用品名称" />
        <el-table-column prop="quantity" label="出库数量" width="100" />
        <el-table-column prop="receiver" label="领用人" width="100" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
        <el-table-column prop="createTime" label="出库时间" width="180" />
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { reactive, ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../utils/request';

export default {
  name: 'PPEOutbound',
  setup() {
    const loading = ref(false);
    const aiLoading = ref(false);
    const ppeList = ref([]);
    const recordList = ref([]);
    const formRef = ref(null);
    const aiNote = ref('');
    
    const form = reactive({
      ppeId: null,
      quantity: 1,
      receiver: '',
      phone: '',
      remark: ''
    });
    
    const rules = {
      ppeId: [{ required: true, message: '请选择用品', trigger: 'change' }],
      quantity: [{ required: true, message: '请输入出库数量', trigger: 'blur' }],
      receiver: [{ required: true, message: '请输入领用人', trigger: 'blur' }],
      phone: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1\d{10}$/, message: '手机号必须为11位数字', trigger: 'blur' }
      ]
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

    // AI 智能识别
    const handleAIRecognize = async () => {
      if (!aiNote.value || aiNote.value.trim().length === 0) {
        ElMessage.warning('请输入识别内容');
        return;
      }

      aiLoading.value = true;
      try {
        const res = await request.post('/ppe/ai-parse-note', { note: aiNote.value });
        if (res.code === 200) {
          const data = res.data;
          
          // 填充表单
          if (data.name) form.receiver = data.name;
          if (data.phone) form.phone = data.phone;
          if (data.quantity) form.quantity = data.quantity;
          if (data.purpose) form.remark = data.purpose;
          
          // 匹配用品
          if (data.itemId) {
            form.ppeId = data.itemId;
          }
          
          ElMessage.success('识别成功，请检查并确认');
          aiNote.value = '';
        } else {
          ElMessage.error(res.msg || '识别失败');
        }
      } catch (error) {
        console.error('AI 识别失败:', error);
        ElMessage.error('识别失败，请重试');
      } finally {
        aiLoading.value = false;
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
      aiNote.value = '';
    };
    
    onMounted(() => {
      fetchPPEList();
      fetchRecords();
    });
    
    return {
      loading,
      aiLoading,
      ppeList,
      recordList,
      formRef,
      form,
      aiNote,
      rules,
      handleSubmit,
      handleReset,
      handleAIRecognize
    };
  }
};
</script>

<style scoped>
.outbound-form {
  max-width: 600px;
}
</style>