import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Layout from '../views/Layout.vue';
import Dashboard from '../views/Dashboard.vue';
import PPEList from '../views/PPEList.vue';
import PPEInbound from '../views/PPEInbound.vue';
import PPEOutbound from '../views/PPEOutbound.vue';
import Alerts from '../views/Alerts.vue';
import QuickOutbound from '../views/QuickOutbound.vue';
import QRCodeManage from '../views/QRCodeManage.vue';
import OCRInbound from '../views/OCRInbound.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { public: true }
  },
  {
    path: '/quick-outbound',
    name: 'QuickOutbound',
    component: QuickOutbound,
    meta: { public: true, title: '扫码领用' }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: { title: '首页' }
      },
      {
        path: 'ppe-list',
        name: 'PPEList',
        component: PPEList,
        meta: { title: 'PPE设备管理' }
      },
      {
        path: 'ppe-inbound',
        name: 'PPEInbound',
        component: PPEInbound,
        meta: { title: '入库管理' }
      },
      {
        path: 'ppe-outbound',
        name: 'PPEOutbound',
        component: PPEOutbound,
        meta: { title: '出库管理' }
      },
      {
        path: 'alerts',
        name: 'Alerts',
        component: Alerts,
        meta: { title: '预警管理' }
      },
      {
        path: 'qrcode',
        name: 'QRCodeManage',
        component: QRCodeManage,
        meta: { title: '二维码管理' }
      },
      {
        path: 'ocr-inbound',
        name: 'OCRInbound',
        component: OCRInbound,
        meta: { title: '截图入库' }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (!to.meta.public && !token) {
    next('/login');
  } else {
    next();
  }
});

export default router;
