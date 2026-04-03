<template>
  <div class="ppe-list">
    <div class="page-header">
      <h3>库存管理</h3>
      <el-button type="primary" @click="handleAdd">新增入库</el-button>
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
      <!-- 展开式表格 -->
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
            <el-table :data="row.children" v-if="row.children && row.children.length > 0" :show-header="false" border size="small">
              <el-table-column width="80" />
              <el-table-column prop="displayName" label="规格" min-width="200" />
              <el-table-column prop="brand" label="品牌" width="120" />
              <el-table-column prop="model" label="型号" width="120" />
              <el-table-column prop="stock" label="库存数量" width="100">
                <template #default="{ row: childRow }">
                  <el-tag :type="getStockType(childRow)">{{ childRow.stock }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="180">
                <template #default="{ row: childRow }">
                  <el-button type="primary" size="small" @click="handleEdit(childRow)">编辑</el-button>
                  <el-button type="danger" size="small" @click="handleDelete(childRow)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </el-table-column>
        
        <el-table-column prop="name" label="用品名称" min-width="200">
          <template #default="{ row }">
            <span v-if="row.isGroup" style="font-weight: bold;">{{ row.name }}</span>
            <span v-else>{{ row.displayName }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="category" label="类别" width="120">
          <template #default="{ row }">
            {{ getCategoryName(row.category) }}
          </template>
        </el-table-column>
        
        <el-table-column label="总库存" width="100" v-if="isGroupView">
          <template #default="{ row }">
            <el-tag v-if="row.isGroup" type="info">{{ getTotalStock(row) }}</el-tag>
            <el-tag v-else :type="getStockType(row)">{{ row.stock }}</el-tag>
          </template>
        </el-table-column>
        
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
              :value="parseInt(warehouse.id)"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="类别" prop="category">
          <el-select v-model="form.category" style="width: 100%" @change="handleCategoryChange" placeholder="请选择类别">
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
    // 从 localStorage 读取之前选择的仓库
    const savedWarehouseId = localStorage.getItem('currentWarehouseId');
    const currentWarehouseId = ref(savedWarehouseId ? parseInt(savedWarehouseId) : null);
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

    // 类别名称映射
    const categoryMap = {
      'safety_shoes': '安全鞋',
      'work_clothes': '工作服',
      'gloves': '手套',
      'helmet': '安全帽',
      'mask': '口罩'
    };

    const getCategoryName = (code) => {
      return categoryMap[code] || code || '-';
    };

    // 计算分组的总库存
    const getTotalStock = (groupRow) => {
      if (!groupRow.children) return 0;
      return groupRow.children.reduce((sum, item) => sum + (item.stock || 0), 0);
    };

    // 类别改变时获取尺码选项
    const handleCategoryChange = async (category) => {
      form.size = '';
      sizeOptions.value = [];
      if (!category) return;
      
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
          // 检查保存的仓库ID是否还在列表中
          const savedId = localStorage.getItem('currentWarehouseId');
          const savedIdInt = savedId ? parseInt(savedId) : null;
          const warehouseExists = res.data.find(w => w.id === savedIdInt);
          
          if (res.data.length > 0) {
            if (!currentWarehouseId.value || !warehouseExists) {
              // 如果没有保存的仓库或保存的仓库已不存在，选择第一个
              currentWarehouseId.value = res.data[0].id;
            }
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

    watch(currentWarehouseId, (newVal) => {
      // 保存到 localStorage
      if (newVal) {
        localStorage.setItem('currentWarehouseId', newVal);
      }
      fetchData();
    });

    const getStockType = (row) => {
      if (row.stock === 0) return 'danger';
      if (row.stock < 10) return 'warning';
      return 'success';
    };

    const handleAdd = () => {
      // 跳转到入库页面，带上来源参数
      window.location.href = '/#/ppe-inbound?from=stock&action=add';
    };

    const handleEdit = (row) => {
      // 展开 Proxy 查看实际数据
      const rawRow = JSON.parse(JSON.stringify(row));
      console.log('编辑行原始数据:', rawRow);
      console.log('warehouse_id 值:', rawRow.warehouse_id, '类型:', typeof rawRow.warehouse_id);
      
      isEdit.value = true;
      dialogTitle.value = '编辑用品';
      // 确保仓库列表已加载
      if (warehouseList.value.length === 0) {
        fetchWarehouses();
      }
      // 转换 warehouse_id 为数字类型
      let warehouseId = null;
      if (rawRow.warehouse_id !== undefined && rawRow.warehouse_id !== null) {
        warehouseId = parseInt(rawRow.warehouse_id);
      }
      console.log('转换后的 warehouseId:', warehouseId);
      
      Object.assign(form, {
        id: rawRow.id,
        name: rawRow.name,
        category: rawRow.category,
        size: rawRow.size || '',
        stock: rawRow.stock,
        warehouse_id: warehouseId,
        brand: rawRow.brand || '',
        model: rawRow.model || ''
      });
      console.log('表单数据:', JSON.parse(JSON.stringify(form)));
      // 如果有类别，加载尺码选项
      if (rawRow.category) {
        handleCategoryChange(rawRow.category);
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
        
        // 转换字段名：前端用 stock，后端用 quantity
        const submitData = {
          ...form,
          quantity: form.stock  // 将 stock 转为 quantity 提交给后端
        };
        
        const res = await request.post(url, submitData);
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
      getCategoryName,
      getTotalStock,
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
