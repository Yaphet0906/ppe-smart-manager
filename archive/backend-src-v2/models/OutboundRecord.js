/**
 * 出库记录模型
 * 处理出库记录的数据库操作 - 使用新表 inv_outbound
 */

const { query, transaction } = require('../config/database');

class OutboundRecord {
  /**
   * 创建出库记录
   * @param {Object} record - 出库记录信息
   * @param {number} record.tenant_id - 租户ID
   * @param {number} record.warehouse_id - 仓库ID
   * @param {number} record.item_id - 物品ID
   * @param {number} record.quantity - 出库数量
   * @param {string} record.employee_name - 领用人姓名
   * @param {string} record.employee_phone - 领用人手机号
   * @param {string} record.purpose - 用途
   * @param {string} record.source_type - 来源类型 (scan/web/manual)
   * @param {number} record.operator_id - 操作人ID
   * @param {string} record.operator_name - 操作人姓名
   * @returns {Promise<Object>} 创建的出库记录
   */
  static async create(record) {
    return await transaction(async (connection) => {
      // 1. 检查库存是否充足
      const checkSql = `
        SELECT quantity, name, warehouse_id FROM inv_items WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
      `;
      const [checkRows] = await connection.execute(checkSql, [record.item_id, record.tenant_id]);
      
      if (checkRows.length === 0) {
        throw new Error(`物品不存在`);
      }
      
      const item = checkRows[0];
      if (item.quantity < record.quantity) {
        throw new Error(`物品 "${item.name}" 库存不足，当前库存: ${item.quantity}`);
      }
      
      const beforeQty = item.quantity;
      const afterQty = beforeQty - parseInt(record.quantity);
      const warehouseId = record.warehouse_id || item.warehouse_id;
      
      // 2. 创建出库记录（新表 inv_outbound）
      const recordSql = `
        INSERT INTO inv_outbound 
        (tenant_id, warehouse_id, item_id, quantity, employee_name, employee_phone, purpose, source_type, operator_id, operator_name, outbound_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), NOW())
      `;
      
      const recordParams = [
        record.tenant_id,
        warehouseId,
        record.item_id,
        record.quantity,
        record.employee_name || null,
        record.employee_phone || null,
        record.purpose || null,
        record.source_type || 'manual',
        record.operator_id || null,
        record.operator_name || 'admin'
      ];
      
      const [recordResult] = await connection.execute(recordSql, recordParams);
      const outboundId = recordResult.insertId;
      
      // 3. 插入库存流水
      const transSql = `
        INSERT INTO inv_transactions (tenant_id, warehouse_id, item_id, type, quantity, before_qty, after_qty, source_id, source_no, operator_id, operator_name, remark, created_at)
        VALUES (?, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      await connection.execute(transSql, [
        record.tenant_id,
        warehouseId,
        record.item_id,
        record.quantity,
        beforeQty,
        afterQty,
        outboundId,
        'CK' + Date.now(),
        record.operator_id,
        record.operator_name || 'admin',
        record.purpose || '出库'
      ]);
      
      // 4. 更新库存（减少）
      const updateSql = `
        UPDATE inv_items
        SET quantity = quantity - ?, updated_at = NOW()
        WHERE id = ? AND tenant_id = ?
      `;
      await connection.execute(updateSql, [record.quantity, record.item_id, record.tenant_id]);
      
      return {
        id: outboundId,
        tenant_id: record.tenant_id,
        warehouse_id: warehouseId,
        item_id: record.item_id,
        quantity: record.quantity,
        employee_name: record.employee_name,
        employee_phone: record.employee_phone,
        purpose: record.purpose,
        source_type: record.source_type || 'manual',
        operator_id: record.operator_id,
        operator_name: record.operator_name,
        outbound_date: new Date().toISOString().slice(0, 10)
      };
    });
  }

  /**
   * 查询所有出库记录
   * @param {Object} options - 查询选项
   * @param {number} options.tenant_id - 租户ID
   * @param {number} options.warehouse_id - 仓库ID（可选）
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @param {string} options.employeeName - 领用人姓名
   * @returns {Promise<Array>} 出库记录列表
   */
  static async findAll(options = {}) {
    let sql = `
      SELECT 
        o.id, o.outbound_no, o.outbound_date, 
        o.employee_name, o.employee_phone, o.purpose,
        o.quantity, o.source_type,
        o.operator_id, o.operator_name, o.created_at,
        it.name as item_name, it.specification, it.unit,
        w.name as warehouse_name
      FROM inv_outbound o
      LEFT JOIN inv_items it ON o.item_id = it.id
      LEFT JOIN inv_warehouses w ON o.warehouse_id = w.id
      WHERE o.tenant_id = ?
    `;
    
    const params = [options.tenant_id];
    
    if (options.warehouse_id) {
      sql += ' AND o.warehouse_id = ?';
      params.push(options.warehouse_id);
    }
    
    if (options.startDate) {
      sql += ' AND o.outbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND o.outbound_date <= ?';
      params.push(options.endDate);
    }
    
    if (options.employeeName) {
      sql += ' AND o.employee_name LIKE ?';
      params.push(`%${options.employeeName}%`);
    }
    
    sql += ' ORDER BY o.outbound_date DESC, o.id DESC';
    
    return await query(sql, params);
  }

  /**
   * 根据ID查询出库记录
   * @param {number} id - 出库记录ID
   * @param {number} tenant_id - 租户ID
   * @returns {Promise<Object|null>} 出库记录详情
   */
  static async findById(id, tenant_id) {
    const sql = `
      SELECT 
        o.*,
        it.name as item_name, it.specification, it.unit, it.category_code,
        w.name as warehouse_name
      FROM inv_outbound o
      LEFT JOIN inv_items it ON o.item_id = it.id
      LEFT JOIN inv_warehouses w ON o.warehouse_id = w.id
      WHERE o.id = ? AND o.tenant_id = ?
    `;
    
    const rows = await query(sql, [id, tenant_id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 按员工查询出库记录
   * @param {string} employeeName - 员工姓名
   * @param {number} tenant_id - 租户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 出库记录列表
   */
  static async findByEmployee(employeeName, tenant_id, options = {}) {
    const queryOptions = { ...options, tenant_id, employeeName };
    return await this.findAll(queryOptions);
  }

  /**
   * 获取出库统计信息
   * @param {Object} options - 查询选项
   * @param {number} options.tenant_id - 租户ID
   * @param {number} options.warehouse_id - 仓库ID（可选）
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @returns {Promise<Object>} 统计信息
   */
  static async getStatistics(options = {}) {
    let sql = `
      SELECT 
        COUNT(*) as total_records,
        SUM(quantity) as total_quantity,
        COUNT(DISTINCT employee_name) as employee_count,
        COUNT(DISTINCT item_id) as item_count
      FROM inv_outbound
      WHERE tenant_id = ?
    `;
    
    const params = [options.tenant_id];
    
    if (options.warehouse_id) {
      sql += ' AND warehouse_id = ?';
      params.push(options.warehouse_id);
    }
    
    if (options.startDate) {
      sql += ' AND outbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND outbound_date <= ?';
      params.push(options.endDate);
    }
    
    const rows = await query(sql, params);
    return rows[0];
  }

  /**
   * 获取出库物品统计（按物品分类）
   * @param {Object} options - 查询选项
   * @param {number} options.tenant_id - 租户ID
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @returns {Promise<Array>} 统计列表
   */
  static async getItemStatistics(options = {}) {
    let sql = `
      SELECT 
        it.id,
        it.name,
        it.category_code,
        it.specification,
        it.unit,
        SUM(o.quantity) as total_quantity,
        COUNT(DISTINCT o.id) as outbound_count
      FROM inv_outbound o
      JOIN inv_items it ON o.item_id = it.id
      WHERE o.tenant_id = ?
    `;
    
    const params = [options.tenant_id];
    
    if (options.startDate) {
      sql += ' AND o.outbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND o.outbound_date <= ?';
      params.push(options.endDate);
    }
    
    sql += ' GROUP BY it.id, it.name, it.category_code, it.specification, it.unit';
    sql += ' ORDER BY total_quantity DESC';
    
    return await query(sql, params);
  }

  /**
   * 获取员工领用统计
   * @param {Object} options - 查询选项
   * @param {number} options.tenant_id - 租户ID
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @returns {Promise<Array>} 员工领用统计列表
   */
  static async getEmployeeStatistics(options = {}) {
    let sql = `
      SELECT 
        COALESCE(employee_name, '未知') as employee_name,
        employee_phone,
        purpose,
        COUNT(*) as outbound_count,
        SUM(quantity) as total_quantity
      FROM inv_outbound
      WHERE tenant_id = ?
    `;
    
    const params = [options.tenant_id];
    
    if (options.startDate) {
      sql += ' AND outbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND outbound_date <= ?';
      params.push(options.endDate);
    }
    
    sql += ' GROUP BY employee_name, employee_phone, purpose';
    sql += ' ORDER BY total_quantity DESC';
    
    return await query(sql, params);
  }
}

module.exports = OutboundRecord;
