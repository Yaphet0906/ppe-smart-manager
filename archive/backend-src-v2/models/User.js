/**
 * 用户模型
 * 处理用户相关的数据库操作
 */

const { query, transaction } = require('../config/database');

class User {
  /**
   * 创建新用户
   * @param {Object} user - 用户信息
   * @param {string} user.name - 姓名
   * @param {string} user.phone - 电话
   * @param {string} user.password_hash - 密码哈希
   * @param {string} user.role - 角色（admin/manager/employee）
   * @param {string} user.department - 部门
   * @param {string} user.employee_no - 工号
   * @returns {Promise<Object>} 创建的用户信息
   */
  static async create(user) {
    const sql = `
      INSERT INTO users (name, phone, password_hash, role, department, employee_no, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      user.name,
      user.phone,
      user.password_hash,
      user.role || 'employee',
      user.department || null,
      user.employee_no || null
    ];

    const result = await query(sql, params);

    return {
      id: result.insertId,
      name: user.name,
      phone: user.phone,
      role: user.role || 'employee',
      department: user.department,
      employee_no: user.employee_no
    };
  }

  /**
   * 根据电话号码查询用户（不包含密码）
   * @param {string} phone - 电话号码
   * @returns {Promise<Object|null>} 用户信息
   */
  static async findByPhone(phone) {
    const sql = `
      SELECT id, name, phone, role, department, employee_no, status, created_at, updated_at
      FROM users
      WHERE phone = ? AND deleted_at IS NULL
    `;

    const rows = await query(sql, [phone]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 根据电话号码查询用户（包含密码哈希，用于登录验证）
   * @param {string} phone - 电话号码
   * @returns {Promise<Object|null>} 用户信息（包含password_hash）
   */
  static async findByPhoneWithPassword(phone) {
    const sql = `
      SELECT id, name, phone, password_hash, role, department, employee_no, status, created_at, updated_at
      FROM users
      WHERE phone = ? AND deleted_at IS NULL
    `;

    const rows = await query(sql, [phone]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 根据ID查询用户
   * @param {number} id - 用户ID
   * @returns {Promise<Object|null>} 用户信息
   */
  static async findById(id) {
    const sql = `
      SELECT id, name, phone, role, department, employee_no, created_at, updated_at
      FROM users
      WHERE id = ? AND deleted_at IS NULL
    `;
    
    const rows = await query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 查询所有用户
   * @param {Object} options - 查询选项
   * @param {string} options.role - 按角色筛选
   * @param {string} options.department - 按部门筛选
   * @returns {Promise<Array>} 用户列表
   */
  static async findAll(options = {}) {
    let sql = `
      SELECT id, name, phone, role, department, employee_no, created_at, updated_at
      FROM users
      WHERE deleted_at IS NULL
    `;
    
    const params = [];
    
    if (options.role) {
      sql += ' AND role = ?';
      params.push(options.role);
    }
    
    if (options.department) {
      sql += ' AND department = ?';
      params.push(options.department);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    return await query(sql, params);
  }

  /**
   * 更新用户信息
   * @param {number} id - 用户ID
   * @param {Object} user - 更新的用户信息
   * @returns {Promise<boolean>} 是否更新成功
   */
  static async update(id, user) {
    const allowedFields = ['name', 'phone', 'password', 'role', 'department', 'employee_no'];
    const updates = [];
    const params = [];
    
    for (const field of allowedFields) {
      if (user[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(user[field]);
      }
    }
    
    if (updates.length === 0) {
      return false;
    }
    
    updates.push('updated_at = NOW()');
    params.push(id);
    
    const sql = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `;
    
    const result = await query(sql, params);
    return result.affectedRows > 0;
  }

  /**
   * 删除用户（软删除）
   * @param {number} id - 用户ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async delete(id) {
    const sql = `
      UPDATE users
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `;
    
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * 硬删除用户（永久删除）
   * @param {number} id - 用户ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async hardDelete(id) {
    const sql = 'DELETE FROM users WHERE id = ?';
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * 检查电话号码是否已存在
   * @param {string} phone - 电话号码
   * @param {number} excludeId - 排除的用户ID（用于更新时检查）
   * @returns {Promise<boolean>} 是否已存在
   */
  static async isPhoneExists(phone, excludeId = null) {
    let sql = 'SELECT id FROM users WHERE phone = ? AND deleted_at IS NULL';
    const params = [phone];
    
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    
    const rows = await query(sql, params);
    return rows.length > 0;
  }

  /**
   * 根据工号查询用户
   * @param {string} employeeNo - 工号
   * @returns {Promise<Object|null>} 用户信息
   */
  static async findByEmployeeNo(employeeNo) {
    const sql = `
      SELECT id, name, phone, role, department, employee_no, created_at, updated_at
      FROM users
      WHERE employee_no = ? AND deleted_at IS NULL
    `;
    
    const rows = await query(sql, [employeeNo]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 获取用户统计信息
   * @returns {Promise<Object>} 统计信息
   */
  static async getStatistics() {
    const sql = `
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
        SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as manager_count,
        SUM(CASE WHEN role = 'employee' THEN 1 ELSE 0 END) as employee_count
      FROM users
      WHERE deleted_at IS NULL
    `;
    
    const rows = await query(sql);
    return rows[0];
  }
}

module.exports = User;
