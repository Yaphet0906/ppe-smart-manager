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

// 获取用品列表（支持按仓库筛选，支持分组显示）
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { warehouse_id, group_by_name } = req.query;
    
    let query = 'SELECT id, name, brand, model, size, category_code as category, specification, unit, quantity as stock, quantity as quantity, safety_stock as min_stock, status FROM inv_items WHERE tenant_id = ? AND deleted_at IS NULL';
    let params = [req.companyId];
    
    // 如果指定了仓库，按仓库筛选
    if (warehouse_id && warehouse_id !== 'null' && warehouse_id !== '' && warehouse_id !== 'undefined') {
      const warehouseIdInt = parseInt(warehouse_id);
      query += ' AND warehouse_id = ?';
      params.push(warehouseIdInt);
    }
    
    query += ' ORDER BY name, size';
    
    const [rows] = await pool.query(query, params);
    
    // 如果需要分组（展开式显示）
    if (group_by_name === 'true') {
      const grouped = {};
      rows.forEach(row => {
        if (!grouped[row.name]) {
          grouped[row.name] = {
            id: 'group-' + row.name,
            name: row.name,
            category: row.category,
            isGroup: true,
            children: []
          };
        }
        grouped[row.name].children.push({
          ...row,
          type: row.category || '-',
          displayName: `${row.name} - ${row.size || '均码'}`
        });
      });
      res.json({ code: 200, data: Object.values(grouped) });
    } else {
      // 扁平列表
      const formattedRows = rows.map(row => ({
        ...row,
        type: row.category || '-',
        displayName: `${row.name}${row.size ? ' - ' + row.size : ''}`
      }));
      res.json({ code: 200, data: formattedRows });
    }
  } catch (error) {
    console.error('获取用品列表错误:', error);
    res.json({ code: 500, msg: '服务器错误: ' + error.message });
  }
});

// 添加用品（使用新表 inv_items，支持尺码）
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { name, category, specification, unit, quantity, safety_stock, brand, model, size, warehouse_id, type } = req.body;
    const categoryCode = category || type || 'other';
    
    const [result] = await pool.query(
      'INSERT INTO inv_items (tenant_id, warehouse_id, name, category_code, specification, unit, quantity, safety_stock, brand, model, size, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.companyId, warehouse_id || null, name, categoryCode, specification, unit || '件', quantity || 0, safety_stock || 10, brand, model, size, 1]
    );
    res.json({ code: 200, msg: '添加成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('添加用品错误:', error);
    res.json({ code: 500, msg: '服务器错误: ' + error.message });
  }
});

// 更新用品（使用新表 inv_items，支持尺码）
router.post('/update', authMiddleware, async (req, res) => {
  try {
    const { id, name, category, specification, unit, quantity, safety_stock, brand, model, size, warehouse_id, type } = req.body;
    const categoryCode = category || type;
    
    await pool.query(
      'UPDATE inv_items SET name = ?, category_code = ?, specification = ?, unit = ?, quantity = ?, safety_stock = ?, brand = ?, model = ?, size = ?, warehouse_id = ? WHERE id = ? AND tenant_id = ?',
      [name, categoryCode, specification, unit, quantity, safety_stock, brand, model, size, warehouse_id || null, id, req.companyId]
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

// 入库（使用新表 inv_inbound 和 inv_items）
router.post('/inbound', authMiddleware, async (req, res) => {
  try {
    const { item_id, quantity, supplier, remarks, brand, model, warehouse_id } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // 获取物品当前库存
      const [items] = await connection.query(
        'SELECT quantity, warehouse_id FROM inv_items WHERE id = ? AND tenant_id = ?',
        [item_id, req.companyId]
      );
      if (items.length === 0) {
        return res.json({ code: 400, msg: '物品不存在' });
      }
      const beforeQty = items[0].quantity;
      const afterQty = beforeQty + parseInt(quantity);
      const itemWarehouseId = warehouse_id || items[0].warehouse_id;

      // 插入入库记录（新表 inv_inbound）
      const [result] = await connection.query(
        'INSERT INTO inv_inbound (tenant_id, warehouse_id, item_id, quantity, source_type, remark, operator_id, operator_name, inbound_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())',
        [req.companyId, itemWarehouseId, item_id, quantity, 'manual', remarks || supplier, req.userId, req.userName || 'admin']
      );

      // 插入库存流水
      await connection.query(
        'INSERT INTO inv_transactions (tenant_id, warehouse_id, item_id, type, quantity, before_qty, after_qty, source_id, source_no, operator_id, operator_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.companyId, itemWarehouseId, item_id, 'inbound', quantity, beforeQty, afterQty, result.insertId, 'RK' + Date.now(), req.userId, req.userName || 'admin', remarks || supplier]
      );

      // 更新库存
      await connection.query(
        'UPDATE inv_items SET quantity = quantity + ? WHERE id = ? AND tenant_id = ?',
        [quantity, item_id, req.companyId]
      );

      // 更新品牌型号（如果提供了）
      if (brand || model) {
        await connection.query(
          'UPDATE inv_items SET brand = COALESCE(?, brand), model = COALESCE(?, model) WHERE id = ? AND tenant_id = ?',
          [brand, model, item_id, req.companyId]
        );
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

// 出库（使用新表 inv_outbound 和 inv_items）
router.post('/outbound', authMiddleware, async (req, res) => {
  try {
    const { item_id, quantity, employee_name, employee_phone, purpose, warehouse_id } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [items] = await connection.query(
        'SELECT quantity, warehouse_id FROM inv_items WHERE id = ? AND tenant_id = ?',
        [item_id, req.companyId]
      );
      if (items.length === 0 || items[0].quantity < quantity) {
        return res.json({ code: 400, msg: '库存不足' });
      }
      const beforeQty = items[0].quantity;
      const afterQty = beforeQty - parseInt(quantity);
      const itemWarehouseId = warehouse_id || items[0].warehouse_id;

      // 插入出库记录（新表 inv_outbound）
      const [result] = await connection.query(
        'INSERT INTO inv_outbound (tenant_id, warehouse_id, item_id, quantity, employee_name, employee_phone, purpose, source_type, operator_id, operator_name, outbound_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())',
        [req.companyId, itemWarehouseId, item_id, quantity, employee_name, employee_phone, purpose, 'web', req.userId, req.userName || 'admin']
      );

      // 插入库存流水
      await connection.query(
        'INSERT INTO inv_transactions (tenant_id, warehouse_id, item_id, type, quantity, before_qty, after_qty, source_id, source_no, operator_id, operator_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.companyId, itemWarehouseId, item_id, 'outbound', quantity, beforeQty, afterQty, result.insertId, 'CK' + Date.now(), req.userId, req.userName || 'admin', purpose]
      );

      // 更新库存
      await connection.query(
        'UPDATE inv_items SET quantity = quantity - ? WHERE id = ? AND tenant_id = ?',
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
    console.error('出库错误:', error);
    res.json({ code: 500, msg: '出库失败: ' + error.message });
  }
});

// 获取入库记录（使用新表 inv_inbound）
router.get('/inbound-records', authMiddleware, async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    let query = `
      SELECT i.*, it.name as item_name, w.name as warehouse_name 
      FROM inv_inbound i 
      LEFT JOIN inv_items it ON i.item_id = it.id 
      LEFT JOIN inv_warehouses w ON i.warehouse_id = w.id 
      WHERE i.tenant_id = ?`;
    let params = [req.companyId];
    
    if (warehouse_id && warehouse_id !== 'null' && warehouse_id !== '') {
      query += ' AND i.warehouse_id = ?';
      params.push(warehouse_id);
    }
    
    query += ' ORDER BY i.id DESC';
    
    const [rows] = await pool.query(query, params);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error('获取入库记录错误:', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 获取出库记录（使用新表 inv_outbound）
router.get('/outbound-records', authMiddleware, async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    let query = `
      SELECT o.*, it.name as item_name, w.name as warehouse_name 
      FROM inv_outbound o 
      LEFT JOIN inv_items it ON o.item_id = it.id 
      LEFT JOIN inv_warehouses w ON o.warehouse_id = w.id 
      WHERE o.tenant_id = ?`;
    let params = [req.companyId];
    
    if (warehouse_id && warehouse_id !== 'null' && warehouse_id !== '') {
      query += ' AND o.warehouse_id = ?';
      params.push(warehouse_id);
    }
    
    query += ' ORDER BY o.id DESC';
    
    const [rows] = await pool.query(query, params);
    res.json({ code: 200, data: rows });
  } catch (error) {
    console.error('获取出库记录错误:', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 获取统计数据（使用新表 inv_items）
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    let whereClause = 'WHERE tenant_id = ? AND deleted_at IS NULL';
    let params = [req.companyId];
    
    if (warehouse_id && warehouse_id !== 'null' && warehouse_id !== '') {
      whereClause += ' AND warehouse_id = ?';
      params.push(warehouse_id);
    }
    
    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as count FROM inv_items ${whereClause}`,
      [...params]
    );
    const [normalResult] = await pool.query(
      `SELECT COUNT(*) as count FROM inv_items ${whereClause} AND quantity > safety_stock`,
      [...params]
    );
    const [lowResult] = await pool.query(
      `SELECT COUNT(*) as count FROM inv_items ${whereClause} AND quantity <= safety_stock AND quantity > 0`,
      [...params]
    );
    const [outResult] = await pool.query(
      `SELECT COUNT(*) as count FROM inv_items ${whereClause} AND quantity = 0`,
      [...params]
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
    console.error('获取统计数据错误:', error);
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

// 添加仓库（支持自动生成 code）
router.post('/warehouse-add', authMiddleware, async (req, res) => {
  try {
    let { code, name, location, manager_name, manager_phone, status } = req.body;
    
    // 如果没有提供 code，自动生成
    if (!code || code.trim() === '') {
      // 查询当前租户下最大的 WH 编号
      const [rows] = await pool.query(
        "SELECT code FROM inv_warehouses WHERE tenant_id = ? AND code LIKE 'WH%' ORDER BY code DESC LIMIT 1",
        [req.companyId]
      );
      
      let nextNumber = 1;
      if (rows.length > 0) {
        // 提取数字部分，如 WH001 -> 1
        const match = rows[0].code.match(/WH(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      // 生成新 code，如 WH003
      code = 'WH' + nextNumber.toString().padStart(3, '0');
    }
    
    const [result] = await pool.query(
      'INSERT INTO inv_warehouses (tenant_id, code, name, location, manager_name, manager_phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.companyId, code, name, location, manager_name, manager_phone, status || 1]
    );
    res.json({ code: 200, msg: '添加成功', data: { id: result.insertId, code } });
  } catch (error) {
    console.error('添加仓库错误:', error);
    res.json({ code: 500, msg: '服务器错误: ' + error.message });
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

// 获取类别对应的尺码选项（任务4：尺码管理）
router.get('/size-options', authMiddleware, async (req, res) => {
  try {
    const { category } = req.query;
    
    if (!category) {
      return res.json({ code: 400, msg: '请提供类别' });
    }
    
    const [rows] = await pool.query(
      'SELECT size_value FROM sys_size_config WHERE category_code = ? ORDER BY sort_order',
      [category]
    );
    
    res.json({ 
      code: 200, 
      data: rows.map(r => r.size_value) 
    });
  } catch (error) {
    console.error('获取尺码选项错误:', error);
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