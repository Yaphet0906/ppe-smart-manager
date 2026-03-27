<template>
  <el-container class="layout-container">
    <!-- 桌面端侧边栏 -->
    <el-aside width="200px" class="aside desktop-only">
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
        <el-menu-item index="/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/ppe-list">
          <el-icon><Box /></el-icon>
          <span>设备管理</span>
        </el-menu-item>
        <el-menu-item index="/ppe-inbound">
          <el-icon><Download /></el-icon>
          <span>入库</span>
        </el-menu-item>
        <el-menu-item index="/ppe-outbound">
          <el-icon><Upload /></el-icon>
          <span>出库</span>
        </el-menu-item>
        <el-menu-item index="/alerts">
          <el-icon><Warning /></el-icon>
          <span>预警</span>
        </el-menu-item>
        <el-menu-item index="/qrcode">
          <el-icon><FullScreen /></el-icon>
          <span>二维码</span>
        </el-menu-item>
        <el-menu-item index="/ocr-inbound">
          <el-icon><Camera /></el-icon>
          <span>截图入库</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <!-- 手机端顶部导航 -->
    <div class="mobile-header mobile-only">
      <div class="mobile-logo">PPE管理</div>
      <div class="mobile-menu-btn" @click="showMobileMenu = !showMobileMenu">
        <el-icon><Menu /></el-icon>
      </div>
    </div>
    
    <!-- 手机端菜单弹窗 -->
    <div class="mobile-menu mobile-only" v-if="showMobileMenu" @click="showMobileMenu = false">
      <div class="mobile-menu-content" @click.stop>
        <div class="mobile-menu-header">
          <span>菜单</span>
          <el-icon @click="showMobileMenu = false"><Close /></el-icon>
        </div>
        <div class="mobile-menu-items">
          <div class="mobile-menu-item" :class="{ active: $route.path === '/dashboard' }" @click="navigateTo('/dashboard')">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </div>
          <div class="mobile-menu-item" :class="{ active: $route.path === '/ppe-list' }" @click="navigateTo('/ppe-list')">
            <el-icon><Box /></el-icon>
            <span>设备管理</span>
          </div>
          <div class="mobile-menu-item" :class="{ active: $route.path === '/ppe-inbound' }" @click="navigateTo('/ppe-inbound')">
            <el-icon><Download /></el-icon>
            <span>入库</span>
          </div>
          <div class="mobile-menu-item" :class="{ active: $route.path === '/ppe-outbound' }" @click="navigateTo('/ppe-outbound')">
            <el-icon><Upload /></el-icon>
            <span>出库</span>
          </div>
          <div class="mobile-menu-item" :class="{ active: $route.path === '/alerts' }" @click="navigateTo('/alerts')">
            <el-icon><Warning /></el-icon>
            <span>预警</span>
          </div>
          <div class="mobile-menu-item" :class="{ active: $route.path === '/qrcode' }" @click="navigateTo('/qrcode')">
            <el-icon><FullScreen /></el-icon>
            <span>二维码</span>
          </div>
          <div class="mobile-menu-item" :class="{ active: $route.path === '/ocr-inbound' }" @click="navigateTo('/ocr-inbound')">
            <el-icon><Camera /></el-icon>
            <span>截图入库</span>
          </div>
          <div class="mobile-menu-item" @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
            <span>退出登录</span>
          </div>
        </div>
      </div>
    </div>
    
    <el-container>
      <!-- 桌面端头部 -->
      <el-header class="header desktop-only">
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              {{ userStore.userInfo?.name || '用户' }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 手机端用户信息 -->
      <div class="mobile-user-info mobile-only">
        {{ userStore.userInfo?.companyName || '公司' }} - {{ userStore.userInfo?.name || '用户' }}
      </div>
      
      <el-main class="main" :class="{ 'mobile-main': isMobile }">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store';
import { HomeFilled, Box, Download, Upload, Warning, ArrowDown, Menu, Close, SwitchButton, FullScreen, Camera } from '@element-plus/icons-vue';

export default {
  name: 'Layout',
  components: {
    HomeFilled, Box, Download, Upload, Warning, ArrowDown, Menu, Close, SwitchButton, FullScreen, Camera
  },
  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const showMobileMenu = ref(false);
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
    
    const handleCommand = (command) => {
      if (command === 'logout') {
        handleLogout();
      }
    };
    
    const handleLogout = () => {
      userStore.logout();
      router.push('/login');
      ElMessage.success('已退出登录');
    };
    
    const navigateTo = (path) => {
      showMobileMenu.value = false;
      router.push(path);
    };
    
    return {
      userStore,
      showMobileMenu,
      isMobile,
      handleCommand,
      handleLogout,
      navigateTo
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

/* 手机端样式 */
.mobile-only {
  display: none;
}

.desktop-only {
  display: block;
}

@media (max-width: 768px) {
  .mobile-only {
    display: flex;
  }
  
  .desktop-only {
    display: none !important;
  }
  
  .mobile-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    background-color: #304156;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 15px;
    z-index: 100;
  }
  
  .mobile-logo {
    font-size: 16px;
    font-weight: bold;
  }
  
  .mobile-menu-btn {
    font-size: 24px;
    cursor: pointer;
  }
  
  .mobile-menu {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 200;
    display: flex;
    justify-content: flex-end;
  }
  
  .mobile-menu-content {
    width: 70%;
    max-width: 280px;
    background-color: #304156;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .mobile-menu-header {
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 15px;
    color: #fff;
    border-bottom: 1px solid #1f2d3d;
    font-size: 16px;
  }
  
  .mobile-menu-items {
    flex: 1;
    padding: 10px 0;
  }
  
  .mobile-menu-item {
    display: flex;
    align-items: center;
    padding: 15px;
    color: #bfcbd9;
    cursor: pointer;
    gap: 10px;
  }
  
  .mobile-menu-item.active {
    color: #409EFF;
    background-color: #263445;
  }
  
  .mobile-menu-item:active {
    background-color: #1f2d3d;
  }
  
  .mobile-user-info {
    position: fixed;
    top: 50px;
    left: 0;
    right: 0;
    height: 35px;
    background-color: #f0f2f5;
    display: flex;
    align-items: center;
    padding: 0 15px;
    font-size: 12px;
    color: #666;
    z-index: 99;
    border-bottom: 1px solid #dcdfe6;
  }
  
  .mobile-main {
    margin-top: 85px;
    padding: 10px;
    min-height: calc(100vh - 85px);
  }
}
</style>