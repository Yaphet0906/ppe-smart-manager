/**
 * 入库记录模型
 * 处理入库记录和入库明细的数据库操作
 */

const { query, transaction } = require('../config/database');
const PPEItem = require('./PPEItem');

class InboundRecord {
  /**
   * 创建入库记录（包含明细）
   * @param {Object} record - 入库记录信息
   * @param {string} record.inbound_no - 入库单号
   * @param {string} record.inbound_date - 入库日期
   * @param {string} record.supplier - 供应商
   * @param {string} record.remarks - 备注
   * @param {number} record.operator_id - 操作人ID
   * @param {Array} items - 入库明细数组
   * @param {number} items[].item_id - 物品ID
   * @param {number} items[].quantity - 入库数量
   * @param {string} items[].batch_no - 批次号
   * @param {string} items[].expiry_date - 有效期
   * @param {number} items[].unit_price - 单价
   * @returns {Promise<Object>} 创建的入库记录
   */
  static async create(record, items) {
    return await transaction(async (connection) => {
      // 1. 创建入库记录主表
      const recordSql = `
        INSERT INTO inbound_records (inbound_no, inbound_date, supplier, remarks, operator_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;
      
      const recordParams = [
        record.inbound_no,
        record.inbound_date,
        record.supplier || null,
        record.remarks || null,
        record.operator_id
      ];
      
      const [recordResult] = await connection.execute(recordSql, recordParams);
      const inboundId = recordResult.insertId;
      
      // 2. 创建入库明细并更新库存
      const detailSql = `
        INSERT INTO inbound_items (inbound_id, item_id, quantity, batch_no, expiry_date, unit_price, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;
      
      for (const item of items) {
        // 插入明细
        await connection.execute(detailSql, [
          inboundId,
          item.item_id,
          item.quantity,
          item.batch_no || null,
          item.expiry_date || null,
          item.unit_price || null
        ]);
        
        // 更新库存
        const updateSql = `
          UPDATE ppe_items
          SET quantity = quantity + ?, updated_at = NOW()
          WHERE id = ? AND deleted_at IS NULL
        `;
        await connection.execute(updateSql, [item.quantity, item.item_id]);
      }
      
      return {
        id: inboundId,
        inbound_no: record.inbound_no,
        inbound_date: record.inbound_date,
        supplier: record.supplier,
        remarks: record.remarks,
        operator_id: record.operator_id,
        items: items
      };
    });
  }

  /**
   * 查询所有入库记录
   * @param {Object} options - 查询选项
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @param {string} options.supplier - 供应商
   * @returns {Promise<Array>} 入库记录列表
   */
  static async findAll(options = {}) {
    let sql = `
      SELECT ir.id, ir.inbound_no, ir.inbound_date, ir.supplier, ir.remarks, 
             ir.operator_id, u.name as operator_name, ir.created_at
      FROM inbound_records ir
      LEFT JOIN users u ON ir.operator_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (options.startDate) {
      sql += ' AND ir.inbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND ir.inbound_date <= ?';
      params.push(options.endDate);
    }
    
    if (options.supplier) {
      sql += ' AND ir.supplier LIKE ?';
      params.push(`%${options.supplier}%`);
    }
    
    sql += ' ORDER BY ir.inbound_date DESC, ir.created_at DESC';
    
    return await query(sql, params);
  }

  /**
   * 根据ID查询入库记录（包含明细）
   * @param {number} id - 入库记录ID
   * @returns {Promise<Object|null>} 入库记录详情
   */
  static async findById(id) {
    // 查询主记录
    const recordSql = `
      SELECT ir.id, ir.inbound_no, ir.inbound_date, ir.supplier, ir.remarks, 
             ir.operator_id, u.name as operator_name, ir.created_at
      FROM inbound_records ir
      LEFT JOIN users u ON ir.operator_id = u.id
      WHERE ir.id = ?
    `;
    
    const recordRows = await query(recordSql, [id]);
    
    if (recordRows.length === 0) {
      return null;
    }
    
    const record = recordRows[0];
    
    // 查询明细
    const itemsSql = `
      SELECT ii.id, ii.item_id, pi.name as item_name, pi.specification, pi.unit,
             ii.quantity, ii.batch_no, ii.expiry_date, ii.unit_price
      FROM inbound_items ii
      JOIN ppe_items pi ON ii.item_id = pi.id
      WHERE ii.inbound_id = ?
    `;
    
    record.items = await query(itemsSql, [id]);
    
    return record;
  }

  /**
   * 按日期范围查询入库记录
   * @param {string} start - 开始日期
   * @param {string} end - 结束日期
   * @returns {Promise<Array>} 入库记录列表
   */
  static async findByDateRange(start, end) {
    return await this.findAll({ startDate: start, endDate: end });
  }

  /**
   * 生成入库单号
   * 格式: IN + 年月日 + 4位序号
   * @returns {Promise<string>} 入库单号
   */
  static async generateInboundNo() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `IN${dateStr}`;
    
    const sql = `
      SELECT inbound_no 
      FROM inbound_records 
      WHERE inbound_no LIKE ?
      ORDER BY inbound_no DESC
      LIMIT 1
    `;
    
    const rows = await query(sql, [`${prefix}%`]);
    
    let seq = 1;
    if (rows.length > 0) {
      const lastNo = rows[0].inbound_no;
      const lastSeq = parseInt(lastNo.slice(-4));
      seq = lastSeq + 1;
    }
    
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  /**
   * 获取入库统计信息
   * @param {Object} options - 查询选项
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @returns {Promise<Object>} 统计信息
   */
  static async getStatistics(options = {}) {
    let sql = `
      SELECT 
        COUNT(*) as total_records,
        SUM(ii.quantity) as total_quantity,
        COUNT(DISTINCT ir.supplier) as supplier_count
      FROM inbound_records ir
      JOIN inbound_items ii ON ir.id = ii.inbound_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (options.startDate) {
      sql += ' AND ir.inbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND ir.inbound_date <= ?';
      params.push(options.endDate);
    }
    
    const rows = await query(sql, params);
    return rows[0];
  }

  /**
   * 获取入库物品统计（按物品分类）
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
        SUM(ii.quantity) as total_quantity,
        COUNT(DISTINCT ir.id) as inbound_count
      FROM inbound_items ii
      JOIN ppe_items pi ON ii.item_id = pi.id
      JOIN inbound_records ir ON ii.inbound_id = ir.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (options.startDate) {
      sql += ' AND ir.inbound_date >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      sql += ' AND ir.inbound_date <= ?';
      params.push(options.endDate);
    }
    
    sql += ' GROUP BY pi.id, pi.name, pi.category, pi.specification, pi.unit';
    sql += ' ORDER BY total_quantity DESC';
    
    return await query(sql, params);
  }
}

module.exports = InboundRecord;
