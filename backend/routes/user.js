const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || 'default-secret-key';

// 用户登录（支持多租户）
router.post('/login', async (req, res) => {
  try {
    const { companyCode, phone, password } = req.body;
    
    // 先查询租户
    const [tenants] = await pool.query('SELECT * FROM core_tenants WHERE code = ? AND status = 1', [companyCode]);
    if (tenants.length === 0) {
      return res.json({ code: 401, msg: '公司代码不存在' });
    }
    const tenant = tenants[0];
    
    // 查询用户（带租户隔离）
    const [users] = await pool.query(
      'SELECT u.*, t.name as company_name, t.code as company_code FROM core_users u JOIN core_tenants t ON u.tenant_id = t.id WHERE u.phone = ? AND u.tenant_id = ? AND u.deleted_at IS NULL',
      [phone, tenant.id]
    );
    
    if (users.length === 0) {
      return res.json({ code: 401, msg: '手机号或密码错误' });
    }
    
    const user = users[0];
    
    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.json({ code: 401, msg: '手机号或密码错误' });
    }
    
    // 生成JWT（包含 company_id）
    const token = jwt.sign(
      { 
        id: user.id, 
        phone: user.phone, 
        name: user.name,
        role: user.role,
        companyId: user.tenant_id,
        companyCode: user.company_code,
        companyName: user.company_name
      },
      SECRET_KEY,
      { expiresIn: '24h' }
    );
    
    res.json({
      code: 200,
      msg: '登录成功',
      data: {
        token,
        isFirstLogin: user.is_first_login === 1,
        userInfo: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          companyId: user.tenant_id,
          companyCode: user.company_code,
          companyName: user.company_name
        }
      }
    });
  } catch (error) {
    console.error('登录失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 获取用户信息
router.get('/info', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.json({ code: 401, msg: '未登录' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    res.json({
      code: 200,
      data: decoded
    });
  } catch (error) {
    res.json({ code: 401, msg: 'token无效' });
  }
});

// 注册新公司（SaaS 注册入口）
router.post('/register-company', async (req, res) => {
  try {
    const { companyName, companyCode, contactName, contactPhone, adminPassword } = req.body;
    
    // 检查公司代码是否已存在
    const [existing] = await pool.query('SELECT id FROM core_tenants WHERE code = ?', [companyCode]);
    if (existing.length > 0) {
      return res.json({ code: 400, msg: '公司代码已存在' });
    }
    
    // 创建租户
    const [tenantResult] = await pool.query(
      'INSERT INTO core_tenants (name, code, contact_name, contact_phone, status) VALUES (?, ?, ?, ?, 1)',
      [companyName, companyCode, contactName, contactPhone]
    );
    const tenantId = tenantResult.insertId;
    
    // 创建管理员账号
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      'INSERT INTO core_users (tenant_id, name, phone, password, role, department) VALUES (?, ?, ?, ?, "admin", "管理部")',
      [tenantId, contactName, contactPhone, hashedPassword]
    );
    
    res.json({
      code: 200,
      msg: '注册成功',
      data: {
        companyId,
        companyCode,
        companyName
      }
    });
  } catch (error) {
    console.error('注册失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 扫码领用 - 免登录登记（简化版）
router.post('/quick-outbound', async (req, res) => {
  try {
    const { companyCode, employeeName, employeePhone, ppeId, quantity, purpose } = req.body;
    
    // 查询租户
    const [tenants] = await pool.query('SELECT id FROM core_tenants WHERE code = ? AND status = 1', [companyCode]);
    if (tenants.length === 0) {
      return res.json({ code: 400, msg: '公司代码无效' });
    }
    const tenantId = tenants[0].id;
    
    // 查询物品
    const [items] = await pool.query(
      'SELECT * FROM inv_items WHERE id = ? AND tenant_id = ?',
      [ppeId, tenantId]
    );
    if (items.length === 0) {
      return res.json({ code: 400, msg: '物品不存在' });
    }
    const item = items[0];
    
    // 检查库存
    if (item.quantity < quantity) {
      return res.json({ code: 400, msg: '库存不足' });
    }
    
    // 生成出库单号
    const outboundNo = 'CK' + Date.now();
    
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 创建出库记录（新表 inv_outbound）
      await connection.query(
        'INSERT INTO inv_outbound (tenant_id, warehouse_id, item_id, quantity, employee_name, employee_phone, purpose, source_type, outbound_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())',
        [tenantId, item.warehouse_id, ppeId, quantity, employeeName, employeePhone, purpose || '扫码领用', 'scan']
      );
      
      // 扣减库存（新表 inv_items）
      await connection.query(
        'UPDATE inv_items SET quantity = quantity - ? WHERE id = ? AND tenant_id = ?',
        [quantity, ppeId, tenantId]
      );
      
      // 插入库存流水
      await connection.query(
        'INSERT INTO inv_transactions (tenant_id, warehouse_id, item_id, type, quantity, before_qty, after_qty, source_no, operator_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tenantId, item.warehouse_id, ppeId, 'outbound', quantity, item.quantity, item.quantity - quantity, outboundNo, employeeName, purpose || '扫码领用']
      );
      
      await connection.commit();
      
      res.json({
        code: 200,
        msg: '领用成功',
        data: {
          outboundNo,
          itemName: item.name,
          quantity
        }
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('领用失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 公开接口：获取公司物品列表（无需登录，用于扫码领用页面）
router.get('/public-ppe-list', async (req, res) => {
  try {
    const { companyCode } = req.query;
    
    // 查询公司
    const [companies] = await pool.query('SELECT id FROM companies WHERE code = ? AND status = "active"', [companyCode]);
    if (companies.length === 0) {
      return res.json({ code: 400, msg: '公司代码无效' });
    }
    
    // 获取物品列表（只返回有库存的）- 使用新表 inv_items
    const [items] = await pool.query(
      'SELECT id, name, category_code as category, specification, unit, quantity, safety_stock as min_stock FROM inv_items WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name',
      [companies[0].id]
    );
    
    res.json({ code: 200, data: items });
  } catch (error) {
    console.error('获取物品列表失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 修改密码（首次登录或主动修改）
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.json({ code: 401, msg: '未登录' });
    }

    const decoded = jwt.verify(token, SECRET_KEY);
    const { oldPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.json({ code: 400, msg: '新密码至少6位' });
    }

    // 查询用户
    const [users] = await pool.query(
      'SELECT * FROM core_users WHERE id = ? AND tenant_id = ?',
      [decoded.id, decoded.companyId]
    );

    if (users.length === 0) {
      return res.json({ code: 404, msg: '用户不存在' });
    }

    const user = users[0];

    // 验证旧密码（如果不是首次登录）
    if (user.is_first_login === 0) {
      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) {
        return res.json({ code: 401, msg: '原密码错误' });
      }
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE core_users SET password = ?, is_first_login = 0 WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ code: 200, msg: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;
