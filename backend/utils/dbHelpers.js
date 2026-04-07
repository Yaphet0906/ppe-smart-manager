/**
 * 数据库辅助函数 - 封装常用查询操作
 */

const pool = require('../config/db');
const logger = require('../config/logger');

/**
 * 根据ID获取单个物品
 * @param {number} itemId - 物品ID
 * @param {number} tenantId - 租户ID
 * @param {Object} options - 选项 { includeDeleted: false }
 * @returns {Promise<Object|null>} 物品对象或null
 */
async function getItemById(itemId, tenantId, options = {}) {
  const { includeDeleted = false } = options;
  
  let sql = 'SELECT * FROM inv_items WHERE id = ? AND tenant_id = ?';
  const params = [itemId, tenantId];
  
  if (!includeDeleted) {
    sql += ' AND deleted_at IS NULL';
  }
  
  const [items] = await pool.query(sql, params);
  return items.length > 0 ? items[0] : null;
}

/**
 * 获取物品库存和仓库信息
 * @param {number} itemId - 物品ID
 * @param {number} tenantId - 租户ID
 * @returns {Promise<Object|null>} { quantity, warehouse_id } 或null
 */
async function getItemStock(itemId, tenantId) {
  const [items] = await pool.query(
    'SELECT quantity, warehouse_id FROM inv_items WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL',
    [itemId, tenantId]
  );
  return items.length > 0 ? items[0] : null;
}

/**
 * 获取物品列表（简单）
 * @param {number} tenantId - 租户ID
 * @param {Object} options - 选项 { warehouseId, category }
 * @returns {Promise<Array>} 物品列表
 */
async function getItemList(tenantId, options = {}) {
  const { warehouseId, category } = options;
  
  let sql = 'SELECT id, name FROM inv_items WHERE tenant_id = ? AND deleted_at IS NULL';
  const params = [tenantId];
  
  if (warehouseId) {
    sql += ' AND warehouse_id = ?';
    params.push(warehouseId);
  }
  
  if (category) {
    sql += ' AND category_code = ?';
    params.push(category);
  }
  
  sql += ' ORDER BY name';
  
  const [items] = await pool.query(sql, params);
  return items;
}

/**
 * 获取统计数据
 * @param {number} tenantId - 租户ID
 * @param {Object} options - 选项 { warehouseId }
 * @returns {Promise<Object>} { total, normal, low, out }
 */
async function getStats(tenantId, options = {}) {
  const { warehouseId } = options;
  
  let whereClause = 'tenant_id = ? AND deleted_at IS NULL';
  const params = [tenantId];
  
  if (warehouseId) {
    whereClause += ' AND warehouse_id = ?';
    params.push(warehouseId);
  }
  
  const [[totalResult]] = await pool.query(
    `SELECT COUNT(*) as count FROM inv_items WHERE ${whereClause}`,
    [...params]
  );
  
  const [[normalResult]] = await pool.query(
    `SELECT COUNT(*) as count FROM inv_items WHERE ${whereClause} AND quantity > safety_stock`,
    [...params]
  );
  
  const [[lowResult]] = await pool.query(
    `SELECT COUNT(*) as count FROM inv_items WHERE ${whereClause} AND quantity <= safety_stock AND quantity > 0`,
    [...params]
  );
  
  const [[outResult]] = await pool.query(
    `SELECT COUNT(*) as count FROM inv_items WHERE ${whereClause} AND quantity = 0`,
    [...params]
  );
  
  return {
    total: totalResult.count,
    normal: normalResult.count,
    low: lowResult.count,
    out: outResult.count
  };
}

/**
 * 更新物品库存
 * @param {Object} connection - 数据库连接（事务）
 * @param {number} itemId - 物品ID
 * @param {number} tenantId - 租户ID
 * @param {number} delta - 库存变化量（正数增加，负数减少）
 * @returns {Promise<boolean>} 是否成功
 */
async function updateItemStock(connection, itemId, tenantId, delta) {
  const [result] = await connection.query(
    'UPDATE inv_items SET quantity = quantity + ? WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL',
    [delta, itemId, tenantId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  getItemById,
  getItemStock,
  getItemList,
  getStats,
  updateItemStock
};
