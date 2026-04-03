USE ppe_smart_manager;
SELECT '=== 管理员账号信息 ===' as info;
SELECT id, name, phone, role, tenant_id, created_at 
FROM core_users 
WHERE role = 'admin' AND deleted_at IS NULL;
