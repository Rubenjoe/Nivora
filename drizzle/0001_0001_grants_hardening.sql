-- 0001_grants_hardening.sql
-- Revoke all table-level privileges from anon on the financial tables.
-- RLS already restricts anon rows, but removing table privileges removes
-- the privilege surface entirely.
-- For authenticated, keep only SELECT/INSERT/UPDATE/DELETE; revoke
-- TRUNCATE/TRIGGER/REFERENCES (TRUNCATE is not governed by RLS).
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.categories FROM anon;
REVOKE ALL ON TABLE public.transactions FROM anon;

REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.profiles FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.categories FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.transactions FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions TO authenticated;
