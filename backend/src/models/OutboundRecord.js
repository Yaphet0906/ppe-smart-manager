/**
 * 出库记录模型
 * 处理出库记录和出库明细的数据库操作
 */

const { query, transaction } = require('../config/database');

class OutboundRecord {
  /**
   * 创建出库记录（包含明细）
   * @param {Object} record - 出库记录信息
   * @param {string} record.outbound_no - 出库单号
   * @param {string} record.outbound_date - 出库日期
   * @param {number} record.employee_id - 领用员工ID
   * @param {string} record.employee_name - 领用人姓名（用于非系统用户）
   * @param {string} record.department - 部门
   * @param {string} record.purpose - 用途
   * @param {string} record.remarks - 备注
   * @param {number} record.operator_id - 操作人ID
   * @param {Array} items - 出库明细数组
   * @param {number} items[].item_id - 物品ID
   * @param {number} items[].quantity - 出库数量
   * @param {string} items[].remarks - 明细备注
   * @returns {Promise<Object>} 创建的出库记录
   */
  static async create(record, items) {
    return await transaction(async (connection) => {
      // 1. 检查库存是否充足
      for (const item of items) {
        const checkSql = `
          SELECT quantity, name FROM ppe_items WHERE id = ? AND deleted_at IS NULL
        `;
        const [checkRows] = await connection.execute(checkSql, [item.item_id]);
        
        if (checkRows.length === 0) {
          throw new Error(`物品ID ${item.item_id} 不存在`);
        }
        
        if (checkRows[0].quantity < item.quantity) {
          throw new Error(`物品 "${checkRows[0].name}" 库存不足，当前库存: ${checkRows[0].quantity}`);
        }
      }
      
      // 2. 创建出库记录主表
      const recordSql = `
        INSERT INTO outbound_records 
        (outbound_no, outbound_date, employee_id, employee_name, department, purpose, remarks, operator_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      const recordParams = [
        record.outbound_no,
        record.outbound_date,
        record.employee_id || null,
        record.employee_name || null,
        record.department || null,
        record.purpose || null,
        record.remarks || null,
        record.operator_id
      ];
      
      const [recordResult] = await connection.execute(recordSql, recordParams);
      const outboundId = recordResult.insertId;
      
      // 3. 创建出库明细并更新库存
      const detailSql = `
        INSERT INTO outbound_items (outbound_id, item_id, quantity, remarks, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `;
      
      for (const item of items) {
        // 插入明细
        await connection.execute(detailSql, [
          outboundId,
          item.item_id,
          item.quantity,
          item.remarks || null
        ]);
        
        // 更新库存（减少）
        const updateSql = `
          UPDATE ppe_items
          SET quantity = quantity - ?, updated_at = NOW()
          WHERE id = ? AND deleted_at IS NULL
        `;
        await connection.execute(updateSql, [item.quantity, item.item_id]);
      }
      
      return {
        id: outboundId,
        outbound_no: record.outbound_no,
        outbound_date: record.outbound_date,
        employee_id: record.employee_id,
        employee_name: record.employee_name,
        department: record.department,
        purpose: record.purpose,
        remarks: record.remarks,
        operator_id: record.operator_id,
        items: items
      };
    });
  }

  /**
   * 查询所有出库记录
   * @param {Object} options - 查询选项
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @param {number} options.employeeId - 员工ID
   * @param {string} options.department - 部门
   * @returns {Promise<Array>} 出库记录列表
   */
  static async findAll(options = {}) {
    let sql = `
      SELECT 
        ors.id, ors.outbound_no, ors.outbound_date, 
        ors.employee_id, u.name as employee_name, ors.employee_name as custom_employee_name,
        ors.department, ors.purpose, ors.remarks,
        ors.operator_id, op.name as operator_name, ors.created_at
      FROM outbound_records ors
      LEFT JOIN users u ON ors.employee_id = u.id
      LEFT JOIN users op ON ors.operator_id = op.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (options.startDate) {
      sql += ' AND ors.outbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND ors.outbound_date <= ?';
      params.push(options.endDate);
    }
    
    if (options.employeeId) {
      sql += ' AND ors.employee_id = ?';
      params.push(options.employeeId);
    }
    
    if (options.department) {
      sql += ' AND ors.department = ?';
      params.push(options.department);
    }
    
    sql += ' ORDER BY ors.outbound_date DESC, ors.created_at DESC';
    
    return await query(sql, params);
  }

  /**
   * 根据ID查询出库记录（包含明细）
   * @param {number} id - 出库记录ID
   * @returns {Promise<Object|null>} 出库记录详情
   */
  static async findById(id) {
    // 查询主记录
    const recordSql = `
      SELECT 
        ors.id, ors.outbound_no, ors.outbound_date, 
        ors.employee_id, u.name as employee_name, ors.employee_name as custom_employee_name,
        ors.department, ors.purpose, ors.remarks,
        ors.operator_id, op.name as operator_name, ors.created_at
      FROM outbound_records ors
      LEFT JOIN users u ON ors.employee_id = u.id
      LEFT JOIN users op ON ors.operator_id = op.id
      WHERE ors.id = ?
    `;
    
    const recordRows = await query(recordSql, [id]);
    
    if (recordRows.length === 0) {
      return null;
    }
    
    const record = recordRows[0];
    
    // 查询明细
    const itemsSql = `
      SELECT oi.id, oi.item_id, pi.name as item_name, pi.specification, pi.unit,
             oi.quantity, oi.remarks
      FROM outbound_items oi
      JOIN ppe_items pi ON oi.item_id = pi.id
      WHERE oi.outbound_id = ?
    `;
    
    record.items = await query(itemsSql, [id]);
    
    return record;
  }

  /**
   * 按员工查询出库记录
   * @param {number} employeeId - 员工ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 出库记录列表
   */
  static async findByEmployee(employeeId, options = {}) {
    const queryOptions = { ...options, employeeId };
    return await this.findAll(queryOptions);
  }

  /**
   * 生成出库单号
   * 格式: OUT + 年月日 + 4位序号
   * @returns {Promise<string>} 出库单号
   */
  static async generateOutboundNo() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `OUT${dateStr}`;
    
    const sql = `
      SELECT outbound_no 
      FROM outbound_records 
      WHERE outbound_no LIKE ?
      ORDER BY outbound_no DESC
      LIMIT 1
    `;
    
    const rows = await query(sql, [`${prefix}%`]);
    
    let seq = 1;
    if (rows.length > 0) {
      const lastNo = rows[0].outbound_no;
      const lastSeq = parseInt(lastNo.slice(-4));
      seq = lastSeq + 1;
    }
    
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  /**
   * 获取出库统计信息
   * @param {Object} options - 查询选项
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @returns {Promise<Object>} 统计信息
   */
  static async getStatistics(options = {}) {
    let sql = `
      SELECT 
        COUNT(*) as total_records,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT ors.employee_id) as employee_count
      FROM outbound_records ors
      JOIN outbound_items oi ON ors.id = oi.outbound_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (options.startDate) {
      sql += ' AND ors.outbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND ors.outbound_date <= ?';
      params.push(options.endDate);
    }
    
    const rows = await query(sql, params);
    return rows[0];
  }

  /**
   * 获取出库物品统计（按物品分类）
   * @param {Object} options - 查询选项
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @returns {Promise<Array>} 统计列表
   */
  static async getItemStatistics(options = {}) {
    let sql = `
      SELECT 
        pi.id,
        pi.name,
        pi.category,
        pi.specification,
        pi.unit,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT ors.id) as outbound_count
      FROM outbound_items oi
      JOIN ppe_items pi ON oi.item_id = pi.id
      JOIN outbound_records ors ON oi.outbound_id = ors.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (options.startDate) {
      sql += ' AND ors.outbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND ors.outbound_date <= ?';
      params.push(options.endDate);
    }
    
    sql += ' GROUP BY pi.id, pi.name, pi.category, pi.specification, pi.unit';
    sql += ' ORDER BY total_quantity DESC';
    
    return await query(sql, params);
  }

  /**
   * 获取员工领用统计
   * @param {Object} options - 查询选项
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @returns {Promise<Array>} 员工领用统计列表
   */
  static async getEmployeeStatistics(options = {}) {
    let sql = `
      SELECT 
        COALESCE(u.id, 0) as employee_id,
        COALESCE(u.name, ors.employee_name, '未知') as employee_name,
        ors.department,
        COUNT(DISTINCT ors.id) as outbound_count,
        SUM(oi.quantity) as total_quantity
      FROM outbound_records ors
      JOIN outbound_items oi ON ors.id = oi.outbound_id
      LEFT JOIN users u ON ors.employee_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (options.startDate) {
      sql += ' AND ors.outbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND ors.outbound_date <= ?';
      params.push(options.endDate);
    }
    
    sql += ' GROUP BY COALESCE(u.id, 0), COALESCE(u.name, ors.employee_name), ors.department';
    sql += ' ORDER BY total_quantity DESC';
    
    return await query(sql, params);
  }
}

module.exports = OutboundRecord;
