<template>
  <el-container class="layout-container">
    <el-aside width="200px" class="aside">
      <div class="logo">
        <h3>PPE管理</h3>
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/home">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/ppe-list">
          <el-icon><Box /></el-icon>
          <span>库存管理</span>
        </el-menu-item>
        <el-menu-item index="/ppe-inbound">
          <el-icon><Download /></el-icon>
          <span>入库</span>
        </el-menu-item>
        <el-menu-item index="/ppe-outbound">
          <el-icon><Upload /></el-icon>
          <span>出库</span>
        </el-menu-item>
        <el-menu-item index="/ocr-inbound">
          <el-icon><Camera /></el-icon>
          <span>截图入库</span>
        </el-menu-item>
        <el-menu-item index="/qrcode">
          <el-icon><FullScreen /></el-icon>
          <span>二维码</span>
        </el-menu-item>
        <el-menu-item index="/data-export">
          <el-icon><Download /></el-icon>
          <span>数据导出</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ userStore.userInfo?.name || '用户' }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>

    <!-- 个人信息抽屉 -->
    <el-drawer v-model="profileVisible" title="个人信息" size="400px">
      <el-descriptions :column="1" border v-if="userProfile">
        <el-descriptions-item label="用户名">{{ userProfile.name }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ userProfile.role === 'admin' ? '管理员' : '操作员' }}</el-descriptions-item>
        <el-descriptions-item label="所属公司">{{ userProfile.company_name }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ userProfile.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ userProfile.email || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </el-container>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store';
import { HomeFilled, Box, Download, Upload, ArrowDown, Camera, FullScreen, User } from '@element-plus/icons-vue';
import request from '../utils/request';

export default {
  name: 'Layout',
  components: {
    HomeFilled, Box, Download, Upload, ArrowDown, Camera, FullScreen, User
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const profileVisible = ref(false);
    const userProfile = ref(null);

    const handleCommand = async (command) => {
      if (command === 'logout') {
        userStore.logout();
        router.push('/login');
      } else if (command === 'profile') {
        // 获取用户信息
        try {
          const res = await request.get('/user/profile');
          if (res.code === 200) {
            userProfile.value = res.data;
            profileVisible.value = true;
          }
        } catch (error) {
          console.error('获取用户信息失败:', error);
        }
      }
    };

    return {
      userStore,
      profileVisible,
      userProfile,
      handleCommand
    };
  }
};
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background-color: #304156;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-bottom: 1px solid #1f2d3d;
}

.logo h3 {
  margin: 0;
  font-size: 16px;
}

.header {
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.main {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>