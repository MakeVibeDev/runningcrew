-- Debug and fix notifications RLS for client-side usage
-- The issue: client-side Supabase instance cannot insert notifications

-- First, let's see what policies currently exist
DO $$
DECLARE
    policy_rec record;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Current notifications policies:';
    RAISE NOTICE '========================================';

    FOR policy_rec IN
        SELECT
            policyname,
            cmd,
            qual,
            with_check,
            roles
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'notifications'
        ORDER BY cmd, policyname
    LOOP
        RAISE NOTICE '% - % (roles: %)', policy_rec.cmd, policy_rec.policyname, policy_rec.roles;
        RAISE NOTICE '  USING: %', policy_rec.qual;
        RAISE NOTICE '  WITH CHECK: %', policy_rec.with_check;
    END LOOP;
END $$;

-- Drop the current INSERT policy
DROP POLICY IF EXISTS "permissive_insert_all" ON notifications;

-- Create a new super-permissive INSERT policy
-- This allows ANY authenticated user to insert notifications for ANY recipient
CREATE POLICY "allow_authenticated_insert_notifications"
ON notifications
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Also ensure the table has the right grants
GRANT INSERT ON notifications TO authenticated;
GRANT INSERT ON notifications TO anon;

-- Verify the new policy
DO $$
DECLARE
    policy_rec record;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Updated notifications INSERT policies:';
    RAISE NOTICE '========================================';

    FOR policy_rec IN
        SELECT
            policyname,
            cmd,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'notifications'
        AND cmd = 'INSERT'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '% - WITH CHECK: %', policy_rec.policyname, policy_rec.with_check;
    END LOOP;
END $$;
