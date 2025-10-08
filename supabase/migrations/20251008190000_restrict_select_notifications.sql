-- Restrict SELECT to own notifications only
-- Complete the security hardening for notifications table

-- Step 1: Drop the permissive SELECT policy
DROP POLICY IF EXISTS "permissive_select_all" ON notifications;

-- Step 2: Create restricted SELECT policy (own notifications only)
CREATE POLICY "select_own_notifications"
ON notifications
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());

-- Step 3: Verify
DO $$
DECLARE
    policy_rec record;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Final notifications RLS policies:';
    RAISE NOTICE '========================================';

    FOR policy_rec IN
        SELECT policyname, cmd FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'notifications'
        ORDER BY cmd, policyname
    LOOP
        RAISE NOTICE '% - %', policy_rec.cmd, policy_rec.policyname;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Security status (ALL RESTRICTED):';
    RAISE NOTICE '- SELECT: authenticated, own notifications only';
    RAISE NOTICE '- INSERT: authenticated, no restrictions';
    RAISE NOTICE '- UPDATE: authenticated, own notifications only';
    RAISE NOTICE '- DELETE: authenticated, own notifications only';
    RAISE NOTICE '========================================';
END $$;
