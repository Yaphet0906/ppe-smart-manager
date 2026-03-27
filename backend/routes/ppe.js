const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || 'default-secret-key';

// 验证 token 并获取 company_id 的中间件
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.json({ code: 401, msg: '未登录' });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    req.companyId = decoded.companyId;
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.json({ code: 401, msg: 'token无效' });
  }
};

// 获取PPE设备列表（带公司隔离）
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM ppe_items WHERE company_id = ? AND deleted_at IS NULL ORDER BY id DESC',
      [req.companyId]
    );
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error('获取PPE列表失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 获取统计数据（带公司隔离）
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [totalResult] = await pool.query(
      'SELECT COUNT(*) as count FROM ppe_items WHERE company_id = ? AND deleted_at IS NULL',
      [req.companyId]
    );
    const [normalResult] = await pool.query(
      'SELECT COUNT(*) as count FROM ppe_items WHERE company_id = ? AND quantity > min_stock AND deleted_at IS NULL',
      [req.companyId]
    );
    const [lowResult] = await pool.query(
      'SELECT COUNT(*) as count FROM ppe_items WHERE company_id = ? AND quantity <= min_stock AND quantity > 0 AND deleted_at IS NULL',
      [req.companyId]
    );
    const [outResult] = await pool.query(
      'SELECT COUNT(*) as count FROM ppe_items WHERE company_id = ? AND quantity = 0 AND deleted_at IS NULL',
      [req.companyId]
    );
    
    res.json({
      code: 200,
      data: {
        total: totalResult[0].count,
        normal: normalResult[0].count,
        low: lowResult[0].count,
        out: outResult[0].count
      }
    });
  } catch (error) {
    console.error('获取统计数据失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 添加PPE设备（带公司隔离）
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { name, category, specification, unit, quantity, min_stock, supplier, remarks } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO ppe_items (company_id, name, category, specification, unit, quantity, min_stock, supplier, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.companyId, name, category, specification, unit || '件', quantity || 0, min_stock || 10, supplier, remarks]
    );
    
    res.json({ code: 200, msg: '添加成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('添加PPE失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 更新PPE设备（带公司隔离）
router.post('/update', authMiddleware, async (req, res) => {
  try {
    const { id, name, category, specification, unit, quantity, min_stock, supplier, remarks } = req.body;
    
    // 先检查是否属于该公司
    const [existing] = await pool.query(
      'SELECT id FROM ppe_items WHERE id = ? AND company_id = ?',
      [id, req.companyId]
    );
    if (existing.length === 0) {
      return res.json({ code: 403, msg: '无权操作该物品' });
    }
    
    await pool.query(
      'UPDATE ppe_items SET name = ?, category = ?, specification = ?, unit = ?, quantity = ?, min_stock = ?, supplier = ?, remarks = ? WHERE id = ? AND company_id = ?',
      [name, category, specification, unit, quantity, min_stock, supplier, remarks, id, req.companyId]
    );
    
    res.json({ code: 200, msg: '更新成功' });
  } catch (error) {
    console.error('更新PPE失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 删除PPE设备（软删除，带公司隔离）
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 先检查是否属于该公司
    const [existing] = await pool.query(
      'SELECT id FROM ppe_items WHERE id = ? AND company_id = ?',
      [id, req.companyId]
    );
    if (existing.length === 0) {
      return res.json({ code: 403, msg: '无权操作该物品' });
    }
    
    await pool.query(
      'UPDATE ppe_items SET deleted_at = NOW() WHERE id = ? AND company_id = ?',
      [id, req.companyId]
    );
    
    res.json({ code: 200, msg: '删除成功' });
  } catch (error) {
    console.error('删除PPE失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 入库（带公司隔离）
router.post('/inbound', authMiddleware, async (req, res) => {
  try {
    const { ppeId, quantity, supplier, remarks } = req.body;
    
    // 检查物品是否属于该公司
    const [items] = await pool.query(
      'SELECT * FROM ppe_items WHERE id = ? AND company_id = ?',
      [ppeId, req.companyId]
    );
    if (items.length === 0) {
      return res.json({ code: 403, msg: '无权操作该物品' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 生成入库单号
      const inboundNo = 'RK' + Date.now();
      
      // 创建入库记录
      await connection.query(
        'INSERT INTO inbound_records (company_id, inbound_no, inbound_date, supplier, remarks, operator_id) VALUES (?, ?, CURDATE(), ?, ?, ?)',
        [req.companyId, inboundNo, supplier, remarks, req.userId]
      );
      
      // 添加入库明细
      await connection.query(
        'INSERT INTO inbound_items (inbound_id, item_id, quantity) VALUES (LAST_INSERT_ID(), ?, ?)',
        [ppeId, quantity]
      );
      
      // 更新库存
      await connection.query(
        'UPDATE ppe_items SET quantity = quantity + ? WHERE id = ? AND company_id = ?',
        [quantity, ppeId, req.companyId]
      );
      
      await connection.commit();
      
      res.json({ code: 200, msg: '入库成功', data: { inboundNo } });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('入库失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 出库（带公司隔离）
router.post('/outbound', authMiddleware, async (req, res) => {
  try {
    const { ppeId, quantity, employeeName, employeePhone, department, purpose, remarks } = req.body;
    
    // 检查物品是否属于该公司
    const [items] = await pool.query(
      'SELECT * FROM ppe_items WHERE id = ? AND company_id = ?',
      [ppeId, req.companyId]
    );
    if (items.length === 0) {
      return res.json({ code: 403, msg: '无权操作该物品' });
    }
    
    const item = items[0];
    
    // 检查库存
    if (item.quantity < quantity) {
      return res.json({ code: 400, msg: '库存不足' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 生成出库单号
      const outboundNo = 'CK' + Date.now();
      
      // 创建出库记录
      await connection.query(
        'INSERT INTO outbound_records (company_id, outbound_no, outbound_date, employee_name, employee_phone, department, purpose, remarks, operator_id) VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)',
        [req.companyId, outboundNo, employeeName, employeePhone, department, purpose, remarks, req.userId]
      );
      
      // 添加出库明细
      await connection.query(
        'INSERT INTO outbound_items (outbound_id, item_id, quantity) VALUES (LAST_INSERT_ID(), ?, ?)',
        [ppeId, quantity]
      );
      
      // 扣减库存
      await connection.query(
        'UPDATE ppe_items SET quantity = quantity - ? WHERE id = ? AND company_id = ?',
        [quantity, ppeId, req.companyId]
      );
      
      await connection.commit();
      
      res.json({ code: 200, msg: '出库成功', data: { outboundNo } });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('出库失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 获取入库记录（带公司隔离）
router.get('/inbound-records', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, i.name as ppeName 
      FROM inbound_records r 
      JOIN inbound_items ri ON r.id = ri.inbound_id
      JOIN ppe_items i ON ri.item_id = i.id 
      WHERE r.company_id = ?
      ORDER BY r.created_at DESC
    `, [req.companyId]);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error('获取入库记录失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 获取出库记录（带公司隔离）
router.get('/outbound-records', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, i.name as ppeName 
      FROM outbound_records r 
      JOIN outbound_items ri ON r.id = ri.outbound_id
      JOIN ppe_items i ON ri.item_id = i.id 
      WHERE r.company_id = ?
      ORDER BY r.created_at DESC
    `, [req.companyId]);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error('获取出库记录失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 获取预警数据（带公司隔离）
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const [low] = await pool.query(
      'SELECT * FROM ppe_items WHERE company_id = ? AND quantity <= min_stock AND quantity > 0 AND deleted_at IS NULL',
      [req.companyId]
    );
    const [out] = await pool.query(
      'SELECT * FROM ppe_items WHERE company_id = ? AND quantity = 0 AND deleted_at IS NULL',
      [req.companyId]
    );
    
    res.json({ code: 200, data: { low, out } });
  } catch (error) {
    console.error('获取预警数据失败：', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 截图 OCR 识别（入库前预览）
router.post('/ocr-recognize', authMiddleware, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.json({ code: 400, msg: '请上传图片' });
    }
    
    // 调用讯飞 OCR
    const { recognizeDeliveryOrder } = require('../src/utils/xunfei_ocr');
    const result = await recognizeDeliveryOrder(imageBase64);
    
    if (!result.success) {
      return res.json({ code: 500, msg: result.message || '识别失败' });
    }
    
    // 获取公司现有的 PPE 物品列表，用于匹配
    const [ppeItems] = await pool.query(
      'SELECT id, name, category, unit FROM ppe_items WHERE company_id = ? AND deleted_at IS NULL',
      [req.companyId]
    );
    
    // 匹配识别出的物品到数据库
    const matchedItems = result.data.items.map(item => {
      // 模糊匹配物品名称
      const matched = ppeItems.find(ppe => 
        ppe.name.includes(item.name) || item.name.includes(ppe.name)
      );
      
      return {
        ...item,
        matchedId: matched ? matched.id : null,
        matchedName: matched ? matched.name : null,
        unit: matched ? matched.unit : item.unit,
        isNew: !matched // 是否是新物品
      };
    });
    
    res.json({
      code: 200,
      data: {
        recognizedText: result.data.rawText,
        items: matchedItems,
        recipient: result.data.recipient,
        date: result.data.date,
        orderNumber: result.data.orderNumber,
        confidence: result.data.confidence
      }
    });
  } catch (error) {
    console.error('OCR识别失败：', error);
    res.json({ code: 500, msg: '识别失败：' + error.message });
  }
});

// 截图 OCR 入库（确认后入库）
router.post('/ocr-inbound', authMiddleware, async (req, res) => {
  try {
    const { items, supplier, remarks } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.json({ code: 400, msg: '入库物品不能为空' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 生成入库单号
      const inboundNo = 'RK' + Date.now();
      
      // 创建入库记录
      const [inboundResult] = await connection.query(
        'INSERT INTO inbound_records (company_id, inbound_no, inbound_date, supplier, remarks, operator_id) VALUES (?, ?, CURDATE(), ?, ?, ?)',
        [req.companyId, inboundNo, supplier || 'OCR识别入库', remarks || '', req.userId]
      );
      const inboundId = inboundResult.insertId;
      
      // 处理每个物品
      const results = [];
      for (const item of items) {
        if (item.isNew) {
          // 新物品：先创建物品，再入库
          const [newItemResult] = await connection.query(
            'INSERT INTO ppe_items (company_id, name, category, unit, quantity, supplier) VALUES (?, ?, ?, ?, ?, ?)',
            [req.companyId, item.name, '其他', item.unit || '件', item.quantity, supplier || '']
          );
          
          // 添加入库明细
          await connection.query(
            'INSERT INTO inbound_items (inbound_id, item_id, quantity) VALUES (?, ?, ?)',
            [inboundId, newItemResult.insertId, item.quantity]
          );
          
          results.push({
            name: item.name,
            quantity: item.quantity,
            isNew: true,
            itemId: newItemResult.insertId
          });
        } else {
          // 已有物品：直接入库
          await connection.query(
            'INSERT INTO inbound_items (inbound_id, item_id, quantity) VALUES (?, ?, ?)',
            [inboundId, item.matchedId, item.quantity]
          );
          
          // 更新库存
          await connection.query(
            'UPDATE ppe_items SET quantity = quantity + ? WHERE id = ? AND company_id = ?',
            [item.quantity, item.matchedId, req.companyId]
          );
          
          results.push({
            name: item.matchedName || item.name,
            quantity: item.quantity,
            isNew: false,
            itemId: item.matchedId
          });
        }
      }
      
      await connection.commit();
      
      res.json({
        code: 200,
        msg: '入库成功',
        data: {
          inboundNo,
          items: results
        }
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('OCR入库失败：', error);
    res.json({ code: 500, msg: '入库失败：' + error.message });
  }
});

module.exports = router;