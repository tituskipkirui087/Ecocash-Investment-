-- Grant SELECT to service_role for all tables
GRANT SELECT ON public.investment_plans TO service_role;
GRANT SELECT ON public.users TO service_role;
GRANT SELECT ON public.investments TO service_role;
GRANT SELECT ON public.deposits TO service_role;
GRANT SELECT ON public.withdrawals TO service_role;
GRANT SELECT ON public.audit_logs TO service_role;
GRANT SELECT ON public.notifications TO service_role;

-- Grant all privileges to service_role
GRANT ALL ON public.investment_plans TO service_role;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.investments TO service_role;
GRANT ALL ON public.deposits TO service_role;
GRANT ALL ON public.withdrawals TO service_role;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.notifications TO service_role;