/**
 * 出库控制器
 * 处理出库记录相关的API请求
 */

const OutboundRecord = require('../models/OutboundRecord');

/**
 * 创建出库记录
 * POST /api/outbound
 */
const createOutbound = async (req, res) => {
  try {
    const { 
      outbound_date, 
      employee_id, 
      employee_name,
      department,
      purpose,
      remarks, 
      operator_id, 
      items 
    } = req.body;
    
    // 参数验证
    if (!outbound_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '出库日期和出库物品不能为空'
      });
    }
    
    if (!operator_id) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '操作人ID不能为空'
      });
    }
    
    // 验证领用人信息（员工ID或员工姓名至少一个）
    if (!employee_id && !employee_name) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '领用人信息不能为空'
      });
    }
    
    // 验证每个明细项
    for (const item of items) {
      if (!item.item_id || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          data: null,
          message: '出库物品ID和数量必须正确填写'
        });
      }
    }
    
    // 生成出库单号
    const outbound_no = await OutboundRecord.generateOutboundNo();
    
    // 创建出库记录
    const record = await OutboundRecord.create(
      {
        outbound_no,
        outbound_date,
        employee_id,
        employee_name,
        department,
        purpose,
        remarks,
        operator_id
      },
      items
    );
    
    res.status(201).json({
      success: true,
      data: record,
      message: '出库记录创建成功'
    });
  } catch (error) {
    console.error('创建出库记录失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '创建出库记录失败: ' + error.message
    });
  }
};

/**
 * 获取出库记录列表
 * GET /api/outbound
 */
const getOutbounds = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, department } = req.query;
    const options = {};
    
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (employeeId) options.employeeId = employeeId;
    if (department) options.department = department;
    
    const records = await OutboundRecord.findAll(options);
    
    res.json({
      success: true,
      data: records,
      message: '获取出库记录列表成功'
    });
  } catch (error) {
    console.error('获取出库记录列表失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取出库记录列表失败: ' + error.message
    });
  }
};

/**
 * 获取单个出库记录详情
 * GET /api/outbound/:id
 */
const getOutboundById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const record = await OutboundRecord.findById(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '出库记录不存在'
      });
    }
    
    res.json({
      success: true,
      data: record,
      message: '获取出库记录详情成功'
    });
  } catch (error) {
    console.error('获取出库记录详情失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取出库记录详情失败: ' + error.message
    });
  }
};

/**
 * 按员工查询出库记录
 * GET /api/outbound/employee/:employeeId
 */
const getOutboundsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    
    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    
    const records = await OutboundRecord.findByEmployee(employeeId, options);
    
    res.json({
      success: true,
      data: records,
      message: '获取员工出库记录成功'
    });
  } catch (error) {
    console.error('获取员工出库记录失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取员工出库记录失败: ' + error.message
    });
  }
};

/**
 * 获取出库统计信息
 * GET /api/outbound/statistics
 */
const getStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const options = {};
    
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    
    const statistics = await OutboundRecord.getStatistics(options);
    
    res.json({
      success: true,
      data: statistics,
      message: '获取出库统计信息成功'
    });
  } catch (error) {
    console.error('获取出库统计信息失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取出库统计信息失败: ' + error.message
    });
  }
};

/**
 * 获取出库物品统计
 * GET /api/outbound/item-statistics
 */
const getItemStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const options = {};
    
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    
    const statistics = await OutboundRecord.getItemStatistics(options);
    
    res.json({
      success: true,
      data: statistics,
      message: '获取出库物品统计成功'
    });
  } catch (error) {
    console.error('获取出库物品统计失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取出库物品统计失败: ' + error.message
    });
  }
};

/**
 * 获取员工领用统计
 * GET /api/outbound/employee-statistics
 */
const getEmployeeStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const options = {};
    
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    
    const statistics = await OutboundRecord.getEmployeeStatistics(options);
    
    res.json({
      success: true,
      data: statistics,
      message: '获取员工领用统计成功'
    });
  } catch (error) {
    console.error('获取员工领用统计失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取员工领用统计失败: ' + error.message
    });
  }
};

module.exports = {
  createOutbound,
  getOutbounds,
  getOutboundById,
  getOutboundsByEmployee,
  getStatistics,
  getItemStatistics,
  getEmployeeStatistics
};
