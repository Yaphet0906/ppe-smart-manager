import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import pinia from './store';
import ElementPlus from 'element-plus'; // 引入UI库
import 'element-plus/dist/index.css';
import request from './utils/request'; // 引入请求工具

const app = createApp(App);
// 全局挂载
app.config.globalProperties.$request = request;
app.use(router).use(pinia).use(ElementPlus).mount('#app');
