/**
 * Excel导出工具函数
 * 使用exceljs库生成Excel文件
 */

const ExcelJS = require('exceljs');

/**
 * 导出入库记录到Excel
 * @param {Array} records - 入库记录数组
 * @returns {Promise<Buffer>} Excel文件Buffer
 */
const exportInboundToExcel = async (records) => {
  const workbook = new ExcelJS.Workbook();
  
  // 创建入库记录汇总工作表
  const summarySheet = workbook.addWorksheet('入库记录汇总');
  summarySheet.columns = [
    { header: '入库单号', key: 'inbound_no', width: 20 },
    { header: '入库日期', key: 'inbound_date', width: 15 },
    { header: '供应商', key: 'supplier', width: 20 },
    { header: '操作人', key: 'operator_name', width: 15 },
    { header: '备注', key: 'remarks', width: 25 },
    { header: '物品数量', key: 'item_count', width: 12 },
    { header: '创建时间', key: 'created_at', width: 20 }
  ];
  
  // 添加汇总数据
  records.forEach(record => {
    summarySheet.addRow({
      inbound_no: record.inbound_no,
      inbound_date: record.inbound_date,
      supplier: record.supplier || '-',
      operator_name: record.operator_name || '-',
      remarks: record.remarks || '-',
      item_count: record.items ? record.items.length : 0,
      created_at: record.created_at
    });
  });
  
  // 设置表头样式
  summarySheet.getRow(1).font = { bold: true, size: 12 };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // 创建入库明细工作表
  const detailSheet = workbook.addWorksheet('入库明细');
  detailSheet.columns = [
    { header: '入库单号', key: 'inbound_no', width: 20 },
    { header: '入库日期', key: 'inbound_date', width: 15 },
    { header: '物品名称', key: 'item_name', width: 20 },
    { header: '规格', key: 'specification', width: 20 },
    { header: '单位', key: 'unit', width: 10 },
    { header: '入库数量', key: 'quantity', width: 12 },
    { header: '批次号', key: 'batch_no', width: 15 },
    { header: '有效期', key: 'expiry_date', width: 15 },
    { header: '单价', key: 'unit_price', width: 12 },
    { header: '供应商', key: 'supplier', width: 20 }
  ];
  
  // 添加明细数据
  records.forEach(record => {
    if (record.items && record.items.length > 0) {
      record.items.forEach(item => {
        detailSheet.addRow({
          inbound_no: record.inbound_no,
          inbound_date: record.inbound_date,
          item_name: item.item_name,
          specification: item.specification || '-',
          unit: item.unit || '-',
          quantity: item.quantity,
          batch_no: item.batch_no || '-',
          expiry_date: item.expiry_date || '-',
          unit_price: item.unit_price || '-',
          supplier: record.supplier || '-'
        });
      });
    }
  });
  
  // 设置明细表头样式
  detailSheet.getRow(1).font = { bold: true, size: 12 };
  detailSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // 添加统计信息工作表
  const statsSheet = workbook.addWorksheet('统计信息');
  
  // 计算统计数据
  const totalRecords = records.length;
  const totalItems = records.reduce((sum, r) => sum + (r.items ? r.items.length : 0), 0);
  const totalQuantity = records.reduce((sum, r) => {
    return sum + (r.items ? r.items.reduce((s, i) => s + i.quantity, 0) : 0);
  }, 0);
  
  statsSheet.columns = [
    { header: '统计项', key: 'label', width: 25 },
    { header: '数值', key: 'value', width: 20 }
  ];
  
  statsSheet.addRow({ label: '入库记录总数', value: totalRecords });
  statsSheet.addRow({ label: '入库物品种类数', value: totalItems });
  statsSheet.addRow({ label: '入库总数量', value: totalQuantity });
  
  statsSheet.getRow(1).font = { bold: true, size: 12 };
  statsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  statsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // 返回Buffer
  return await workbook.xlsx.writeBuffer();
};

/**
 * 导出出库记录到Excel
 * @param {Array} records - 出库记录数组
 * @returns {Promise<Buffer>} Excel文件Buffer
 */
const exportOutboundToExcel = async (records) => {
  const workbook = new ExcelJS.Workbook();
  
  // 创建出库记录汇总工作表
  const summarySheet = workbook.addWorksheet('发放记录汇总');
  summarySheet.columns = [
    { header: '出库单号', key: 'outbound_no', width: 20 },
    { header: '出库日期', key: 'outbound_date', width: 15 },
    { header: '领用人', key: 'employee_name', width: 15 },
    { header: '部门', key: 'department', width: 15 },
    { header: '用途', key: 'purpose', width: 20 },
    { header: '操作人', key: 'operator_name', width: 15 },
    { header: '备注', key: 'remarks', width: 25 },
    { header: '物品数量', key: 'item_count', width: 12 },
    { header: '创建时间', key: 'created_at', width: 20 }
  ];
  
  // 添加汇总数据
  records.forEach(record => {
    const employeeName = record.employee_name || record.custom_employee_name || '-';
    
    summarySheet.addRow({
      outbound_no: record.outbound_no,
      outbound_date: record.outbound_date,
      employee_name: employeeName,
      department: record.department || '-',
      purpose: record.purpose || '-',
      operator_name: record.operator_name || '-',
      remarks: record.remarks || '-',
      item_count: record.items ? record.items.length : 0,
      created_at: record.created_at
    });
  });
  
  // 设置表头样式
  summarySheet.getRow(1).font = { bold: true, size: 12 };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' }
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // 创建出库明细工作表
  const detailSheet = workbook.addWorksheet('发放明细');
  detailSheet.columns = [
    { header: '出库单号', key: 'outbound_no', width: 20 },
    { header: '出库日期', key: 'outbound_date', width: 15 },
    { header: '领用人', key: 'employee_name', width: 15 },
    { header: '部门', key: 'department', width: 15 },
    { header: '物品名称', key: 'item_name', width: 20 },
    { header: '规格', key: 'specification', width: 20 },
    { header: '单位', key: 'unit', width: 10 },
    { header: '出库数量', key: 'quantity', width: 12 },
    { header: '用途', key: 'purpose', width: 20 },
    { header: '明细备注', key: 'remarks', width: 25 }
  ];
  
  // 添加明细数据
  records.forEach(record => {
    const employeeName = record.employee_name || record.custom_employee_name || '-';
    
    if (record.items && record.items.length > 0) {
      record.items.forEach(item => {
        detailSheet.addRow({
          outbound_no: record.outbound_no,
          outbound_date: record.outbound_date,
          employee_name: employeeName,
          department: record.department || '-',
          item_name: item.item_name,
          specification: item.specification || '-',
          unit: item.unit || '-',
          quantity: item.quantity,
          purpose: record.purpose || '-',
          remarks: item.remarks || '-'
        });
      });
    }
  });
  
  // 设置明细表头样式
  detailSheet.getRow(1).font = { bold: true, size: 12 };
  detailSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' }
  };
  detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // 添加统计信息工作表
  const statsSheet = workbook.addWorksheet('统计信息');
  
  // 计算统计数据
  const totalRecords = records.length;
  const totalItems = records.reduce((sum, r) => sum + (r.items ? r.items.length : 0), 0);
  const totalQuantity = records.reduce((sum, r) => {
    return sum + (r.items ? r.items.reduce((s, i) => s + i.quantity, 0) : 0);
  }, 0);
  
  // 统计按物品分类
  const itemStats = {};
  records.forEach(record => {
    if (record.items) {
      record.items.forEach(item => {
        if (!itemStats[item.item_name]) {
          itemStats[item.item_name] = {
            name: item.item_name,
            specification: item.specification,
            unit: item.unit,
            quantity: 0
          };
        }
        itemStats[item.item_name].quantity += item.quantity;
      });
    }
  });
  
  statsSheet.columns = [
    { header: '统计项', key: 'label', width: 30 },
    { header: '数值', key: 'value', width: 20 }
  ];
  
  statsSheet.addRow({ label: '发放记录总数', value: totalRecords });
  statsSheet.addRow({ label: '发放物品种类数', value: totalItems });
  statsSheet.addRow({ label: '发放总数量', value: totalQuantity });
  statsSheet.addRow({ label: '', value: '' });
  statsSheet.addRow({ label: '按物品统计', value: '' });
  statsSheet.addRow({ label: '物品名称', value: '发放数量' });
  
  Object.values(itemStats).forEach(stat => {
    statsSheet.addRow({
      label: `${stat.name} (${stat.specification || '-'})`,
      value: `${stat.quantity} ${stat.unit || '件'}`
    });
  });
  
  statsSheet.getRow(1).font = { bold: true, size: 12 };
  statsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' }
  };
  statsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // 返回Buffer
  return await workbook.xlsx.writeBuffer();
};

/**
 * 导出库存数据到Excel
 * @param {Array} items - 库存物品数组
 * @param {Object} options - 导出选项
 * @returns {Promise<Buffer>} Excel文件Buffer
 */
const exportInventoryToExcel = async (items, options = {}) => {
  const workbook = new ExcelJS.Workbook();
  
  const sheet = workbook.addWorksheet('库存清单');
  sheet.columns = [
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
    sheet.addRow(item);
  });
  
  // 设置表头样式
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // 条件格式化：低库存高亮
  items.forEach((item, index) => {
    if (item.quantity <= item.min_stock) {
      const row = sheet.getRow(index + 2);
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFCCCC' }
      };
    }
  });
  
  return await workbook.xlsx.writeBuffer();
};

module.exports = {
  exportInboundToExcel,
  exportOutboundToExcel,
  exportInventoryToExcel
};
