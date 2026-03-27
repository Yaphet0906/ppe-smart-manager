/**
 * 导出路由
 * 处理Excel导出相关的API路由
 */

const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

// GET /api/export/inbound - 导出入库记录Excel
router.get('/inbound', exportController.exportInbound);

// GET /api/export/outbound - 导出发放记录Excel
router.get('/outbound', exportController.exportOutbound);

// GET /api/export/inventory - 导出库存报表Excel
router.get('/inventory', exportController.exportInventory);

module.exports = router;
