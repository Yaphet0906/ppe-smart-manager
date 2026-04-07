<template>
  <div class="ppe-list">
    <div class="page-header">
      <h3>库存管理</h3>
      <el-button type="primary" @click="goToInbound">新增入库</el-button>
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
            <!-- 展开显示子项（尺码明细） -->
            <el-table :data="row.children" v-if="row.children && row.children.length > 0" border size="small">
              <el-table-column type="index" label="序号" width="60" align="center" />
              <el-table-column prop="size" label="尺码/规格" min-width="150">
                <template #default="{ row: childRow }">
                  {{ childRow.size || '默认' }}
                </template>
              </el-table-column>
              <el-table-column prop="brand" label="品牌" width="150" />
              <el-table-column prop="model" label="型号" width="150" />
              <el-table-column prop="stock" label="库存数量" width="100" align="center">
                <template #default="{ row: childRow }">
                  <el-tag :type="getStockType(childRow)">{{ childRow.stock }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" align="center">
                <template #default="{ row: childRow }">
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
        
        <el-table-column label="操作" width="100" v-if="!isGroupView" align="center">
          <template #default="{ row }">
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

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
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../utils/request';

export default {
  name: 'PPEList',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const loading = ref(false);
    const tableData = ref([]);
    const allTableData = ref([]); // 存储原始数据用于筛选
    const warehouseList = ref([]);
    // 从 localStorage 读取之前选择的仓库
    const savedWarehouseId = localStorage.getItem('currentWarehouseId');
    const currentWarehouseId = ref(savedWarehouseId ? parseInt(savedWarehouseId) : null);
    const showAddWarehouse = ref(false);
    const warehouseRef = ref(null);
    const isGroupView = ref(true); // 是否分组显示
    const currentFilter = ref(route.query.filter || 'all'); // 当前筛选条件

    const warehouseForm = reactive({
      code: '',
      name: '',
      location: ''
    });

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

    // 根据库存状态筛选数据
    const filterDataByStock = (data, filter) => {
      if (filter === 'all' || !filter) return data;
      
      return data.filter(row => {
        // 获取库存数量
        let stock = 0;
        if (row.children && row.children.length > 0) {
          // 有子项（尺码明细），计算总库存
          stock = row.children.reduce((sum, item) => sum + (item.stock || 0), 0);
        } else {
          stock = row.stock || 0;
        }
        
        // 获取安全库存（假设每个物品有 safety_stock 字段，如果没有则默认10）
        const safetyStock = row.safety_stock || 10;
        
        switch (filter) {
          case 'normal':
            return stock > safetyStock;
          case 'low':
            return stock > 0 && stock <= safetyStock;
          case 'critical':
            return stock === 0;
          default:
            return true;
        }
      });
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
          allTableData.value = res.data;
          // 应用筛选
          tableData.value = filterDataByStock(res.data, currentFilter.value);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        loading.value = false;
      }
    };
    
    // 监听路由参数变化，重新筛选
    watch(() => route.query.filter, (newFilter) => {
      currentFilter.value = newFilter || 'all';
      if (allTableData.value.length > 0) {
        tableData.value = filterDataByStock(allTableData.value, currentFilter.value);
      } else {
        fetchData();
      }
    });

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

    const handleDelete = async (row) => {
      try {
        // 弹出确认框并要求填写删除原因
        const { value: reason } = await ElMessageBox.prompt(
          '请输入删除原因（必填）',
          '删除确认',
          {
            confirmButtonText: '确认删除',
            cancelButtonText: '取消',
            type: 'warning',
            inputValidator: (value) => {
              if (!value || value.trim() === '') {
                return '删除原因不能为空';
              }
              return true;
            }
          }
        );
        
        const res = await request.delete(`/ppe/delete/${row.id}`, {
          data: { reason: reason.trim() }
        });
        
        if (res.code === 200) {
          ElMessage.success('删除成功');
          fetchData();
        }
      } catch (error) {
        // 用户取消不报错
        if (error !== 'cancel') {
          console.error('删除失败:', error);
        }
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

    const goToInbound = () => {
      // 跳转到入库页面
      window.location.href = '/#/ppe-inbound?from=stock&action=add';
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
      showAddWarehouse,
      warehouseRef,
      warehouseForm,
      isGroupView,
      currentFilter,
      getCategoryName,
      getTotalStock,
      getStockType,
      handleDelete,
      handleAddWarehouse,
      goToInbound,
      filterDataByStock
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
