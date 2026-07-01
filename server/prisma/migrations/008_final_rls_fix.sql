-- Verify RLS is completely disabled on all tables
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- If any have rowsecurity = true, disable it
ALTER TABLE investment_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE investments DISABLE ROW LEVEL SECURITY;
ALTER TABLE deposits DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Check PostgreSQL role permissions
SELECT 
  r.rolname as role_name,
  p.privilege_type
FROM pg_roles r
JOIN information_schema.table_privileges p ON p.grantee = r.rolname
WHERE p.table_schema = 'public' AND p.table_name = 'investment_plans';

-- Ensure postgres role has access
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;