/**
 * PPE库存相关API测试
 */
const request = require('supertest');
const app = require('../app');

const TEST_USER = {
  companyName: 'ABCD',
  phone: '18116175082',
  password: '123456'
};

describe('PPE 库存 API', () => {
  let token;

  beforeAll(async () => {
    // 登录获取token
    const res = await request(app)
      .post('/api/user/login')
      .send(TEST_USER);
    token = res.body.data.token;
  });

  describe('GET /api/ppe/stats', () => {
    test('应返回统计数据', async () => {
      const res = await request(app)
        .get('/api/ppe/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(res.body.code).toBe(200);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('normal');
      expect(res.body.data).toHaveProperty('low');
      expect(res.body.data).toHaveProperty('out');
      expect(typeof res.body.data.total).toBe('number');
    });

    test('带仓库参数应返回该仓库统计', async () => {
      const res = await request(app)
        .get('/api/ppe/stats?warehouse_id=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(res.body.code).toBe(200);
      expect(res.body.data).toHaveProperty('total');
    });
  });

  describe('GET /api/ppe/list', () => {
    test('应返回物品列表', async () => {
      const res = await request(app)
        .get('/api/ppe/list?limit=5')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(res.body.code).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
      expect(res.body).toHaveProperty('pagination');
    });

    test('带仓库筛选应返回筛选结果', async () => {
      const res = await request(app)
        .get('/api/ppe/list?warehouse_id=1&limit=5')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(res.body.code).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('无token应返回401', async () => {
      const res = await request(app)
        .get('/api/ppe/list')
        .expect(401);
      
      expect(res.body.code).toBe(401);
    });
  });

  describe('GET /api/ppe/warehouse-list', () => {
    test('应返回仓库列表', async () => {
      const res = await request(app)
        .get('/api/ppe/warehouse-list')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(res.body.code).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
