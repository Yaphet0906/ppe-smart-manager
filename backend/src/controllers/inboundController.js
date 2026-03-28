/**
 * 入库控制器
 * 处理入库记录相关的API请求
 */

const InboundRecord = require('../models/InboundRecord');

/**
 * 创建入库记录
 * POST /api/inbound
 */
const createInbound = async (req, res) => {
  try {
    const { 
      inbound_date, 
      supplier, 
      remarks, 
      operator_id, 
      items 
    } = req.body;
    
    // 参数验证
    if (!inbound_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '入库日期和入库物品不能为空'
      });
    }
    
    if (!operator_id) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '操作人ID不能为空'
      });
    }
    
    // 验证每个明细项
    for (const item of items) {
      if (!item.item_id || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          data: null,
          message: '入库物品ID和数量必须正确填写'
        });
      }
    }
    
    // 生成入库单号
    const inbound_no = await InboundRecord.generateInboundNo();
    
    // 创建入库记录
    const record = await InboundRecord.create(
      {
        inbound_no,
        inbound_date,
        supplier,
        remarks,
        operator_id
      },
      items
    );
    
    res.status(201).json({
      success: true,
      data: record,
      message: '入库记录创建成功'
    });
  } catch (error) {
    console.error('创建入库记录失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '创建入库记录失败: ' + error.message
    });
  }
};

/**
 * 获取入库记录列表
 * GET /api/inbound
 */
const getInbounds = async (req, res) => {
  try {
    const { startDate, endDate, supplier } = req.query;
    const options = {};
    
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (supplier) options.supplier = supplier;
    
    const records = await InboundRecord.findAll(options);
    
    res.json({
      success: true,
      data: records,
      message: '获取入库记录列表成功'
    });
  } catch (error) {
    console.error('获取入库记录列表失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取入库记录列表失败: ' + error.message
    });
  }
};

/**
 * 获取单个入库记录详情
 * GET /api/inbound/:id
 */
const getInboundById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const record = await InboundRecord.findById(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '入库记录不存在'
      });
    }
    
    res.json({
      success: true,
      data: record,
      message: '获取入库记录详情成功'
    });
  } catch (error) {
    console.error('获取入库记录详情失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取入库记录详情失败: ' + error.message
    });
  }
};

/**
 * 按日期范围查询入库记录
 * GET /api/inbound/date-range
 */
const getInboundsByDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '开始日期和结束日期不能为空'
      });
    }
    
    const records = await InboundRecord.findByDateRange(start, end);
    
    res.json({
      success: true,
      data: records,
      message: '获取入库记录成功'
    });
  } catch (error) {
    console.error('获取入库记录失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取入库记录失败: ' + error.message
    });
  }
};

/**
 * 获取入库统计信息
 * GET /api/inbound/statistics
 */
const getStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const options = {};
    
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    
    const statistics = await InboundRecord.getStatistics(options);
    
    res.json({
      success: true,
      data: statistics,
      message: '获取入库统计信息成功'
    });
  } catch (error) {
    console.error('获取入库统计信息失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取入库统计信息失败: ' + error.message
    });
  }
};

/**
 * 获取入库物品统计
 * GET /api/inbound/item-statistics
 */
const getItemStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const options = {};
    
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    
    const statistics = await InboundRecord.getItemStatistics(options);
    
    res.json({
      success: true,
      data: statistics,
      message: '获取入库物品统计成功'
    });
  } catch (error) {
    console.error('获取入库物品统计失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取入库物品统计失败: ' + error.message
    });
  }
};

module.exports = {
  createInbound,
  getInbounds,
  getInboundById,
  getInboundsByDateRange,
  getStatistics,
  getItemStatistics
};
