USE ppe_smart_manager;
SELECT '=== 当前租户/公司信息 ===' as info;
SELECT id, code, name, contact_name, contact_phone 
FROM core_tenants 
WHERE status = 1 AND deleted_at IS NULL;
