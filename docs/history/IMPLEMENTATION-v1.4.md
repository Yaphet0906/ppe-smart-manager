# v1.4 实施方案 - 详细代码

## 任务 1: 管理员信息展示

### 后端 - user.js 添加接口
```javascript
// 获取当前登录用户信息
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.phone, u.email, u.role, 
              t.id as company_id, t.name as company_name, t.code as company_code
       FROM core_users u
       LEFT JOIN core_tenants t ON u.tenant_id = t.id
       WHERE u.id = ?`,
      [req.userId]
    );
    
    if (users.length === 0) {
      return res.json({ code: 404, msg: '用户不存在' });
    }
    
    res.json({ code: 200, data: users[0] });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.json({ code: 500, msg: '服务器错误' });
  }
});
```

### 前端 - Layout.vue 修改
```vue
<template>
  <div class="layout">
    <!-- 头部 -->
    <el-header>
      <div class="header-right">
        <!-- 管理员信息 -->
        <el-dropdown @command="handleCommand">
          <span class="user-info">
            <el-icon><User /></el-icon>
            {{ userName }}
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人信息</el-dropdown-item>
              <el-dropdown-item command="password">修改密码</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <!-- 个人信息抽屉 -->
    <el-drawer v-model="profileVisible" title="个人信息" size="400px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="用户名">{{ userProfile.name }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ userProfile.role === 'admin' ? '管理员' : '操作员' }}</el-descriptions-item>
        <el-descriptions-item label="所属公司">{{ userProfile.company_name }}</el-descriptions-item>
        <el-descriptions-item label="公司代码">{{ userProfile.company_code }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ userProfile.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ userProfile.email || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { User, ArrowDown } from '@element-plus/icons-vue';
import request from '../utils/request';

export default {
  setup() {
    const router = useRouter();
    const userName = ref(localStorage.getItem('userName') || '管理员');
    const profileVisible = ref(false);
    const userProfile = ref({});

    const handleCommand = async (command) => {
      if (command === 'profile') {
        // 获取用户信息
        const res = await request.get('/user/profile');
        if (res.code === 200) {
          userProfile.value = res.data;
          profileVisible.value = true;
        }
      } else if (command === 'logout') {
        localStorage.clear();
        router.push('/login');
      }
    };

    return {
      userName,
      profileVisible,
      userProfile,
      handleCommand
    };
  }
};
</script>
```

---

## 任务 2 & 3 & 4: 尺码管理（合并实现）

### 数据库变更 - alter_v1.4.sql
```sql
USE ppe_smart_manager;

-- 添加尺码字段
ALTER TABLE inv_items ADD COLUMN size VARCHAR(20) COMMENT '尺码/规格' AFTER model;

-- 添加类别尺码配置表（用于前端下拉选择）
CREATE TABLE IF NOT EXISTS sys_size_config (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(50) NOT NULL COMMENT '类别编码',
    size_value VARCHAR(20) NOT NULL COMMENT '尺码值',
    sort_order INT DEFAULT 0 COMMENT '排序',
    UNIQUE KEY uk_category_size (category_code, size_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 初始化尺码配置
INSERT INTO sys_size_config (category_code, size_value, sort_order) VALUES
-- 安全鞋尺码
('safety_shoes', '36码', 1),
('safety_shoes', '37码', 2),
('safety_shoes', '38码', 3),
('safety_shoes', '39码', 4),
('safety_shoes', '40码', 5),
('safety_shoes', '41码', 6),
('safety_shoes', '42码', 7),
('safety_shoes', '43码', 8),
('safety_shoes', '44码', 9),
('safety_shoes', '45码', 10),
('safety_shoes', '46码', 11),

-- 工作服尺码
('work_clothes', 'S', 1),
('work_clothes', 'M', 2),
('work_clothes', 'L', 3),
('work_clothes', 'XL', 4),
('work_clothes', 'XXL', 5),
('work_clothes', 'XXXL', 6),

-- 手套尺码
('gloves', 'S', 1),
('gloves', 'M', 2),
('gloves', 'L', 3),
('gloves', 'XL', 4),

-- 安全帽尺码
('helmet', '52-56cm', 1),
('helmet', '57-62cm', 2),

-- 口罩
('mask', '均码', 1);

-- 数据迁移：把现有安全鞋的 model 移到 size
UPDATE inv_items SET size = REPLACE(model, '码', '') + '码' 
WHERE category_code = 'safety_shoes' AND model IS NOT NULL;

SELECT 'v1.4 数据库升级完成' as message;
```

### 后端 - ppe.js 修改

#### 1. 添加获取尺码配置接口
```javascript
// 获取类别对应的尺码选项
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
```

#### 2. 修改列表接口 - 支持按名称分组
```javascript
// 获取用品列表（支持按仓库筛选，返回树形结构）
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { warehouse_id, group_by_name } = req.query;
    
    let query = `
      SELECT id, name, brand, model, size, category_code as category, 
             specification, unit, quantity as stock, quantity as quantity, 
             safety_stock as min_stock, status 
      FROM inv_items 
      WHERE tenant_id = ? AND deleted_at IS NULL`;
    let params = [req.companyId];
    
    // 仓库筛选
    if (warehouse_id && warehouse_id !== 'null' && warehouse_id !== '' && warehouse_id !== 'undefined') {
      query += ' AND warehouse_id = ?';
      params.push(parseInt(warehouse_id));
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
```

#### 3. 修改添加/更新接口支持 size 字段
```javascript
// 添加用品
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

// 更新用品
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
```

### 前端 - PPEList.vue 修改

```vue
<template>
  <div class="ppe-list">
    <div class="page-header">
      <h3>库存管理</h3>
      <el-button type="primary" @click="handleAdd">新增用品</el-button>
    </div>

    <!-- 仓库选择器 -->
    <el-card style="margin-bottom: 20px;">
      <div class="warehouse-selector">
        <span class="label">当前仓库：</span>
        <el-select v-model="currentWarehouseId" placeholder="请选择仓库" style="width: 200px; margin-right: 10px;">
          <el-option
            v-for="warehouse in warehouseList"
            :key="warehouse.id"
            :label="warehouse.name"
            :value="warehouse.id"
          />
        </el-select>
        <el-button type="success" size="small" @click="showAddWarehouse = true">+ 添加仓库</el-button>
      </div>
    </el-card>

    <el-card>
      <!-- 树形表格 -->
      <el-table 
        :data="tableData" 
        v-loading="loading" 
        border
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
        <el-table-column type="expand" width="50">
          <template #default="{ row }">
            <!-- 展开显示子项（尺码） -->
            <el-table :data="row.children" v-if="row.children" :show-header="false" border>
              <el-table-column width="80" />
              <el-table-column prop="displayName" label="规格" />
              <el-table-column prop="brand" label="品牌" width="120" />
              <el-table-column prop="model" label="型号" width="120" />
              <el-table-column prop="stock" label="库存数量" width="100">
                <template #default="{ row }">
                  <el-tag :type="getStockType(row)">{{ row.stock }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="180">
                <template #default="{ row }">
                  <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
                  <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </el-table-column>
        
        <el-table-column prop="name" label="用品名称">
          <template #default="{ row }">
            <span v-if="row.isGroup" style="font-weight: bold;">{{ row.name }}</span>
            <span v-else>{{ row.displayName }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="类别" width="120" />
        <el-table-column prop="stock" label="总库存" width="100" v-if="isGroupView" />
        <el-table-column label="操作" width="180" v-if="!isGroupView">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑用品对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="用品名称" prop="name">
          <el-input v-model="form.name" placeholder="如：安全鞋、工作服" />
        </el-form-item>
        
        <el-form-item label="所属仓库" prop="warehouse_id">
          <el-select v-model="form.warehouse_id" style="width: 100%" placeholder="请选择仓库">
            <el-option
              v-for="warehouse in warehouseList"
              :key="warehouse.id"
              :label="warehouse.name"
              :value="warehouse.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="类别" prop="category">
          <el-select v-model="form.category" style="width: 100%" @change="handleCategoryChange">
            <el-option label="安全鞋" value="safety_shoes" />
            <el-option label="工作服" value="work_clothes" />
            <el-option label="手套" value="gloves" />
            <el-option label="安全帽" value="helmet" />
            <el-option label="口罩" value="mask" />
          </el-select>
        </el-form-item>
        
        <!-- 尺码选择 - 根据类别动态显示 -->
        <el-form-item label="尺码" prop="size" v-if="sizeOptions.length > 0">
          <el-select v-model="form.size" style="width: 100%" placeholder="请选择尺码">
            <el-option
              v-for="size in sizeOptions"
              :key="size"
              :label="size"
              :value="size"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="品牌" prop="brand">
          <el-input v-model="form.brand" placeholder="可选" />
        </el-form-item>
        
        <el-form-item label="型号" prop="model">
          <el-input v-model="form.model" placeholder="产品型号（可选）" />
        </el-form-item>
        
        <el-form-item label="库存数量" prop="stock">
          <el-input-number v-model="form.stock" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加仓库对话框 -->
    <el-dialog v-model="showAddWarehouse" title="添加仓库" width="400px">
      <el-form :model="warehouseForm" ref="warehouseRef" label-width="80px">
        <el-form-item label="仓库名称" prop="name" required>
          <el-input v-model="warehouseForm.name" placeholder="如：欧易的儿子的仓库3" />
        </el-form-item>
        <el-form-item label="仓库编号" prop="code">
          <el-input v-model="warehouseForm.code" placeholder="留空自动生成（如：WH003）" />
        </el-form-item>
        <el-form-item label="位置" prop="location">
          <el-input v-model="warehouseForm.location" placeholder="如：一楼东侧" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddWarehouse = false">取消</el-button>
        <el-button type="primary" @click="handleAddWarehouse">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { reactive, ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../utils/request';

export default {
  name: 'PPEList',
  setup() {
    const loading = ref(false);
    const tableData = ref([]);
    const warehouseList = ref([]);
    const currentWarehouseId = ref(null);
    const dialogVisible = ref(false);
    const showAddWarehouse = ref(false);
    const dialogTitle = ref('新增用品');
    const formRef = ref(null);
    const warehouseRef = ref(null);
    const isEdit = ref(false);
    const isGroupView = ref(true); // 是否分组显示
    const sizeOptions = ref([]); // 尺码选项

    const form = reactive({
      id: null,
      name: '',
      category: '',
      size: '',
      stock: 0,
      warehouse_id: null,
      brand: '',
      model: ''
    });

    const warehouseForm = reactive({
      code: '',
      name: '',
      location: ''
    });

    const rules = {
      name: [{ required: true, message: '请输入用品名称', trigger: 'blur' }],
      category: [{ required: true, message: '请选择类别', trigger: 'change' }],
      warehouse_id: [{ required: true, message: '请选择仓库', trigger: 'change' }]
    };

    // 类别改变时获取尺码选项
    const handleCategoryChange = async (category) => {
      form.size = '';
      if (!category) {
        sizeOptions.value = [];
        return;
      }
      try {
        const res = await request.get('/ppe/size-options', {
          params: { category }
        });
        if (res.code === 200) {
          sizeOptions.value = res.data;
        }
      } catch (error) {
        console.error('获取尺码选项失败:', error);
      }
    };

    const fetchWarehouses = async () => {
      try {
        const res = await request.get('/ppe/warehouse-list');
        if (res.code === 200) {
          warehouseList.value = res.data;
          if (res.data.length > 0 && !currentWarehouseId.value) {
            currentWarehouseId.value = res.data[0].id;
          }
        }
      } catch (error) {
        console.error('获取仓库列表失败:', error);
      }
    };

    const fetchData = async () => {
      if (!currentWarehouseId.value) return;
      loading.value = true;
      try {
        const warehouseId = parseInt(currentWarehouseId.value);
        const res = await request.get('/ppe/list', {
          params: { 
            warehouse_id: warehouseId,
            group_by_name: isGroupView.value
          }
        });
        if (res.code === 200) {
          tableData.value = res.data;
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        loading.value = false;
      }
    };

    watch(currentWarehouseId, () => {
      fetchData();
    });

    const getStockType = (row) => {
      if (row.stock === 0) return 'danger';
      if (row.stock < 10) return 'warning';
      return 'success';
    };

    const handleAdd = () => {
      isEdit.value = false;
      dialogTitle.value = '新增用品';
      Object.assign(form, { 
        id: null, 
        name: '', 
        category: '', 
        size: '',
        stock: 0, 
        warehouse_id: currentWarehouseId.value,
        brand: '',
        model: ''
      });
      sizeOptions.value = [];
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      dialogTitle.value = '编辑用品';
      Object.assign(form, row);
      // 如果有类别，加载尺码选项
      if (row.category) {
        handleCategoryChange(row.category);
      }
      dialogVisible.value = true;
    };

    const handleDelete = async (row) => {
      try {
        await ElMessageBox.confirm('确定删除该用品吗？', '提示', { type: 'warning' });
        const res = await request.delete(`/ppe/delete/${row.id}`);
        if (res.code === 200) {
          ElMessage.success('删除成功');
          fetchData();
        }
      } catch (error) {
        console.error('删除失败:', error);
      }
    };

    const handleSubmit = async () => {
      try {
        await formRef.value.validate();
        const url = isEdit.value ? '/ppe/update' : '/ppe/add';
        const res = await request.post(url, form);
        if (res.code === 200) {
          ElMessage.success(isEdit.value ? '更新成功' : '添加成功');
          dialogVisible.value = false;
          fetchData();
        }
      } catch (error) {
        console.error('提交失败:', error);
      }
    };

    const handleAddWarehouse = async () => {
      if (!warehouseForm.name) {
        ElMessage.warning('请填写仓库名称');
        return;
      }
      try {
        const res = await request.post('/ppe/warehouse-add', warehouseForm);
        if (res.code === 200) {
          ElMessage.success('仓库添加成功');
          showAddWarehouse.value = false;
          Object.assign(warehouseForm, { code: '', name: '', location: '' });
          fetchWarehouses();
        }
      } catch (error) {
        console.error('添加仓库失败:', error);
      }
    };

    onMounted(() => {
      fetchWarehouses();
      fetchData();
    });

    return {
      loading,
      tableData,
      warehouseList,
      currentWarehouseId,
      dialogVisible,
      showAddWarehouse,
      dialogTitle,
      formRef,
      warehouseRef,
      form,
      warehouseForm,
      rules,
      isGroupView,
      sizeOptions,
      handleCategoryChange,
      getStockType,
      handleAdd,
      handleEdit,
      handleDelete,
      handleSubmit,
      handleAddWarehouse
    };
  }
};
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h3 {
  margin: 0;
}

.warehouse-selector {
  display: flex;
  align-items: center;
}

.warehouse-selector .label {
  margin-right: 10px;
  font-weight: bold;
}
</style>
```

---

## 执行顺序

### 1. 先执行数据库升级
```bash
cd "/Users/rebecca/Desktop/AI automation project/PPESmartManager/ppe-smart-manager/backend"
mysql -u root -pAsdf1234 < alter_v1.4.sql
```

### 2. 修改后端代码
- `backend/routes/user.js` - 添加 `/profile` 接口
- `backend/routes/ppe.js` - 添加尺码相关接口

### 3. 修改前端代码
- `frontend/src/views/Layout.vue` - 管理员信息抽屉
- `frontend/src/views/PPEList.vue` - 尺码管理、展开式表格

### 4. 重启服务测试

---

## 关键设计说明

### 为什么每个尺码是独立库存项？
```
安全鞋-42码（id=1, stock=10）
安全鞋-43码（id=2, stock=15）
安全鞋-44码（id=3, stock=8）
```
而不是：
```
安全鞋（id=1）
  ├─ 42码: 10
  ├─ 43码: 15
  └─ 44码: 8
```

**原因**：
1. 入库/出库操作简单，直接选具体尺码
2. 库存统计直观
3. 与现有系统兼容性好
4. 查询性能高

### 展开式显示如何实现？
使用 Element Plus 的 `el-table` 的 `tree-props` 功能，把同一 name 的物品作为 children 挂在父节点下。

有任何问题告诉我！
