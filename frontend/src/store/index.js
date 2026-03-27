import { createPinia } from 'pinia';
import { defineStore } from 'pinia';

// 用户状态管理
export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: JSON.parse(localStorage.getItem('userInfo') || '{}')
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token,
    username: (state) => state.userInfo.name || '',
    companyId: (state) => state.userInfo.companyId || '',
    companyCode: (state) => state.userInfo.companyCode || '',
    companyName: (state) => state.userInfo.companyName || ''
  },
  
  actions: {
    setToken(token) {
      this.token = token;
      localStorage.setItem('token', token);
    },
    
    setUserInfo(info) {
      this.userInfo = info;
      localStorage.setItem('userInfo', JSON.stringify(info));
    },
    
    logout() {
      this.token = '';
      this.userInfo = {};
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
    }
  }
});

const pinia = createPinia();
export default pinia;
