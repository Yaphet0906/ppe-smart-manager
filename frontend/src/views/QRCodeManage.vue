<template>
  <div class="qrcode-page">
    <h3>仓库二维码管理</h3>
    <p class="desc">为每个仓库生成专属二维码，员工扫码即可自助领用</p>
    
    <el-card class="generate-card">
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="仓库名称" prop="warehouseName">
          <el-input 
            v-model="form.warehouseName" 
            placeholder="如：A仓库、车间一、劳保室等"
          />
        </el-form-item>
        
        <el-form-item label="仓库位置" prop="location">
          <el-input 
            v-model="form.location" 
            placeholder="如：一楼东侧、办公楼 201 等"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            :loading="generating"
            @click="generateQRCode"
            style="width: 100%"
          >
            生成二维码
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 生成的二维码列表 -->
    <el-card class="qrcode-list" v-if="qrList.length > 0">
      <template #header>
        <div class="card-header">
          <span>已生成的二维码</span>
          <el-button type="primary" size="small" @click="printAll">批量打印</el-button>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" v-for="(item, index) in qrList" :key="index">
          <div class="qr-item">
            <div class="qr-code" ref="qrRefs">
              <!-- 这里用 canvas 绘制二维码 -->
              <canvas :id="'qr-' + index" width="200" height="200"></canvas>
            </div>
            <div class="qr-info">
              <h4>{{ item.warehouseName }}</h4>
              <p>{{ item.location }}</p>
              <p class="qr-url">{{ item.shortUrl }}</p>
            </div>
            <div class="qr-actions">
              <el-button type="primary" size="small" @click="downloadQR(index)">下载</el-button>
              <el-button size="small" @click="printQR(index)">打印</el-button>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- 打印区域（隐藏） -->
    <div class="print-area" v-show="false">
      <div v-for="(item, index) in qrList" :key="index" class="print-item">
        <canvas :id="'print-qr-' + index" width="300" height="350"></canvas>
        <div class="print-text">
          <h3>{{ item.warehouseName }}</h3>
          <p>{{ item.location }}</p>
          <p>微信扫码自助领用</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive, ref, nextTick } from 'vue';
import { useUserStore } from '../store';

// 简单的二维码生成函数（使用 QRCode.js 或 canvas 绘制）
// 这里先用占位符，实际项目中需要引入 qrcode 库

export default {
  name: 'QRCodeManage',
  setup() {
    const userStore = useUserStore();
    const formRef = ref(null);
    const generating = ref(false);
    const qrList = ref([]);
    
    const form = reactive({
      warehouseName: '',
      location: ''
    });
    
    const rules = {
      warehouseName: [
        { required: true, message: '请输入仓库名称', trigger: 'blur' }
      ]
    };
    
    // 生成二维码
    const generateQRCode = async () => {
      try {
        await formRef.value.validate();
        generating.value = true;
        
        // 获取公司代码
        const companyCode = userStore.userInfo?.companyCode || 'DEMO001';
        
        // 生成领用页面 URL
        const baseUrl = window.location.origin;
        const fullUrl = `${baseUrl}/#/quick-outbound?code=${companyCode}`;
        
        // 添加到列表
        qrList.value.push({
          warehouseName: form.warehouseName,
          location: form.location,
          fullUrl: fullUrl,
          shortUrl: `${baseUrl}/#/quick-outbound?code=${companyCode}`,
          companyCode: companyCode
        });
        
        // 清空表单
        form.warehouseName = '';
        form.location = '';
        
        // 等待 DOM 更新后绘制二维码
        await nextTick();
        drawQRCodes();
        
        ElMessage.success('二维码生成成功！');
      } catch (error) {
        console.error('生成失败:', error);
      } finally {
        generating.value = false;
      }
    };
    
    // 绘制二维码（简化版，实际用 qrcode.js）
    const drawQRCodes = () => {
      qrList.value.forEach((item, index) => {
        const canvas = document.getElementById('qr-' + index);
        if (canvas) {
          const ctx = canvas.getContext('2d');
          // 清空画布
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, 200, 200);
          
          // 绘制占位二维码（实际项目中用 qrcode.js 生成）
          ctx.fillStyle = '#000';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('二维码占位', 100, 100);
          ctx.fillText('需引入 qrcode.js', 100, 120);
          
          // 在底部添加文字
          ctx.font = '10px Arial';
          ctx.fillStyle = '#666';
          ctx.fillText(item.warehouseName, 100, 180);
        }
      });
    };
    
    // 下载二维码
    const downloadQR = (index) => {
      const canvas = document.getElementById('qr-' + index);
      if (canvas) {
        const link = document.createElement('a');
        link.download = `仓库二维码-${qrList.value[index].warehouseName}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    };
    
    // 打印单个二维码
    const printQR = (index) => {
      const printWindow = window.open('', '_blank');
      const item = qrList.value[index];
      printWindow.document.write(`
        <html>
          <head>
            <title>打印二维码</title>
            <style>
              body { text-align: center; padding: 20px; }
              .qr-container { border: 2px dashed #ccc; padding: 20px; display: inline-block; }
              h2 { margin: 10px 0; }
              p { color: #666; margin: 5px 0; }
              .tip { color: #999; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2>${item.warehouseName}</h2>
              <p>${item.location}</p>
              <p>微信扫码自助领用</p>
              <p class="tip">请使用微信扫一扫</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    };
    
    // 批量打印
    const printAll = () => {
      const printWindow = window.open('', '_blank');
      let content = '<html><head><title>批量打印二维码</title>';
      content += '<style>';
      content += 'body { font-family: Arial, sans-serif; }';
      content += '.qr-page { page-break-after: always; text-align: center; padding: 50px 20px; }';
      content += '.qr-page:last-child { page-break-after: auto; }';
      content += 'h2 { font-size: 32px; margin: 20px 0; }';
      content += 'p { font-size: 18px; color: #666; margin: 10px 0; }';
      content += '.qr-box { border: 3px dashed #ccc; padding: 40px; margin: 30px auto; max-width: 400px; }';
      content += '.tip { color: #999; font-size: 14px; margin-top: 30px; }';
      content += '</style></head><body>';
      
      qrList.value.forEach(item => {
        content += `
          <div class="qr-page">
            <div class="qr-box">
              <h2>${item.warehouseName}</h2>
              <p>${item.location}</p>
              <p style="font-size: 24px; color: #333; margin: 30px 0;">微信扫码自助领用</p>
              <p class="tip">请使用手机微信扫一扫功能</p>
            </div>
          </div>
        `;
      });
      
      content += '</body></html>';
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    };
    
    return {
      form,
      rules,
      formRef,
      generating,
      qrList,
      generateQRCode,
      downloadQR,
      printQR,
      printAll
    };
  }
};
</script>

<style scoped>
.qrcode-page {
  padding: 20px;
}

.desc {
  color: #666;
  margin-bottom: 20px;
}

.generate-card {
  max-width: 500px;
  margin-bottom: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.qr-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  text-align: center;
}

.qr-code {
  margin-bottom: 15px;
}

.qr-code canvas {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.qr-info h4 {
  margin: 0 0 5px;
  font-size: 16px;
}

.qr-info p {
  margin: 0;
  color: #666;
  font-size: 13px;
}

.qr-url {
  color: #409eff !important;
  font-size: 11px !important;
  word-break: break-all;
  margin-top: 5px !important;
}

.qr-actions {
  margin-top: 15px;
}

/* 手机端适配 */
@media (max-width: 768px) {
  .qrcode-page {
    padding: 10px;
  }
  
  .generate-card {
    margin: 0 -5px 20px;
  }
}
</style>