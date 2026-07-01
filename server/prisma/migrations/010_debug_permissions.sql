-- Check exact table structure and permissions
SELECT 
  t.tablename,
  t.tableowner,
  t.rowsecurity,
  has_table_privilege('postgres', t.tablename, 'SELECT') as has_select,
  has_table_privilege('postgres', t.tablename, 'INSERT') as has_insert
FROM pg_tables t
WHERE t.schemaname = 'public' 
AND t.tablename IN ('users', 'investment_plans', 'investments', 'deposits', 'withdrawals', 'audit_logs', 'notifications');

-- Check sequence permissions
SELECT 
  sequence_name,
  has_sequence_privilege('postgres', sequence_name, 'USAGE') as has_usage
FROM information_schema.sequences 
WHERE sequence_schema = 'public';