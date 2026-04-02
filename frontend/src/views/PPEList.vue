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
      <el-table :data="tableData" v-loading="loading" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="用品名称" />
        <el-table-column prop="brand" label="品牌" width="120" />
        <el-table-column prop="model" label="型号" width="120" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="stock" label="库存数量" width="100">
          <template #default="{ row }">
            <el-tag :type="getStockType(row)">{{ row.stock }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'normal' ? 'success' : row.status === 'low' ? 'warning' : 'danger'">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑用品对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="用品名称" prop="name">
          <el-input v-model="form.name" />
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
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="口罩" value="口罩" />
            <el-option label="手套" value="手套" />
            <el-option label="防护服" value="防护服" />
            <el-option label="护目镜" value="护目镜" />
            <el-option label="安全帽" value="安全帽" />
          </el-select>
        </el-form-item>
        <el-form-item label="品牌" prop="brand">
          <el-input v-model="form.brand" placeholder="可选" />
        </el-form-item>
        <el-form-item label="型号" prop="model">
          <el-input v-model="form.model" placeholder="可选" />
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

    const form = reactive({
      id: null,
      name: '',
      type: '',
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
      type: [{ required: true, message: '请选择类型', trigger: 'change' }],
      stock: [{ required: true, message: '请输入库存数量', trigger: 'blur' }]
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
        console.log('正在获取仓库数据:', warehouseId);
        const res = await request.get('/ppe/list', {
          params: { warehouse_id: warehouseId }
        });
        console.log('返回数据:', res);
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

    const getStatusText = (status) => {
      const map = { normal: '正常', low: '偏低', out: '告急' };
      return map[status] || status;
    };

    const handleAdd = () => {
      isEdit.value = false;
      dialogTitle.value = '新增用品';
      Object.assign(form, { 
        id: null, 
        name: '', 
        type: '', 
        stock: 0, 
        warehouse_id: currentWarehouseId.value,
        brand: '',
        model: ''
      });
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      dialogTitle.value = '编辑用品';
      Object.assign(form, row);
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
      getStockType,
      getStatusText,
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