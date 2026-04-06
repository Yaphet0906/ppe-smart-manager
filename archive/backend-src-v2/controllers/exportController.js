/**
 * 导出控制器
 * 处理Excel导出相关的API请求
 */

const InboundRecord = require('../models/InboundRecord');
const OutboundRecord = require('../models/OutboundRecord');
const { exportInboundToExcel, exportOutboundToExcel } = require('../utils/export');

/**
 * 导出入库记录Excel
 * GET /api/export/inbound
 */
const exportInbound = async (req, res) => {
  try {
    const { startDate, endDate, supplier } = req.query;
    const options = {};
    
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (supplier) options.supplier = supplier;
    
    // 获取入库记录
    const records = await InboundRecord.findAll(options);
    
    // 获取每条记录的明细
    const recordsWithItems = [];
    for (const record of records) {
      const detail = await InboundRecord.findById(record.id);
      if (detail) {
        recordsWithItems.push(detail);
      }
    }
    
    // 生成Excel
    const buffer = await exportInboundToExcel(recordsWithItems);
    
    // 设置响应头
    const filename = `入库记录_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
  } catch (error) {
    console.error('导出入库记录失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '导出入库记录失败: ' + error.message
    });
  }
};

/**
 * 导出发放记录Excel
 * GET /api/export/outbound
 */
const exportOutbound = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, department } = req.query;
    const options = {};
    
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (employeeId) options.employeeId = employeeId;
    if (department) options.department = department;
    
    // 获取出库记录
    const records = await OutboundRecord.findAll(options);
    
    // 获取每条记录的明细
    const recordsWithItems = [];
    for (const record of records) {
      const detail = await OutboundRecord.findById(record.id);
      if (detail) {
        recordsWithItems.push(detail);
      }
    }
    
    // 生成Excel
    const buffer = await exportOutboundToExcel(recordsWithItems);
    
    // 设置响应头
    const filename = `发放记录_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
  } catch (error) {
    console.error('导出发放记录失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '导出发放记录失败: ' + error.message
    });
  }
};

/**
 * 导出库存报表Excel
 * GET /api/export/inventory
 */
const exportInventory = async (req, res) => {
  try {
    const PPEItem = require('../models/PPEItem');
    
    // 获取所有库存
    const items = await PPEItem.findAll();
    
    // 获取低库存和即将过期物品
    const lowStockItems = await PPEItem.findLowStock();
    const expiringItems = await PPEItem.findExpiring(30);
    
    // 生成Excel
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    // 1. 库存总览工作表
    const overviewSheet = workbook.addWorksheet('库存总览');
    overviewSheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: '物品名称', key: 'name', width: 20 },
      { header: '分类', key: 'category', width: 15 },
      { header: '规格', key: 'specification', width: 20 },
      { header: '单位', key: 'unit', width: 10 },
      { header: '当前库存', key: 'quantity', width: 12 },
      { header: '最低库存', key: 'min_stock', width: 12 },
      { header: '最高库存', key: 'max_stock', width: 12 },
      { header: '有效期', key: 'expiry_date', width: 15 },
      { header: '供应商', key: 'supplier', width: 20 },
      { header: '备注', key: 'remarks', width: 25 }
    ];
    
    // 添加数据
    items.forEach(item => {
      overviewSheet.addRow(item);
    });
    
    // 设置表头样式
    overviewSheet.getRow(1).font = { bold: true };
    overviewSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // 2. 低库存预警工作表
    const lowStockSheet = workbook.addWorksheet('低库存预警');
    lowStockSheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: '物品名称', key: 'name', width: 20 },
      { header: '分类', key: 'category', width: 15 },
      { header: '规格', key: 'specification', width: 20 },
      { header: '单位', key: 'unit', width: 10 },
      { header: '当前库存', key: 'quantity', width: 12 },
      { header: '最低库存', key: 'min_stock', width: 12 },
      { header: '缺口', key: 'shortage', width: 12 }
    ];
    
    lowStockItems.forEach(item => {
      lowStockSheet.addRow({
        ...item,
        shortage: item.min_stock - item.quantity
      });
    });
    
    lowStockSheet.getRow(1).font = { bold: true };
    lowStockSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCCCC' }
    };
    
    // 3. 有效期预警工作表
    const expiringSheet = workbook.addWorksheet('有效期预警');
    expiringSheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: '物品名称', key: 'name', width: 20 },
      { header: '分类', key: 'category', width: 15 },
      { header: '规格', key: 'specification', width: 20 },
      { header: '单位', key: 'unit', width: 10 },
      { header: '当前库存', key: 'quantity', width: 12 },
      { header: '有效期', key: 'expiry_date', width: 15 },
      { header: '剩余天数', key: 'days_remaining', width: 12 }
    ];
    
    expiringItems.forEach(item => {
      expiringSheet.addRow(item);
    });
    
    expiringSheet.getRow(1).font = { bold: true };
    expiringSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFCC' }
    };
    
    // 生成Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // 设置响应头
    const filename = `库存报表_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
  } catch (error) {
    console.error('导出库存报表失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '导出库存报表失败: ' + error.message
    });
  }
};

module.exports = {
  exportInbound,
  exportOutbound,
  exportInventory
};
