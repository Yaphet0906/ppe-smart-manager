const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');
const authMiddleware = require('../middleware/auth');
const { validate, addItemSchema, inboundSchema, outboundSchema } = require('../middleware/validate');
const { ItemQueryBuilder } = require('../utils/queryBuilder');
const { getItemById, getItemStock, getItemList, getStats, updateItemStock } = require('../utils/dbHelpers');

// 获取用品列表（支持按仓库筛选，支持分组显示，支持分页）
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { warehouse_id, group_by_name, page = 1, limit = 100 } = req.query;
    
    // 使用查询构建器构建安全查询（方法链顺序：配置 -> build）
    const { sql: query, params, countSql, countParams } = new ItemQueryBuilder(req.companyId)
      .withWarehouse(warehouse_id)
      .excludeDeleted()
      .withPagination(page, limit)
      .select('id, name, warehouse_id, brand, model, size, category_code as category, specification, unit, quantity as stock, safety_stock as min_stock, status')
      .orderByField('name', 'ASC')
      .build();
    
    // 获取总数
    const [countResult] = await pool.query(countSql, countParams);
    const total = countResult[0].total;
    
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
      res.json({ 
        code: 200, 
        data: Object.values(grouped),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } else {
      // 扁平列表
      const formattedRows = rows.map(row => ({
        ...row,
        type: row.category || '-',
        displayName: `${row.name}${row.size ? ' - ' + row.size : ''}`
      }));
      res.json({ 
        code: 200, 
        data: formattedRows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    }
  } catch (error) {
    logger.error('获取用品列表错误', { error: error.message, stack: error.stack });
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// 添加用品（使用新表 inv_items，支持尺码，同时记录入库历史）
router.post('/add', authMiddleware, validate(addItemSchema), async (req, res) => {
  const { name, category, specification, unit, quantity, safety_stock, brand, model, size, warehouse_id, type } = req.body;
  const categoryCode = category || type || 'other';
  const itemQuantity = quantity || 0;
  
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    // 1. 创建物品
    const [result] = await connection.query(
      'INSERT INTO inv_items (tenant_id, warehouse_id, name, category_code, specification, unit, quantity, safety_stock, brand, model, size, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.companyId, warehouse_id || null, name, categoryCode, specification, unit || '件', itemQuantity, safety_stock || 10, brand, model, size, 1]
    );
    const itemId = result.insertId;
    
    // 2. 如果有库存，记录入库历史
    if (itemQuantity > 0) {
      // 插入入库记录
      const [inboundResult] = await connection.query(
        'INSERT INTO inv_inbound (tenant_id, warehouse_id, item_id, quantity, source_type, remark, operator_id, operator_name, inbound_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())',
        [req.companyId, warehouse_id || null, itemId, itemQuantity, 'manual', '新增用品入库', req.userId, req.userName || 'admin']
      );
      
      // 插入库存流水
      await connection.query(
        'INSERT INTO inv_transactions (tenant_id, warehouse_id, item_id, type, quantity, before_qty, after_qty, source_id, source_no, operator_id, operator_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.companyId, warehouse_id || null, itemId, 'inbound', itemQuantity, 0, itemQuantity, inboundResult.insertId, 'RK' + Date.now(), req.userId, req.userName || 'admin', '新增用品: ' + name]
      );
    }
    
    await connection.commit();
    res.json({ code: 200, msg: '添加成功', data: { id: itemId } });
  } catch (error) {
    await connection.rollback();
    logger.error('添加用品错误', { error: error.message, stack: error.stack });
    res.json({ code: 500, msg: '服务器错误: ' + error.message });
  } finally {
    connection.release();
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
    logger.error('更新用品错误', { error: error.message, stack: error.stack });
    res.json({ code: 500, msg: '服务器错误: ' + error.message });
  }
});

// 删除用品（使用新表 inv_items）
// 删除用品（软删除）
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const { reason } = req.body;
    const itemId = req.params.id;
    const tenantId = req.companyId;
    const deletedBy = req.userId;
    
    // 1. 获取被删除物品的完整信息（用于记录）
    const itemData = await getItemById(itemId, tenantId, { includeDeleted: false });
    
    if (!itemData) {
      await connection.rollback();
      connection.release();
      return res.json({ code: 404, msg: '用品不存在' });
    }
    
    // 2. 执行软删除
    await connection.query(
      'UPDATE inv_items SET deleted_at = NOW(), deleted_by = ? WHERE id = ? AND tenant_id = ?',
      [deletedBy, itemId, tenantId]
    );
    
    // 3. 记录删除日志
    await connection.query(
      `INSERT INTO delete_logs (table_name, record_id, record_data, deleted_by, deleted_at, delete_reason, tenant_id) 
       VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
      ['inv_items', itemId, JSON.stringify(itemData), deletedBy, reason || '未填写原因', tenantId]
    );
    
    await connection.commit();
    connection.release();
    
    res.json({ code: 200, msg: '删除成功' });
  } catch (error) {
    await connection.rollback();
    connection.release();
    logger.error('删除用品错误', { error: error.message, stack: error.stack });
    res.json({ code: 500, msg: '服务器错误: ' + error.message });
  }
});

// 入库（使用新表 inv_inbound 和 inv_items）
router.post('/inbound', authMiddleware, validate(inboundSchema), async (req, res) => {
  try {
    const { item_id, quantity, supplier, remarks, brand, model, warehouse_id } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // 获取物品当前库存
      const itemStock = await getItemStock(item_id, req.companyId);
      if (!itemStock) {
        return res.json({ code: 400, msg: '物品不存在' });
      }
      const beforeQty = itemStock.quantity;
      const afterQty = beforeQty + parseInt(quantity);
      const itemWarehouseId = warehouse_id || itemStock.warehouse_id;

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
    logger.error('入库错误', { error: error.message, stack: error.stack });
    res.json({ code: 500, msg: '入库失败: ' + error.message });
  }
});

// 出库（使用新表 inv_outbound 和 inv_items）
router.post('/outbound', authMiddleware, validate(outboundSchema), async (req, res) => {
  try {
    const { item_id, quantity, employee_name, employee_phone, purpose, warehouse_id } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const itemStock = await getItemStock(item_id, req.companyId);
      if (!itemStock || itemStock.quantity < quantity) {
        return res.json({ code: 400, msg: '库存不足' });
      }
      const beforeQty = itemStock.quantity;
      const afterQty = beforeQty - parseInt(quantity);
      const itemWarehouseId = warehouse_id || itemStock.warehouse_id;

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
    logger.error('出库错误', { error: error.message, stack: error.stack });
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
    logger.error('获取入库记录错误', { error: error.message, stack: error.stack });
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
    logger.error('获取出库记录错误', { error: error.message, stack: error.stack });
    res.json({ code: 500, msg: '服务器错误' });
  }
});

// 获取统计数据（使用辅助函数）
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    const stats = await getStats(req.companyId, { warehouseId: warehouse_id });
    res.json({ code: 200, data: stats });
  } catch (error) {
    logger.error('获取统计数据错误', { error: error.message, stack: error.stack });
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
    logger.error('添加仓库错误', { error: error.message, stack: error.stack });
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
    logger.error('获取尺码选项错误', { error: error.message, stack: error.stack });
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
    const items = await getItemList(req.companyId);
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
      logger.error('AI API 错误', { error: aiResult.error });
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
      logger.error('解析 AI 返回失败', { error: e.message, stack: e.stack });
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
    logger.error('AI 识别错误', { error: error.message, stack: error.stack });
    res.json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;