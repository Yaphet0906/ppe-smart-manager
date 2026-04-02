<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2 class="login-title">PPE智能管理系统</h2>
        <p class="login-subtitle">劳动防护用品库存管理</p>
      </template>
      
      <el-form :model="form" :rules="rules" ref="loginForm" label-position="top">
        <el-form-item label="公司代码" prop="companyCode">
          <el-input 
            v-model="form.companyCode" 
            placeholder="请输入公司代码（如：DEMO001）"
            prefix-icon="OfficeBuilding"
          />
        </el-form-item>
        
        <el-form-item label="手机号" prop="phone">
          <el-input 
            v-model="form.phone" 
            placeholder="请输入手机号"
            prefix-icon="Iphone"
          />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码"
            prefix-icon="Lock"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            :loading="loading"
            @click="handleLogin"
            style="width: 100%"
          >
            登录
          </el-button>
        </el-form-item>
        
        <div class="login-options">
          <el-link type="primary" @click="showRegister = true">新公司注册</el-link>
        </div>
      </el-form>
    </el-card>
    
    <!-- 注册公司弹窗 -->
    <el-dialog v-model="showRegister" title="新公司注册" width="90%" :width="isMobile ? '90%' : '500px'">
      <el-form :model="registerForm" :rules="registerRules" ref="registerFormRef" label-position="top">
        <el-form-item label="公司名称" prop="companyName">
          <el-input v-model="registerForm.companyName" placeholder="请输入公司名称" />
        </el-form-item>
        
        <el-form-item label="公司代码" prop="companyCode">
          <el-input v-model="registerForm.companyCode" placeholder="请输入公司代码（英文+数字，如：ABC001）" />
        </el-form-item>
        
        <el-form-item label="联系人姓名" prop="contactName">
          <el-input v-model="registerForm.contactName" placeholder="请输入联系人姓名" />
        </el-form-item>
        
        <el-form-item label="联系人手机号" prop="contactPhone">
          <el-input v-model="registerForm.contactPhone" placeholder="请输入联系人手机号" />
        </el-form-item>
        
        <el-form-item label="管理员密码" prop="adminPassword">
          <el-input v-model="registerForm.adminPassword" type="password" placeholder="请设置管理员密码" />
        </el-form-item>
        
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="registerForm.confirmPassword" type="password" placeholder="请再次输入密码" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showRegister = false">取消</el-button>
        <el-button type="primary" :loading="registerLoading" @click="handleRegister">注册</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { reactive, ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store';
import request from '../utils/request';
import { OfficeBuilding, Iphone, Lock } from '@element-plus/icons-vue';

export default {
  name: 'Login',
  components: {
    OfficeBuilding, Iphone, Lock
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const loginForm = ref(null);
    const registerFormRef = ref(null);
    const loading = ref(false);
    const registerLoading = ref(false);
    const showRegister = ref(false);
    const isMobile = ref(false);
    
    // 检测是否为手机端
    const checkMobile = () => {
      isMobile.value = window.innerWidth <= 768;
    };
    
    onMounted(() => {
      checkMobile();
      window.addEventListener('resize', checkMobile);
    });
    
    onUnmounted(() => {
      window.removeEventListener('resize', checkMobile);
    });
    
    const form = reactive({
      companyCode: '',
      phone: '',
      password: ''
    });
    
    const rules = {
      companyCode: [{ required: true, message: '请输入公司代码', trigger: 'blur' }],
      phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
      password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
    };
    
    const registerForm = reactive({
      companyName: '',
      companyCode: '',
      contactName: '',
      contactPhone: '',
      adminPassword: '',
      confirmPassword: ''
    });
    
    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== registerForm.adminPassword) {
        callback(new Error('两次输入的密码不一致'));
      } else {
        callback();
      }
    };
    
    const registerRules = {
      companyName: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
      companyCode: [
        { required: true, message: '请输入公司代码', trigger: 'blur' },
        { pattern: /^[a-zA-Z0-9]+$/, message: '公司代码只能包含英文和数字', trigger: 'blur' }
      ],
      contactName: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
      contactPhone: [
        { required: true, message: '请输入联系人手机号', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
      ],
      adminPassword: [
        { required: true, message: '请设置管理员密码', trigger: 'blur' },
        { min: 6, message: '密码至少6位', trigger: 'blur' }
      ],
      confirmPassword: [
        { required: true, message: '请再次输入密码', trigger: 'blur' },
        { validator: validateConfirmPassword, trigger: 'blur' }
      ]
    };
    
    const handleLogin = async () => {
      try {
        await loginForm.value.validate();
        loading.value = true;
        
        const res = await request.post('/user/login', form);
        
        if (res.code === 200) {
          userStore.setToken(res.data.token);
          userStore.setUserInfo(res.data.userInfo);
          
          // 检查是否首次登录
          if (res.data.isFirstLogin) {
            ElMessage.warning('首次登录，请修改密码');
            router.push('/change-password');
          } else {
            ElMessage.success('登录成功');
            router.push('/home');
          }
        } else {
          ElMessage.error(res.msg || '登录失败');
        }
      } catch (error) {
        console.error('登录失败:', error);
        ElMessage.error('登录失败，请检查网络');
      } finally {
        loading.value = false;
      }
    };
    
    const handleRegister = async () => {
      try {
        await registerFormRef.value.validate();
        registerLoading.value = true;
        
        const res = await request.post('/user/register-company', {
          companyName: registerForm.companyName,
          companyCode: registerForm.companyCode,
          contactName: registerForm.contactName,
          contactPhone: registerForm.contactPhone,
          adminPassword: registerForm.adminPassword
        });
        
        if (res.code === 200) {
          ElMessage.success('注册成功，请使用公司代码和手机号登录');
          showRegister.value = false;
          // 自动填充登录表单
          form.companyCode = registerForm.companyCode;
          form.phone = registerForm.contactPhone;
        } else {
          ElMessage.error(res.msg || '注册失败');
        }
      } catch (error) {
        console.error('注册失败:', error);
        ElMessage.error('注册失败，请检查网络');
      } finally {
        registerLoading.value = false;
      }
    };
    
    return {
      form,
      rules,
      loginForm,
      loading,
      showRegister,
      registerForm,
      registerRules,
      registerFormRef,
      registerLoading,
      isMobile,
      handleLogin,
      handleRegister
    };
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 400px;
  max-width: 100%;
}

.login-title {
  text-align: center;
  margin: 0;
  color: #333;
  font-size: 20px;
}

.login-subtitle {
  text-align: center;
  margin: 5px 0 0;
  color: #666;
  font-size: 14px;
}

.login-options {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

/* 手机端适配 */
@media (max-width: 768px) {
  .login-container {
    padding: 10px;
    align-items: flex-start;
    padding-top: 50px;
  }
  
  .login-card {
    width: 100%;
  }
  
  .login-title {
    font-size: 18px;
  }
  
  .login-subtitle {
    font-size: 12px;
  }
}
</style>