/**
 * 用户路由
 * 处理用户相关的API路由
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST /api/users/login - 用户登录
router.post('/login', userController.login);

// GET /api/users - 获取用户列表
router.get('/', userController.getUsers);

// GET /api/users/statistics - 获取用户统计信息
router.get('/statistics', userController.getUserStatistics);

// GET /api/users/:id - 获取单个用户信息
router.get('/:id', userController.getUserById);

// POST /api/users - 创建用户
router.post('/', userController.createUser);

// PUT /api/users/:id - 更新用户
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - 删除用户
router.delete('/:id', userController.deleteUser);

module.exports = router;
