<template>
  <div class="ppe-list">
    <div class="page-header">
      <h3>PPE设备管理</h3>
      <el-button type="primary" @click="handleAdd">新增设备</el-button>
    </div>
    
    <el-card>
      <el-table :data="tableData" v-loading="loading" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="设备名称" />
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
    
    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="form.name" />
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
        <el-form-item label="库存数量" prop="stock">
          <el-input-number v-model="form.stock" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { reactive, ref, onMounted } from 'vue';
import request from '../utils/request';

export default {
  name: 'PPEList',
  setup() {
    const loading = ref(false);
    const tableData = ref([]);
    const dialogVisible = ref(false);
    const dialogTitle = ref('新增设备');
    const formRef = ref(null);
    const isEdit = ref(false);
    
    const form = reactive({
      id: null,
      name: '',
      type: '',
      stock: 0
    });
    
    const rules = {
      name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
      type: [{ required: true, message: '请选择类型', trigger: 'change' }],
      stock: [{ required: true, message: '请输入库存数量', trigger: 'blur' }]
    };
    
    const fetchData = async () => {
      loading.value = true;
      try {
        const res = await request.get('/ppe/list');
        if (res.code === 200) {
          tableData.value = res.data;
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        loading.value = false;
      }
    };
    
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
      dialogTitle.value = '新增设备';
      Object.assign(form, { id: null, name: '', type: '', stock: 0 });
      dialogVisible.value = true;
    };
    
    const handleEdit = (row) => {
      isEdit.value = true;
      dialogTitle.value = '编辑设备';
      Object.assign(form, row);
      dialogVisible.value = true;
    };
    
    const handleDelete = async (row) => {
      try {
        await ElMessageBox.confirm('确定删除该设备吗？', '提示', { type: 'warning' });
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
    
    onMounted(() => {
      fetchData();
    });
    
    return {
      loading,
      tableData,
      dialogVisible,
      dialogTitle,
      formRef,
      form,
      rules,
      getStockType,
      getStatusText,
      handleAdd,
      handleEdit,
      handleDelete,
      handleSubmit
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
</style>
