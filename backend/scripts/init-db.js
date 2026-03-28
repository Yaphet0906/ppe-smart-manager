// 数据库初始化脚本（唯一入口）
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Asdf1234'
    });

    console.log('🚀 开始初始化数据库...\n');

    // 1. 创建数据库
    await connection.query('CREATE DATABASE IF NOT EXISTS ppe_smart_manager');
    await connection.query('USE ppe_smart_manager');
    console.log('✅ 数据库创建成功');

    // 2. 执行 schema
    const schema = fs.readFileSync(
        path.join(__dirname, '../database/database-schema-v1.sql'), 
        'utf8'
    );
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
        try {
            await connection.query(stmt);
        } catch (e) {
            // 忽略已存在的错误
            if (!e.message.includes('Duplicate')) console.log('⚠️', e.message);
        }
    }
    console.log('✅ 表结构创建成功');

    // 3. 插入测试数据
    const bcrypt = require('bcryptjs');
    const passwordHash = '$2a$10$npi8dqUNn/z2BziKPmYTsOx2fIofaMRESGXG/qteeS8cHlPnODCoS';

    // 检查是否已有数据
    const [existing] = await connection.query('SELECT id FROM core_tenants WHERE code = ?', ['ABCD']);
    
    if (existing.length === 0) {
        // 插入租户
        await connection.query(
            `INSERT INTO core_tenants (code, name, contact_name, contact_phone, status) 
             VALUES (?, ?, ?, ?, ?)`,
            ['ABCD', '测试工厂', '管理员', '18116175082', 1]
        );
        
        const [tenant] = await connection.query('SELECT id FROM core_tenants WHERE code = ?', ['ABCD']);
        
        // 插入用户
        await connection.query(
            `INSERT INTO core_users (tenant_id, name, phone, password, role, is_first_login) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [tenant[0].id, '管理员', '18116175082', passwordHash, 'admin', 1]
        );
        
        console.log('✅ 测试数据插入成功');
    } else {
        console.log('ℹ️ 测试数据已存在，跳过');
    }

    console.log('\n🎉 初始化完成！');
    console.log('登录信息:');
    console.log('  公司代码: ABCD');
    console.log('  手机号: 18116175082');
    console.log('  密码: Asdf1234');

    await connection.end();
}

initDatabase().catch(err => {
    console.error('❌ 错误:', err.message);
    process.exit(1);
});