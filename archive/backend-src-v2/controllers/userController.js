/**
 * 用户控制器
 * 处理用户相关的API请求
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 用户登录
 * POST /api/users/login
 */
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    // 参数验证
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '电话号码和密码不能为空'
      });
    }
    
    // 查找用户（包含密码哈希）
    const user = await User.findByPhoneWithPassword(phone);

    if (!user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: '用户不存在或密码错误'
      });
    }

    // 验证密码（使用bcrypt比较）
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        data: null,
        message: '用户不存在或密码错误'
      });
    }

    // 生成JWT Token
    const token = jwt.sign(
      { userId: user.id, role: user.role, phone: user.phone },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 返回用户信息（不包含密码）
    const { password_hash: _, ...userInfo } = user;

    res.json({
      success: true,
      data: {
        user: userInfo,
        token: token
      },
      message: '登录成功'
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '登录失败: ' + error.message
    });
  }
};

/**
 * 获取用户列表
 * GET /api/users
 */
const getUsers = async (req, res) => {
  try {
    const { role, department } = req.query;
    const options = {};
    
    if (role) options.role = role;
    if (department) options.department = department;
    
    const users = await User.findAll(options);
    
    res.json({
      success: true,
      data: users,
      message: '获取用户列表成功'
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取用户列表失败: ' + error.message
    });
  }
};

/**
 * 创建用户
 * POST /api/users
 */
const createUser = async (req, res) => {
  try {
    const { name, phone, password, role, department, employee_no } = req.body;
    
    // 参数验证
    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '姓名、电话和密码不能为空'
      });
    }
    
    // 检查电话号码是否已存在
    const exists = await User.isPhoneExists(phone);
    if (exists) {
      return res.status(409).json({
        success: false,
        data: null,
        message: '该电话号码已被注册'
      });
    }

    // 对密码进行哈希处理
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await User.create({
      name,
      phone,
      password_hash: passwordHash,
      role: role || 'employee',
      department,
      employee_no
    });
    
    res.status(201).json({
      success: true,
      data: user,
      message: '用户创建成功'
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '创建用户失败: ' + error.message
    });
  }
};

/**
 * 更新用户
 * PUT /api/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, password, role, department, employee_no } = req.body;
    
    // 检查用户是否存在
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '用户不存在'
      });
    }
    
    // 如果修改电话号码，检查是否已被其他用户使用
    if (phone && phone !== existingUser.phone) {
      const exists = await User.isPhoneExists(phone, id);
      if (exists) {
        return res.status(409).json({
          success: false,
          data: null,
          message: '该电话号码已被其他用户使用'
        });
      }
    }
    
    // 构建更新数据
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (password !== undefined) updateData.password = password;
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (employee_no !== undefined) updateData.employee_no = employee_no;
    
    // 执行更新
    const success = await User.update(id, updateData);
    
    if (success) {
      // 获取更新后的用户信息
      const updatedUser = await User.findById(id);
      res.json({
        success: true,
        data: updatedUser,
        message: '用户更新成功'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: '用户更新失败，没有数据被修改'
      });
    }
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '更新用户失败: ' + error.message
    });
  }
};

/**
 * 删除用户
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查用户是否存在
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '用户不存在'
      });
    }
    
    // 执行删除
    const success = await User.delete(id);
    
    if (success) {
      res.json({
        success: true,
        data: null,
        message: '用户删除成功'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: '用户删除失败'
      });
    }
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '删除用户失败: ' + error.message
    });
  }
};

/**
 * 获取单个用户信息
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: user,
      message: '获取用户信息成功'
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取用户信息失败: ' + error.message
    });
  }
};

/**
 * 获取用户统计信息
 * GET /api/users/statistics
 */
const getUserStatistics = async (req, res) => {
  try {
    const statistics = await User.getStatistics();
    
    res.json({
      success: true,
      data: statistics,
      message: '获取用户统计信息成功'
    });
  } catch (error) {
    console.error('获取用户统计信息失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '获取用户统计信息失败: ' + error.message
    });
  }
};

module.exports = {
  login,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStatistics
};
