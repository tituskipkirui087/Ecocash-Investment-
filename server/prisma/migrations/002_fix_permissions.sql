-- Disable Row Level Security on all tables (for server-side access with secret key)
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS investment_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS investments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deposits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;

-- Grant all privileges
GRANT ALL ON TABLE users TO postgres;
GRANT ALL ON TABLE investment_plans TO postgres;
GRANT ALL ON TABLE investments TO postgres;
GRANT ALL ON TABLE deposits TO postgres;
GRANT ALL ON TABLE withdrawals TO postgres;
GRANT ALL ON TABLE audit_logs TO postgres;
GRANT ALL ON TABLE notifications TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;