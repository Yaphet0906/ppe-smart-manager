/**
 * 库存路由
 * 处理库存相关的API路由
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// GET /api/inventory - 获取库存列表
router.get('/', inventoryController.getInventory);

// GET /api/inventory/statistics - 获取库存统计信息
router.get('/statistics', inventoryController.getStatistics);

// GET /api/inventory/brands - 获取品牌列表
router.get('/brands', inventoryController.getBrands);

// GET /api/inventory/alerts/la-cert-expiring - 获取LA证书过期预警
router.get('/alerts/la-cert-expiring', inventoryController.getLACertExpiring);

// GET /api/inventory/alerts/low-stock - 获取低库存预警
router.get('/alerts/low-stock', inventoryController.getLowStock);

// GET /api/inventory/alerts/expiring - 获取有效期预警
router.get('/alerts/expiring', inventoryController.getExpiring);

// GET /api/inventory/:id - 获取单个物品详情
router.get('/:id', inventoryController.getInventoryById);

// POST /api/inventory - 创建物品
router.post('/', inventoryController.createItem);

// PUT /api/inventory/:id - 更新物品
router.put('/:id', inventoryController.updateItem);

// DELETE /api/inventory/:id - 删除物品
router.delete('/:id', inventoryController.deleteItem);

module.exports = router;
