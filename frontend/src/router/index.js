import { createRouter, createWebHashHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Layout from '../views/Layout.vue';
import Dashboard from '../views/Dashboard.vue';
import PPEList from '../views/PPEList.vue';
import PPEInbound from '../views/PPEInbound.vue';
import PPEOutbound from '../views/PPEOutbound.vue';
import OCRInbound from '../views/OCRInbound.vue';
import QRCodeManage from '../views/QRCodeManage.vue';
import QuickOutbound from '../views/QuickOutbound.vue';
import ChangePassword from '../views/ChangePassword.vue';
import DataExport from '../views/DataExport.vue';

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
    meta: { public: true }
  },
  {
    path: '/change-password',
    name: 'ChangePassword',
    component: ChangePassword,
    meta: { public: true }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: Dashboard
      },
      {
        path: 'ppe-list',
        name: 'PPEList',
        component: PPEList
      },
      {
        path: 'ppe-inbound',
        name: 'PPEInbound',
        component: PPEInbound
      },
      {
        path: 'ppe-outbound',
        name: 'PPEOutbound',
        component: PPEOutbound
      },
      {
        path: 'ocr-inbound',
        name: 'OCRInbound',
        component: OCRInbound
      },
      {
        path: 'qrcode',
        name: 'QRCodeManage',
        component: QRCodeManage
      },
      {
        path: 'data-export',
        name: 'DataExport',
        component: DataExport
      }
    ]
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (!to.meta.public && !token) {
    next('/login');
  } else {
    next();
  }
});

export default router;