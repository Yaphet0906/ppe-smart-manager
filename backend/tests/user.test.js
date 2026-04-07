/**
 * 用户相关API测试
 */
const request = require('supertest');
const app = require('../app');

// 测试账号
const TEST_USER = {
  companyName: 'ABCD',
  phone: '18116175082',
  password: '123456'
};

describe('用户认证 API', () => {
  let token;

  describe('POST /api/user/login', () => {
    test('正确凭据应返回token和用户信息', async () => {
      const res = await request(app)
        .post('/api/user/login')
        .send(TEST_USER)
        .expect(200);
      
      expect(res.body.code).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.userInfo).toBeDefined();
      expect(res.body.data.userInfo.phone).toBe(TEST_USER.phone);
      
      token = res.body.data.token;
    });

    test('错误密码应返回401', async () => {
      const res = await request(app)
        .post('/api/user/login')
        .send({ ...TEST_USER, password: 'wrongpassword' })
        .expect(200);
      
      expect(res.body.code).toBe(401);
    });

    test('不存在的公司应返回401', async () => {
      const res = await request(app)
        .post('/api/user/login')
        .send({ ...TEST_USER, companyName: 'NOTEXIST' })
        .expect(200);
      
      expect(res.body.code).toBe(401);
    });

    test('缺少参数应返回400', async () => {
      const res = await request(app)
        .post('/api/user/login')
        .send({ companyName: 'ABCD' })
        .expect(200);
      
      expect(res.body.code).toBe(400);
    });
  });

  describe('GET /api/user/profile', () => {
    test('应返回当前用户信息', async () => {
      // 先登录获取token
      const loginRes = await request(app)
        .post('/api/user/login')
        .send(TEST_USER);
      token = loginRes.body.data.token;

      const res = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(res.body.code).toBe(200);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).toHaveProperty('company_name');
    });

    test('无token应返回401', async () => {
      const res = await request(app)
        .get('/api/user/profile')
        .expect(401);
      
      expect(res.body.code).toBe(401);
    });

    test('无效token应返回401', async () => {
      const res = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
      
      expect(res.body.code).toBe(401);
    });
  });
});
