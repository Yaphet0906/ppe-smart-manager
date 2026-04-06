const Joi = require('joi');

// 登录验证
const loginSchema = Joi.object({
  companyName: Joi.string().required().min(1).max(100),
  phone: Joi.string().required().pattern(/^1[3-9]\d{9}$/),
  password: Joi.string().required().min(6).max(50)
});

// 注册公司验证
const registerCompanySchema = Joi.object({
  companyName: Joi.string().required().min(1).max(100),
  contactName: Joi.string().required().min(1).max(50),
  contactPhone: Joi.string().required().pattern(/^1[3-9]\d{9}$/),
  adminPassword: Joi.string().required().min(6).max(50)
});

// 添加用品验证
const addItemSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  category: Joi.string().max(50),
  specification: Joi.string().max(200),
  unit: Joi.string().max(20),
  quantity: Joi.number().integer().min(0).default(0),
  safety_stock: Joi.number().integer().min(0).default(10),
  brand: Joi.string().max(50),
  model: Joi.string().max(50),
  size: Joi.string().max(20),
  warehouse_id: Joi.number().integer().allow(null)
});

// 入库验证
const inboundSchema = Joi.object({
  item_id: Joi.number().integer().required(),
  quantity: Joi.number().integer().required().min(1),
  supplier: Joi.string().max(200),
  remarks: Joi.string().max(500),
  brand: Joi.string().max(50),
  model: Joi.string().max(50),
  warehouse_id: Joi.number().integer()
});

// 出库验证
const outboundSchema = Joi.object({
  item_id: Joi.number().integer().required(),
  quantity: Joi.number().integer().required().min(1),
  employee_name: Joi.string().required().min(1).max(50),
  employee_phone: Joi.string().pattern(/^1[3-9]\d{9}$/),
  purpose: Joi.string().max(500),
  warehouse_id: Joi.number().integer()
});

// 修改密码验证
const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().allow('').max(50),
  newPassword: Joi.string().required().min(6).max(50)
});

// 通用验证函数
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        msg: `输入验证失败: ${error.details[0].message}`
      });
    }
    next();
  };
};

module.exports = {
  validate,
  loginSchema,
  registerCompanySchema,
  addItemSchema,
  inboundSchema,
  outboundSchema,
  changePasswordSchema
};
