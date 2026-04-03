USE ppe_smart_manager;
SELECT '=== 租户表数据 ===' as info;
SELECT id, code, name FROM core_tenants WHERE status = 1;
