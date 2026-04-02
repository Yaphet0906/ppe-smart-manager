/**
 * PPE物品模型
 * 处理劳保用品相关的数据库操作 - 使用新表 inv_items
 */

const { query, transaction } = require('../config/database');

class PPEItem {
  /**
   * 创建新的PPE物品
   * @param {Object} item - 物品信息
   * @param {string} item.name - 物品名称
   * @param {string} item.category_code - 分类编码
   * @param {string} item.specification - 规格
   * @param {string} item.unit - 单位
   * @param {number} item.quantity - 初始库存数量
   * @param {number} item.safety_stock - 最低库存预警值
   * @param {string} item.brand - 品牌
   * @param {string} item.model - 型号
   * @param {number} item.warehouse_id - 仓库ID
   * @param {number} item.tenant_id - 租户ID
   * @returns {Promise<Object>} 创建的物品信息
   */
  static async create(item) {
    const sql = `
      INSERT INTO inv_items 
      (tenant_id, warehouse_id, name, category_code, specification, unit, quantity, safety_stock, brand, model, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    `;

    const params = [
      item.tenant_id,
      item.warehouse_id || null,
      item.name,
      item.category_code || 'other',
      item.specification || null,
      item.unit || '件',
      item.quantity || 0,
      item.safety_stock || 10,
      item.brand || null,
      item.model || null
    ];

    const result = await query(sql, params);

    return {
      id: result.insertId,
      tenant_id: item.tenant_id,
      warehouse_id: item.warehouse_id,
      name: item.name,
      category_code: item.category_code || 'other',
      specification: item.specification,
      unit: item.unit || '件',
      quantity: item.quantity || 0,
      safety_stock: item.safety_stock || 10,
      brand: item.brand,
      model: item.model
    };
  }

  /**
   * 根据ID查询物品
   * @param {number} id - 物品ID
   * @param {number} tenant_id - 租户ID
   * @returns {Promise<Object|null>} 物品信息
   */
  static async findById(id, tenant_id) {
    const sql = `
      SELECT id, tenant_id, warehouse_id, name, category_code, specification, unit, 
             quantity, safety_stock, brand, model, status, created_at, updated_at
      FROM inv_items
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;

    const rows = await query(sql, [id, tenant_id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 查询所有物品
   * @param {Object} options - 查询选项
   * @param {number} options.tenant_id - 租户ID
   * @param {number} options.warehouse_id - 仓库ID（可选）
   * @param {string} options.category_code - 按分类筛选
   * @param {string} options.keyword - 按关键词搜索（名称/规格/品牌/型号）
   * @returns {Promise<Array>} 物品列表
   */
  static async findAll(options = {}) {
    let sql = `
      SELECT id, tenant_id, warehouse_id, name, category_code, specification, unit, 
             quantity, safety_stock, brand, model, status, created_at, updated_at
      FROM inv_items
      WHERE deleted_at IS NULL
    `;

    const params = [];

    if (options.tenant_id) {
      sql += ' AND tenant_id = ?';
      params.push(options.tenant_id);
    }

    if (options.warehouse_id) {
      sql += ' AND warehouse_id = ?';
      params.push(options.warehouse_id);
    }

    if (options.category_code) {
      sql += ' AND category_code = ?';
      params.push(options.category_code);
    }

    if (options.keyword) {
      sql += ' AND (name LIKE ? OR specification LIKE ? OR brand LIKE ? OR model LIKE ?)';
      const keyword = `%${options.keyword}%`;
      params.push(keyword, keyword, keyword, keyword);
    }

    sql += ' ORDER BY name, category_code';

    return await query(sql, params);
  }

  /**
   * 查询低库存物品（库存低于预警值）
   * @param {number} tenant_id - 租户ID
   * @param {number} warehouse_id - 仓库ID（可选）
   * @returns {Promise<Array>} 低库存物品列表
   */
  static async findLowStock(tenant_id, warehouse_id = null) {
    let sql = `
      SELECT id, tenant_id, warehouse_id, name, category_code, specification, unit, 
             quantity, safety_stock, brand, model, status, created_at, updated_at
      FROM inv_items
      WHERE deleted_at IS NULL
        AND tenant_id = ?
        AND quantity <= safety_stock
    `;
    const params = [tenant_id];

    if (warehouse_id) {
      sql += ' AND warehouse_id = ?';
      params.push(warehouse_id);
    }

    sql += ' ORDER BY (quantity / safety_stock) ASC';

    return await query(sql, params);
  }

  /**
   * 更新库存数量
   * @param {number} id - 物品ID
   * @param {number} quantity - 变化数量（正数为增加，负数为减少）
   * @param {number} tenant_id - 租户ID
   * @param {Object} connection - 数据库连接（用于事务）
   * @returns {Promise<boolean>} 是否更新成功
   */
  static async updateStock(id, quantity, tenant_id, connection = null) {
    const sql = `
      UPDATE inv_items
      SET quantity = quantity + ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;

    if (connection) {
      const [result] = await connection.execute(sql, [quantity, id, tenant_id]);
      return result.affectedRows > 0;
    } else {
      const result = await query(sql, [quantity, id, tenant_id]);
      return result.affectedRows > 0;
    }
  }

  /**
   * 更新物品信息
   * @param {number} id - 物品ID
   * @param {number} tenant_id - 租户ID
   * @param {Object} item - 更新的物品信息
   * @returns {Promise<boolean>} 是否更新成功
   */
  static async update(id, tenant_id, item) {
    const allowedFields = [
      'name', 'category_code', 'specification', 'unit',
      'safety_stock', 'brand', 'model', 'warehouse_id', 'status'
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
    params.push(tenant_id);

    const sql = `
      UPDATE inv_items
      SET ${updates.join(', ')}
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;

    const result = await query(sql, params);
    return result.affectedRows > 0;
  }

  /**
   * 删除物品（软删除）
   * @param {number} id - 物品ID
   * @param {number} tenant_id - 租户ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async delete(id, tenant_id) {
    const sql = `
      UPDATE inv_items
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;
    
    const result = await query(sql, [id, tenant_id]);
    return result.affectedRows > 0;
  }

  /**
   * 获取所有品牌
   * @param {number} tenant_id - 租户ID
   * @returns {Promise<Array>} 品牌列表
   */
  static async getBrands(tenant_id) {
    const sql = `
      SELECT DISTINCT brand
      FROM inv_items
      WHERE deleted_at IS NULL AND tenant_id = ? AND brand IS NOT NULL AND brand != ''
      ORDER BY brand
    `;

    const rows = await query(sql, [tenant_id]);
    return rows.map(row => row.brand);
  }

  /**
   * 获取库存统计信息
   * @param {number} tenant_id - 租户ID
   * @param {number} warehouse_id - 仓库ID（可选）
   * @returns {Promise<Object>} 统计信息
   */
  static async getStatistics(tenant_id, warehouse_id = null) {
    let sql = `
      SELECT
        COUNT(*) as total_items,
        SUM(quantity) as total_quantity,
        SUM(CASE WHEN quantity <= safety_stock THEN 1 ELSE 0 END) as low_stock_count
      FROM inv_items
      WHERE deleted_at IS NULL AND tenant_id = ?
    `;
    const params = [tenant_id];

    if (warehouse_id) {
      sql += ' AND warehouse_id = ?';
      params.push(warehouse_id);
    }

    const rows = await query(sql, params);
    return rows[0];
  }

  /**
   * 检查库存是否充足
   * @param {number} id - 物品ID
   * @param {number} tenant_id - 租户ID
   * @param {number} requiredQuantity - 需要的数量
   * @returns {Promise<boolean>} 库存是否充足
   */
  static async checkStock(id, tenant_id, requiredQuantity) {
    const sql = `
      SELECT quantity
      FROM inv_items
      WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
    `;

    const rows = await query(sql, [id, tenant_id]);

    if (rows.length === 0) {
      return false;
    }

    return rows[0].quantity >= requiredQuantity;
  }
}

module.exports = PPEItem;
