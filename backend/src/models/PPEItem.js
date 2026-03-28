/**
 * PPE物品模型
 * 处理劳保用品相关的数据库操作
 */

const { query, transaction } = require('../config/database');

class PPEItem {
  /**
   * 创建新的PPE物品
   * @param {Object} item - 物品信息
   * @param {string} item.name - 物品名称
   * @param {string} item.category - 分类
   * @param {string} item.specification - 规格
   * @param {string} item.unit - 单位
   * @param {number} item.quantity - 初始库存数量
   * @param {number} item.min_stock - 最低库存预警值
   * @param {number} item.max_stock - 最高库存限制
   * @param {string} item.expiry_date - 有效期
   * @param {string} item.supplier - 供应商
   * @param {string} item.remarks - 备注
   * @returns {Promise<Object>} 创建的物品信息
   */
  static async create(item) {
    const sql = `
      INSERT INTO ppe_items 
      (name, brand, size, model, unit, stock_quantity, safety_stock, location, production_date, expiry_date, shelf_life_months, la_cert_no, la_cert_image, la_cert_expiry, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    `;

    const params = [
      item.name,
      item.brand || null,
      item.size || null,
      item.model || null,
      item.unit || '个',
      item.stock_quantity || 0,
      item.safety_stock || 10,
      item.location || null,
      item.production_date || null,
      item.expiry_date || null,
      item.shelf_life_months || null,
      item.la_cert_no || null,
      item.la_cert_image || null,
      item.la_cert_expiry || null
    ];

    const result = await query(sql, params);

    return {
      id: result.insertId,
      name: item.name,
      brand: item.brand,
      size: item.size,
      model: item.model,
      unit: item.unit || '个',
      stock_quantity: item.stock_quantity || 0,
      safety_stock: item.safety_stock || 10,
      location: item.location,
      production_date: item.production_date,
      expiry_date: item.expiry_date,
      shelf_life_months: item.shelf_life_months,
      la_cert_no: item.la_cert_no,
      la_cert_image: item.la_cert_image,
      la_cert_expiry: item.la_cert_expiry
    };
  }

  /**
   * 根据ID查询物品
   * @param {number} id - 物品ID
   * @returns {Promise<Object|null>} 物品信息
   */
  static async findById(id) {
    const sql = `
      SELECT id, name, brand, size, model, unit, stock_quantity, safety_stock, location,
             production_date, expiry_date, shelf_life_months, la_cert_no, la_cert_image, la_cert_expiry,
             status, created_at, updated_at
      FROM ppe_items
      WHERE id = ? AND deleted_at IS NULL
    `;

    const rows = await query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 查询所有物品
   * @param {Object} options - 查询选项
   * @param {string} options.category - 按分类筛选
   * @param {string} options.keyword - 按关键词搜索（名称/规格）
   * @returns {Promise<Array>} 物品列表
   */
  static async findAll(options = {}) {
    let sql = `
      SELECT id, name, brand, size, model, unit, stock_quantity, safety_stock, location,
             production_date, expiry_date, shelf_life_months, la_cert_no, la_cert_image, la_cert_expiry,
             status, created_at, updated_at
      FROM ppe_items
      WHERE deleted_at IS NULL
    `;

    const params = [];

    if (options.brand) {
      sql += ' AND brand = ?';
      params.push(options.brand);
    }

    if (options.keyword) {
      sql += ' AND (name LIKE ? OR brand LIKE ? OR model LIKE ?)';
      const keyword = `%${options.keyword}%`;
      params.push(keyword, keyword, keyword);
    }

    sql += ' ORDER BY name, brand';

    return await query(sql, params);
  }

  /**
   * 查询低库存物品（库存低于预警值）
   * @returns {Promise<Array>} 低库存物品列表
   */
  static async findLowStock() {
    const sql = `
      SELECT id, name, brand, size, model, unit, stock_quantity, safety_stock, location,
             production_date, expiry_date, shelf_life_months, la_cert_no, la_cert_expiry,
             status, created_at, updated_at
      FROM ppe_items
      WHERE deleted_at IS NULL
        AND stock_quantity <= safety_stock
      ORDER BY (stock_quantity / safety_stock) ASC
    `;

    return await query(sql);
  }

  /**
   * 查询即将过期的物品
   * @param {number} days - 多少天内过期（默认30天）
   * @returns {Promise<Array>} 即将过期物品列表
   */
  static async findExpiring(days = 30) {
    const sql = `
      SELECT id, name, brand, size, model, unit, stock_quantity, safety_stock, location,
             production_date, expiry_date, shelf_life_months, la_cert_no, la_cert_expiry,
             status, created_at, updated_at,
             DATEDIFF(expiry_date, CURDATE()) as days_remaining
      FROM ppe_items
      WHERE deleted_at IS NULL
        AND expiry_date IS NOT NULL
        AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND stock_quantity > 0
      ORDER BY expiry_date ASC
    `;

    return await query(sql, [days]);
  }

  /**
   * 更新库存数量
   * @param {number} id - 物品ID
   * @param {number} quantity - 变化数量（正数为增加，负数为减少）
   * @param {Object} connection - 数据库连接（用于事务）
   * @returns {Promise<boolean>} 是否更新成功
   */
  static async updateStock(id, quantity, connection = null) {
    const sql = `
      UPDATE ppe_items
      SET stock_quantity = stock_quantity + ?, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `;

    if (connection) {
      const [result] = await connection.execute(sql, [quantity, id]);
      return result.affectedRows > 0;
    } else {
      const result = await query(sql, [quantity, id]);
      return result.affectedRows > 0;
    }
  }

  /**
   * 更新物品信息
   * @param {number} id - 物品ID
   * @param {Object} item - 更新的物品信息
   * @returns {Promise<boolean>} 是否更新成功
   */
  static async update(id, item) {
    const allowedFields = [
      'name', 'brand', 'size', 'model', 'unit',
      'safety_stock', 'location', 'production_date', 'expiry_date',
      'shelf_life_months', 'la_cert_no', 'la_cert_image', 'la_cert_expiry', 'status'
    ];
    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (item[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(item[field]);
      }
    }

    if (updates.length === 0) {
      return false;
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    const sql = `
      UPDATE ppe_items
      SET ${updates.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `;

    const result = await query(sql, params);
    return result.affectedRows > 0;
  }

  /**
   * 删除物品（软删除）
   * @param {number} id - 物品ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async delete(id) {
    const sql = `
      UPDATE ppe_items
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `;
    
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * 获取所有分类
   * @returns {Promise<Array>} 分类列表
   */
  static async getBrands() {
    const sql = `
      SELECT DISTINCT brand
      FROM ppe_items
      WHERE deleted_at IS NULL AND brand IS NOT NULL
      ORDER BY brand
    `;

    const rows = await query(sql);
    return rows.map(row => row.brand);
  }

  /**
   * 获取库存统计信息
   * @returns {Promise<Object>} 统计信息
   */
  static async getStatistics() {
    const sql = `
      SELECT
        COUNT(*) as total_items,
        SUM(stock_quantity) as total_quantity,
        SUM(CASE WHEN stock_quantity <= safety_stock THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND stock_quantity > 0 THEN 1 ELSE 0 END) as expiring_count,
        SUM(CASE WHEN la_cert_expiry IS NOT NULL AND la_cert_expiry <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) as la_cert_expiring_count
      FROM ppe_items
      WHERE deleted_at IS NULL
    `;

    const rows = await query(sql);
    return rows[0];
  }

  /**
   * 检查库存是否充足
   * @param {number} id - 物品ID
   * @param {number} requiredQuantity - 需要的数量
   * @returns {Promise<boolean>} 库存是否充足
   */
  static async checkStock(id, requiredQuantity) {
    const sql = `
      SELECT stock_quantity
      FROM ppe_items
      WHERE id = ? AND deleted_at IS NULL
    `;

    const rows = await query(sql, [id]);

    if (rows.length === 0) {
      return false;
    }

    return rows[0].stock_quantity >= requiredQuantity;
  }

  /**
   * 查询LA证书即将过期的物品
   * @param {number} days - 多少天内过期（默认90天）
   * @returns {Promise<Array>} LA证书即将过期物品列表
   */
  static async findLACertExpiring(days = 90) {
    const sql = `
      SELECT id, name, brand, size, model, la_cert_no, la_cert_image, la_cert_expiry,
             stock_quantity, unit, DATEDIFF(la_cert_expiry, CURDATE()) as days_remaining
      FROM ppe_items
      WHERE deleted_at IS NULL
        AND la_cert_expiry IS NOT NULL
        AND la_cert_expiry <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND stock_quantity > 0
      ORDER BY la_cert_expiry ASC
    `;

    return await query(sql, [days]);
  }
}

module.exports = PPEItem;
