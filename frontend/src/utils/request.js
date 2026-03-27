import axios from 'axios';
// 创建axios实例
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API || '/api',
  timeout: 5000 // 请求超时时间
});

// 请求拦截器（添加token）
service.interceptors.request.use(
  config => {
    // 从本地存储获取token（登录后存储）
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.error('请求错误：', error);
    return Promise.reject(error);
  }
);

// 响应拦截器（统一错误处理）
service.interceptors.response.use(
  response => {
    const res = response.data;
    // 自定义成功码（和后端约定）
    if (res.code !== 200) {
      ElMessage.error(res.msg || '请求失败');
      return Promise.reject(res);
    }
    return res;
  },
  error => {
    console.error('响应错误：', error);
    ElMessage.error(error.msg || '服务器错误');
    return Promise.reject(error);
  }
);

export default service;
