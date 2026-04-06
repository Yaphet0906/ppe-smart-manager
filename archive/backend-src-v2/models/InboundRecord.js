/**
 * 入库记录模型
 * 处理入库记录的数据库操作 - 使用新表 inv_inbound
 */

const { query, transaction } = require('../config/database');
const PPEItem = require('./PPEItem');

class InboundRecord {
  /**
   * 创建入库记录
   * @param {Object} record - 入库记录信息
   * @param {number} record.tenant_id - 租户ID
   * @param {number} record.warehouse_id - 仓库ID
   * @param {number} record.item_id - 物品ID
   * @param {number} record.quantity - 入库数量
   * @param {string} record.source_type - 来源类型 (ocr/manual)
   * @param {string} record.remark - 备注
   * @param {number} record.operator_id - 操作人ID
   * @param {string} record.operator_name - 操作人姓名
   * @returns {Promise<Object>} 创建的入库记录
   */
  static async create(record) {
    return await transaction(async (connection) => {
      // 1. 查询物品当前库存
      const [items] = await connection.execute(
        'SELECT quantity FROM inv_items WHERE id = ? AND tenant_id = ?',
        [record.item_id, record.tenant_id]
      );
      
      if (items.length === 0) {
        throw new Error('物品不存在');
      }
      
      const beforeQty = items[0].quantity;
      const afterQty = beforeQty + parseInt(record.quantity);
      
      // 2. 创建入库记录（新表 inv_inbound）
      const recordSql = `
        INSERT INTO inv_inbound (tenant_id, warehouse_id, item_id, quantity, source_type, remark, operator_id, operator_name, inbound_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), NOW())
      `;
      
      const recordParams = [
        record.tenant_id,
        record.warehouse_id,
        record.item_id,
        record.quantity,
        record.source_type || 'manual',
        record.remark || null,
        record.operator_id,
        record.operator_name || 'admin'
      ];
      
      const [recordResult] = await connection.execute(recordSql, recordParams);
      const inboundId = recordResult.insertId;
      
      // 3. 插入库存流水
      const transSql = `
        INSERT INTO inv_transactions (tenant_id, warehouse_id, item_id, type, quantity, before_qty, after_qty, source_id, source_no, operator_id, operator_name, remark, created_at)
        VALUES (?, ?, ?, 'inbound', ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      await connection.execute(transSql, [
        record.tenant_id,
        record.warehouse_id,
        record.item_id,
        record.quantity,
        beforeQty,
        afterQty,
        inboundId,
        'RK' + Date.now(),
        record.operator_id,
        record.operator_name || 'admin',
        record.remark || '入库'
      ]);
      
      // 4. 更新库存
      const updateSql = `
        UPDATE inv_items
        SET quantity = quantity + ?, updated_at = NOW()
        WHERE id = ? AND tenant_id = ?
      `;
      await connection.execute(updateSql, [record.quantity, record.item_id, record.tenant_id]);
      
      return {
        id: inboundId,
        tenant_id: record.tenant_id,
        warehouse_id: record.warehouse_id,
        item_id: record.item_id,
        quantity: record.quantity,
        source_type: record.source_type || 'manual',
        remark: record.remark,
        operator_id: record.operator_id,
        operator_name: record.operator_name,
        inbound_date: new Date().toISOString().slice(0, 10)
      };
    });
  }

  /**
   * 查询所有入库记录
   * @param {Object} options - 查询选项
   * @param {number} options.tenant_id - 租户ID
   * @param {number} options.warehouse_id - 仓库ID（可选）
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @returns {Promise<Array>} 入库记录列表
   */
  static async findAll(options = {}) {
    let sql = `
      SELECT i.*, it.name as item_name, w.name as warehouse_name
      FROM inv_inbound i
      LEFT JOIN inv_items it ON i.item_id = it.id
      LEFT JOIN inv_warehouses w ON i.warehouse_id = w.id
      WHERE i.tenant_id = ?
    `;
    
    const params = [options.tenant_id];
    
    if (options.warehouse_id) {
      sql += ' AND i.warehouse_id = ?';
      params.push(options.warehouse_id);
    }
    
    if (options.startDate) {
      sql += ' AND i.inbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND i.inbound_date <= ?';
      params.push(options.endDate);
    }
    
    sql += ' ORDER BY i.inbound_date DESC, i.id DESC';
    
    return await query(sql, params);
  }

  /**
   * 根据ID查询入库记录
   * @param {number} id - 入库记录ID
   * @param {number} tenant_id - 租户ID
   * @returns {Promise<Object|null>} 入库记录详情
   */
  static async findById(id, tenant_id) {
    const sql = `
      SELECT i.*, it.name as item_name, it.specification, it.unit, w.name as warehouse_name
      FROM inv_inbound i
      LEFT JOIN inv_items it ON i.item_id = it.id
      LEFT JOIN inv_warehouses w ON i.warehouse_id = w.id
      WHERE i.id = ? AND i.tenant_id = ?
    `;
    
    const rows = await query(sql, [id, tenant_id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 按日期范围查询入库记录
   * @param {string} start - 开始日期
   * @param {string} end - 结束日期
   * @param {number} tenant_id - 租户ID
   * @returns {Promise<Array>} 入库记录列表
   */
  static async findByDateRange(start, end, tenant_id) {
    return await this.findAll({ startDate: start, endDate: end, tenant_id });
  }

  /**
   * 获取入库统计信息
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
        COUNT(DISTINCT item_id) as item_count
      FROM inv_inbound
      WHERE tenant_id = ?
    `;
    
    const params = [options.tenant_id];
    
    if (options.warehouse_id) {
      sql += ' AND warehouse_id = ?';
      params.push(options.warehouse_id);
    }
    
    if (options.startDate) {
      sql += ' AND inbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND inbound_date <= ?';
      params.push(options.endDate);
    }
    
    const rows = await query(sql, params);
    return rows[0];
  }

  /**
   * 获取入库物品统计（按物品分类）
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
        SUM(i.quantity) as total_quantity,
        COUNT(DISTINCT i.id) as inbound_count
      FROM inv_inbound i
      JOIN inv_items it ON i.item_id = it.id
      WHERE i.tenant_id = ?
    `;
    
    const params = [options.tenant_id];
    
    if (options.startDate) {
      sql += ' AND i.inbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND i.inbound_date <= ?';
      params.push(options.endDate);
    }
    
    sql += ' GROUP BY it.id, it.name, it.category_code, it.specification, it.unit';
    sql += ' ORDER BY total_quantity DESC';
    
    return await query(sql, params);
  }
}

module.exports = InboundRecord;
