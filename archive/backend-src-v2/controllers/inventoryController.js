/**
 * 库存控制器
 * 处理库存相关的API请求
 */

const PPEItem = require('../models/PPEItem');

/**
 * 获取库存列表
 * GET /api/inventory
 */
const getInventory = async (req, res) => {
  try {
    const { category, keyword } = req.query;
    const options = {};
    
    if (category) options.category = category;
    if (keyword) options.keyword = keyword;
    
    const items = await PPEItem.findAll(options);
    
    res.json({
      success: true,
      data: items,
      message: '获取库存列表成功'
    });
  } catch (error) {
    console.error('获取库存列表失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取库存列表失败: ' + error.message
    });
  }
};

/**
 * 获取单个物品详情
 * GET /api/inventory/:id
 */
const getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await PPEItem.findById(id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '物品不存在'
      });
    }
    
    res.json({
      success: true,
      data: item,
      message: '获取物品详情成功'
    });
  } catch (error) {
    console.error('获取物品详情失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取物品详情失败: ' + error.message
    });
  }
};

/**
 * 创建物品
 * POST /api/inventory
 */
const createItem = async (req, res) => {
  try {
    const { 
      name, 
      category, 
      specification, 
      unit, 
      quantity, 
      min_stock, 
      max_stock, 
      expiry_date, 
      supplier, 
      remarks 
    } = req.body;
    
    // 参数验证
    if (!name) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '物品名称不能为空'
      });
    }
    
    // 创建物品
    const item = await PPEItem.create({
      name,
      category,
      specification,
      unit,
      quantity,
      min_stock,
      max_stock,
      expiry_date,
      supplier,
      remarks
    });
    
    res.status(201).json({
      success: true,
      data: item,
      message: '物品创建成功'
    });
  } catch (error) {
    console.error('创建物品失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '创建物品失败: ' + error.message
    });
  }
};

/**
 * 更新物品
 * PUT /api/inventory/:id
 */
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      category, 
      specification, 
      unit, 
      min_stock, 
      max_stock, 
      expiry_date, 
      supplier, 
      remarks 
    } = req.body;
    
    // 检查物品是否存在
    const existingItem = await PPEItem.findById(id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '物品不存在'
      });
    }
    
    // 构建更新数据
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (specification !== undefined) updateData.specification = specification;
    if (unit !== undefined) updateData.unit = unit;
    if (min_stock !== undefined) updateData.min_stock = min_stock;
    if (max_stock !== undefined) updateData.max_stock = max_stock;
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (remarks !== undefined) updateData.remarks = remarks;
    
    // 执行更新
    const success = await PPEItem.update(id, updateData);
    
    if (success) {
      // 获取更新后的物品信息
      const updatedItem = await PPEItem.findById(id);
      res.json({
        success: true,
        data: updatedItem,
        message: '物品更新成功'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: '物品更新失败，没有数据被修改'
      });
    }
  } catch (error) {
    console.error('更新物品失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '更新物品失败: ' + error.message
    });
  }
};

/**
 * 删除物品
 * DELETE /api/inventory/:id
 */
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查物品是否存在
    const existingItem = await PPEItem.findById(id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '物品不存在'
      });
    }
    
    // 执行删除
    const success = await PPEItem.delete(id);
    
    if (success) {
      res.json({
        success: true,
        data: null,
        message: '物品删除成功'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: '物品删除失败'
      });
    }
  } catch (error) {
    console.error('删除物品失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '删除物品失败: ' + error.message
    });
  }
};

/**
 * 获取低库存预警
 * GET /api/inventory/alerts/low-stock
 */
const getLowStock = async (req, res) => {
  try {
    const items = await PPEItem.findLowStock();
    
    res.json({
      success: true,
      data: {
        count: items.length,
        items: items
      },
      message: '获取低库存预警成功'
    });
  } catch (error) {
    console.error('获取低库存预警失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取低库存预警失败: ' + error.message
    });
  }
};

/**
 * 获取有效期预警
 * GET /api/inventory/alerts/expiring
 */
const getExpiring = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const items = await PPEItem.findExpiring(parseInt(days));
    
    res.json({
      success: true,
      data: {
        days: parseInt(days),
        count: items.length,
        items: items
      },
      message: '获取有效期预警成功'
    });
  } catch (error) {
    console.error('获取有效期预警失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取有效期预警失败: ' + error.message
    });
  }
};

/**
 * 获取品牌列表
 * GET /api/inventory/brands
 */
const getBrands = async (req, res) => {
  try {
    const brands = await PPEItem.getBrands();

    res.json({
      success: true,
      data: brands,
      message: '获取品牌列表成功'
    });
  } catch (error) {
    console.error('获取品牌列表失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取品牌列表失败: ' + error.message
    });
  }
};

/**
 * 获取库存统计信息
 * GET /api/inventory/statistics
 */
const getStatistics = async (req, res) => {
  try {
    const statistics = await PPEItem.getStatistics();
    
    res.json({
      success: true,
      data: statistics,
      message: '获取库存统计信息成功'
    });
  } catch (error) {
    console.error('获取库存统计信息失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取库存统计信息失败: ' + error.message
    });
  }
};

/**
 * 获取LA证书过期预警
 * GET /api/inventory/alerts/la-cert-expiring
 */
const getLACertExpiring = async (req, res) => {
  try {
    const { days = 90 } = req.query;

    const items = await PPEItem.findLACertExpiring(parseInt(days));

    res.json({
      success: true,
      data: {
        days: parseInt(days),
        count: items.length,
        items: items
      },
      message: '获取LA证书过期预警成功'
    });
  } catch (error) {
    console.error('获取LA证书过期预警失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取LA证书过期预警失败: ' + error.message
    });
  }
};

module.exports = {
  getInventory,
  getInventoryById,
  createItem,
  updateItem,
  deleteItem,
  getLowStock,
  getExpiring,
  getBrands,
  getStatistics,
  getLACertExpiring
};
