/**
 * 出库路由
 * 处理出库记录相关的API路由
 */

const express = require('express');
const router = express.Router();
const outboundController = require('../controllers/outboundController');

// GET /api/outbound - 获取出库记录列表
router.get('/', outboundController.getOutbounds);

// GET /api/outbound/statistics - 获取出库统计信息
router.get('/statistics', outboundController.getStatistics);

// GET /api/outbound/item-statistics - 获取出库物品统计
router.get('/item-statistics', outboundController.getItemStatistics);

// GET /api/outbound/employee-statistics - 获取员工领用统计
router.get('/employee-statistics', outboundController.getEmployeeStatistics);

// GET /api/outbound/employee/:employeeId - 按员工查询出库记录
router.get('/employee/:employeeId', outboundController.getOutboundsByEmployee);

// GET /api/outbound/:id - 获取单个出库记录详情
router.get('/:id', outboundController.getOutboundById);

// POST /api/outbound - 创建出库记录
router.post('/', outboundController.createOutbound);

module.exports = router;
