-- Tighten notifications RLS security
-- Keep INSERT permissive, restrict UPDATE and DELETE to own notifications

-- Step 1: Drop current UPDATE and DELETE policies
DROP POLICY IF EXISTS "permissive_update_all" ON notifications;
DROP POLICY IF EXISTS "permissive_delete_all" ON notifications;

-- Step 2: Create restricted UPDATE policy (own notifications only)
CREATE POLICY "update_own_notifications"
ON notifications
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- Step 3: Create restricted DELETE policy (own notifications only)
CREATE POLICY "delete_own_notifications"
ON notifications
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (recipient_id = auth.uid());

-- Step 4: Verify
DO $$
DECLARE
    policy_rec record;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Updated notifications RLS policies:';
    RAISE NOTICE '========================================';

    FOR policy_rec IN
        SELECT policyname, cmd FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'notifications'
        ORDER BY cmd, policyname
    LOOP
        RAISE NOTICE '% - %', policy_rec.cmd, policy_rec.policyname;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Security status:';
    RAISE NOTICE '- SELECT: PUBLIC (permissive for now)';
    RAISE NOTICE '- INSERT: authenticated, no restrictions';
    RAISE NOTICE '- UPDATE: authenticated, own notifications only';
    RAISE NOTICE '- DELETE: authenticated, own notifications only';
    RAISE NOTICE '========================================';
END $$;
