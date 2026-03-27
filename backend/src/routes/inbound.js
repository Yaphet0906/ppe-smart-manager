/**
 * 入库路由
 * 处理入库记录相关的API路由
 */

const express = require('express');
const router = express.Router();
const inboundController = require('../controllers/inboundController');

// GET /api/inbound - 获取入库记录列表
router.get('/', inboundController.getInbounds);

// GET /api/inbound/statistics - 获取入库统计信息
router.get('/statistics', inboundController.getStatistics);

// GET /api/inbound/item-statistics - 获取入库物品统计
router.get('/item-statistics', inboundController.getItemStatistics);

// GET /api/inbound/date-range - 按日期范围查询入库记录
router.get('/date-range', inboundController.getInboundsByDateRange);

// GET /api/inbound/:id - 获取单个入库记录详情
router.get('/:id', inboundController.getInboundById);

// POST /api/inbound - 创建入库记录
router.post('/', inboundController.createInbound);

module.exports = router;
