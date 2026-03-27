<template>
  <div class="change-password-container">
    <el-card class="change-password-card">
      <template #header>
        <h2>修改密码</h2>
        <p class="subtitle">首次登录，请修改初始密码</p>
      </template>
      
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item v-if="!isFirstLogin" label="原密码" prop="oldPassword">
          <el-input 
            v-model="form.oldPassword" 
            type="password"
            placeholder="请输入原密码"
            prefix-icon="Lock"
          />
        </el-form-item>
        
        <el-form-item label="新密码" prop="newPassword">
          <el-input 
            v-model="form.newPassword" 
            type="password"
            placeholder="请输入新密码（至少6位）"
            prefix-icon="Lock"
          />
        </el-form-item>
        
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input 
            v-model="form.confirmPassword" 
            type="password"
            placeholder="请再次输入新密码"
            prefix-icon="Lock"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            :loading="loading"
            @click="handleSubmit"
            style="width: 100%"
          >
            确认修改
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store';
import request from '../utils/request';
import { Lock } from '@element-plus/icons-vue';

export default {
  name: 'ChangePassword',
  components: {
    Lock
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const formRef = ref(null);
    const loading = ref(false);
    const isFirstLogin = ref(true);
    
    const form = reactive({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    // 检查是否首次登录
    onMounted(() => {
      // 从 userInfo 获取首次登录状态（实际应该在登录时存储）
      // 这里简化处理，默认都是首次登录
    });
    
    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== form.newPassword) {
        callback(new Error('两次输入的密码不一致'));
      } else {
        callback();
      }
    };
    
    const rules = {
      newPassword: [
        { required: true, message: '请输入新密码', trigger: 'blur' },
        { min: 6, message: '密码至少6位', trigger: 'blur' }
      ],
      confirmPassword: [
        { required: true, message: '请再次输入新密码', trigger: 'blur' },
        { validator: validateConfirmPassword, trigger: 'blur' }
      ]
    };
    
    // 如果不是首次登录，需要验证原密码
    if (!isFirstLogin.value) {
      rules.oldPassword = [{ required: true, message: '请输入原密码', trigger: 'blur' }];
    }
    
    const handleSubmit = async () => {
      try {
        await formRef.value.validate();
        loading.value = true;
        
        const res = await request.post('/user/change-password', {
          oldPassword: form.oldPassword,
          newPassword: form.newPassword
        });
        
        if (res.code === 200) {
          ElMessage.success('密码修改成功，请重新登录');
          userStore.logout();
          router.push('/login');
        } else {
          ElMessage.error(res.msg || '修改失败');
        }
      } catch (error) {
        console.error('修改密码失败:', error);
        ElMessage.error('修改失败，请检查网络');
      } finally {
        loading.value = false;
      }
    };
    
    return {
      form,
      rules,
      formRef,
      loading,
      isFirstLogin,
      handleSubmit
    };
  }
};
</script>

<style scoped>
.change-password-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.change-password-card {
  width: 400px;
  max-width: 100%;
}

.change-password-card h2 {
  text-align: center;
  margin: 0;
  color: #333;
}

.subtitle {
  text-align: center;
  color: #e6a23c;
  font-size: 14px;
  margin: 10px 0 0;
}

/* 手机端适配 */
@media (max-width: 768px) {
  .change-password-container {
    padding: 10px;
    align-items: flex-start;
    padding-top: 50px;
  }
  
  .change-password-card {
    width: 100%;
  }
}
</style>