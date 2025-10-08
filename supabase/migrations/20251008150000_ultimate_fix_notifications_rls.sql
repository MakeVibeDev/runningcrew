-- ULTIMATE FIX for notifications RLS
-- This completely rebuilds the RLS setup from scratch

-- Step 1: Completely disable and re-enable RLS to reset everything
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Step 2: Remove ALL policies (brute force approach)
DO $$
DECLARE
    policy record;
BEGIN
    FOR policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'notifications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', policy.policyname);
        RAISE NOTICE 'Dropped policy: %', policy.policyname;
    END LOOP;
END $$;

-- Step 3: Revoke all existing grants and re-grant
REVOKE ALL ON notifications FROM PUBLIC;
REVOKE ALL ON notifications FROM authenticated;
REVOKE ALL ON notifications FROM anon;

-- Grant base permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE notifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 4: Re-enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 5: Create ONLY the essential policies

-- Allow SELECT for own notifications
CREATE POLICY "allow_select_own_notifications"
ON notifications
FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());

-- THIS IS THE CRITICAL POLICY - Allow INSERT for ANY authenticated user
-- No restrictions whatsoever - user A can create notification for user B
CREATE POLICY "allow_insert_any_notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be authenticated (this is automatic with TO authenticated)
  -- No other checks - allow creating notifications for anyone
  true
);

-- Allow UPDATE for own notifications only
CREATE POLICY "allow_update_own_notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- Allow DELETE for own notifications only
CREATE POLICY "allow_delete_own_notifications"
ON notifications
FOR DELETE
TO authenticated
USING (recipient_id = auth.uid());

-- Step 6: Verify the setup
DO $$
DECLARE
    policy_count int;
    policy_rec record;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications';

    RAISE NOTICE '=================================';
    RAISE NOTICE 'Notifications RLS setup complete';
    RAISE NOTICE 'Total policies created: %', policy_count;
    RAISE NOTICE '=================================';

    -- List all policies
    FOR policy_rec IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'notifications'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy exists: %', policy_rec.policyname;
    END LOOP;
END $$;
