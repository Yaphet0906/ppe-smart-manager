const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || 'default-secret-key';

// 验证 token 中间件
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

// 获取用品列表（支持按仓库筛选）
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    let query = 'SELECT id, name, brand, model, category_code as category, specification, unit, quantity as stock, quantity as quantity, safety_stock as min_stock, status FROM inv_items WHERE tenant_id = ? AND deleted_at IS NULL';
    let params = [req.companyId];
    
    // 如果指定了仓库，按仓库筛选
    if (warehouse_id && warehouse_id !== 'null' && warehouse_id !== '') {
      query += ' AND warehouse_id = ?';
      params.push(warehouse_id);
    }
    
    query += ' ORDER BY id DESC';
    
    const [rows] = await pool.query(query, params);
    
    // 转换数据格式，适配前端
    const formattedRows = rows.map(row => ({
      ...row,
      type: row.category || '-',
      stock_status: row.quantity <= row.min_stock ? 'low' : 'normal'
    }));
    
    res.json({ code: 200, data: formattedRows });
  } catch (error) {
    console.error('获取用品列表错误:', error);
    res.json({ code: 500, msg: '服务器错误: ' + error.message });
  }
});

// 添加用品（使用新表 inv_items）
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { name, category, specification, unit, quantity, safety_stock, brand, model, warehouse_id, type } = req.body;
    const categoryCode = category || type || 'other';
    
    const [result] = await pool.query(
      'INSERT INTO inv_items (tenant_id, warehouse_id, name, category_code, specification, unit, quantity, safety_stock, brand, model, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.companyId, warehouse_id || null, name, categoryCode, specification, unit || '件', quantity || 0, safety_stock || 10, brand, model, 1]
    );
    res.json({ code: 200, msg: '添加成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('添加用品错误:', error);
    res.json({ code: 500, msg: '服务器错误: ' + error.message });
  }
});

// 更新用品（使用新表 inv_items）
router.post('/update', authMiddleware, async (req, res) => {
  try {
    const { id, name, category, specification, unit, quantity, safety_stock, brand, model, warehouse_id, type } = req.body;
    const categoryCode = category || type;
    
    await pool.query(
      'UPDATE inv_items SET name = ?, category_code = ?, specification = ?, unit = ?, quantity = ?, safety_stock = ?, brand = ?, model = ?, warehouse_id = ? WHERE id = ? AND tenant_id = ?',
      [name, categoryCode, specification, unit, quantity, safety_stock, brand, model, warehouse_id || null, id, req.companyId]
    );
    res.json({ code: 200, msg: '更新成功' });
  } catch (error) {
    console.error('更新用品错误:', error);
    res.json({ code: 500, msg: '服务器错误: ' + error.message });
  }
});

// 删除用品（使用新表 inv_items）
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE inv_items SET deleted_at = NOW() WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.companyId]
    );
    res.json({ code: 200, msg: '删除成功' });
  } catch (error) {
    console.error('删除用品错误:', error);
    res.json({ code: 500, msg: '服务器错误: ' + error.message });
  }
});

// 入库
router.post('/inbound', authMiddleware, async (req, res) => {
  try {
    const { item_id, quantity, supplier, remarks, brand, model } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // 插入入库记录
      const [result] = await connection.query(
        'INSERT INTO inbound_records (company_id, inbound_no, inbound_date, supplier, remarks) VALUES (?, ?, CURDATE(), ?, ?)',
        [req.companyId, 'RK' + Date.now(), supplier, remarks]
      );
      // 插入入库明细
      await connection.query(
        'INSERT INTO inbound_items (inbound_id, item_id, quantity) VALUES (?, ?, ?)',
        [result.insertId, item_id, quantity]
      );
      // 更新库存
      await connection.query(
        'UPDATE ppe_items SET quantity = quantity + ? WHERE id = ? AND company_id = ?',
        [quantity, item_id, req.companyId]
      );
      // 更新品牌型号（如果字段存在）
      if (brand || model) {
        try {
          await connection.query(
            'UPDATE ppe_items SET brand = COALESCE(?, brand), model = COALESCE(?, model) WHERE id = ? AND company_id = ?',
            [brand, model, item_id, req.companyId]
          );
        } catch (err) {
          // 忽略 brand/model 字段不存在的错误
          if (!err.message.includes('brand') && !err.message.includes('model')) {
            throw err;
          }
        }
      }
      await connection.commit();
      res.json({ code: 200, msg: '入库成功' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('入库错误:', error);
    res.json({ code: 500, msg: '入库失败: ' + error.message });
  }
});

// 出库
router.post('/outbound', authMiddleware, async (req, res) => {
  try {
    const { item_id, quantity, employee_name, employee_phone, purpose } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [items] = await connection.query(
        'SELECT quantity FROM ppe_items WHERE id = ? AND company_id = ?',
        [item_id, req.companyId]
      );
      if (items.length === 0 || items[0].quantity < quantity) {
        return res.json({ code: 400, msg: '库存不足' });
      }
      await connection.query(
        'INSERT INTO outbound_records (company_id, outbound_no, outbound_date, employee_name, employee_phone, purpose, remarks) VALUES (?, ?, CURDATE(), ?, ?, ?, ?)',
        [req.companyId, 'CK' + Date.now(), employee_name, employee_phone, purpose, '']
      );
      await connection.query(
        'UPDATE ppe_items SET quantity = quantity - ? WHERE id = ? AND company_id = ?',
        [quantity, item_id, req.companyId]
      );
      await connection.commit();
      res.json({ code: 200, msg: '出库成功' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.json({ code: 500, msg: '出库失败' });
  }
});

// 获取入库记录
router.get('/inbound-records', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, i.name as item_name 
       FROM inbound_records r 
       LEFT JOIN inbound_items ri ON r.id = ri.inbound_id
       LEFT JOIN ppe_items i ON ri.item_id = i.id 
       WHERE r.company_id = ? ORDER BY r.id DESC`,
      [req.companyId]
    );
    res.json({ code: 200, data: rows });
  } catch (error) {
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 获取出库记录
router.get('/outbound-records', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, i.name as item_name 
       FROM outbound_records o 
       LEFT JOIN outbound_items oi ON o.id = oi.outbound_id
       LEFT JOIN ppe_items i ON oi.item_id = i.id 
       WHERE o.company_id = ? ORDER BY o.id DESC`,
      [req.companyId]
    );
    res.json({ code: 200, data: rows });
  } catch (error) {
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 获取统计数据
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
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 仓库管理接口
// 获取仓库列表
router.get('/warehouse-list', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM inv_warehouses WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY id DESC',
      [req.companyId]
    );
    res.json({ code: 200, data: rows });
  } catch (error) {
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 添加仓库
router.post('/warehouse-add', authMiddleware, async (req, res) => {
  try {
    const { code, name, location, manager_name, manager_phone, status } = req.body;
    const [result] = await pool.query(
      'INSERT INTO inv_warehouses (tenant_id, code, name, location, manager_name, manager_phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.companyId, code, name, location, manager_name, manager_phone, status || 1]
    );
    res.json({ code: 200, msg: '添加成功', data: { id: result.insertId } });
  } catch (error) {
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 更新仓库
router.post('/warehouse-update', authMiddleware, async (req, res) => {
  try {
    const { id, code, name, location, manager_name, manager_phone, status } = req.body;
    await pool.query(
      'UPDATE inv_warehouses SET code = ?, name = ?, location = ?, manager_name = ?, manager_phone = ?, status = ? WHERE id = ? AND tenant_id = ?',
      [code, name, location, manager_name, manager_phone, status, id, req.companyId]
    );
    res.json({ code: 200, msg: '更新成功' });
  } catch (error) {
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 删除仓库（软删除）
router.post('/warehouse-delete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    await pool.query(
      'UPDATE inv_warehouses SET deleted_at = NOW() WHERE id = ? AND tenant_id = ?',
      [id, req.companyId]
    );
    res.json({ code: 200, msg: '删除成功' });
  } catch (error) {
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// AI 智能识别填单
router.post('/ai-parse-note', authMiddleware, async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || note.trim().length === 0) {
      return res.json({ code: 400, msg: '请输入识别内容' });
    }

    // 获取当前库存物品列表用于匹配
    const [items] = await pool.query(
      'SELECT id, name FROM inv_items WHERE tenant_id = ? AND deleted_at IS NULL',
      [req.companyId]
    );
    const itemNames = items.map(i => i.name).join('、');

    // 调用 Kimi API
    const aiConfig = require('../config/ai');
    const response = await fetch(aiConfig.MOONSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiConfig.MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: aiConfig.MODEL,
        messages: [
          {
            role: 'system',
            content: `你是一个出库单智能识别助手。请从用户的自然语言描述中提取以下信息：
- 领用人姓名
- 手机号（11位数字）
- 物品名称（从以下库存中匹配最接近的：${itemNames}）
- 数量（数字）
- 用途/备注

请返回严格的 JSON 格式：
{
  "name": "姓名或null",
  "phone": "手机号或null",
  "item": "物品名称或null",
  "quantity": 数字或null,
  "purpose": "用途或null"
}

如果某项无法识别，返回 null。

【重要】你必须只返回纯 JSON 对象，格式如下：
{"name": "姓名或null", "phone": "手机号或null", "item": "物品名称或null", "quantity": 数字或null, "purpose": "用途或null"}

不要返回任何 markdown 代码块标记，不要返回任何解释说明文字，只返回 JSON 字符串本身。`
          },
          {
            role: 'user',
            content: note
          }
        ],
        temperature: 1
      })
    });

    const aiResult = await response.json();
    
    if (aiResult.error) {
      console.error('AI API 错误:', aiResult.error);
      return res.json({ code: 500, msg: 'AI 识别失败' });
    }

    // 解析 AI 返回的内容
    let parsedData;
    try {
      const content = aiResult.choices[0].message.content;
      // 提取 JSON 部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(content);
      }
    } catch (e) {
      console.error('解析 AI 返回失败:', e);
      return res.json({ code: 500, msg: '识别结果解析失败' });
    }

    // 匹配物品ID
    let matchedItemId = null;
    if (parsedData.item) {
      const matchedItem = items.find(i => 
        i.name.includes(parsedData.item) || 
        parsedData.item.includes(i.name)
      );
      if (matchedItem) {
        matchedItemId = matchedItem.id;
      }
    }

    res.json({
      code: 200,
      data: {
        name: parsedData.name,
        phone: parsedData.phone,
        itemId: matchedItemId,
        itemName: parsedData.item,
        quantity: parsedData.quantity,
        purpose: parsedData.purpose
      }
    });

  } catch (error) {
    console.error('AI 识别错误:', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;