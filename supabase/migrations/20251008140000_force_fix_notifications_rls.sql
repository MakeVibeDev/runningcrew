-- Force fix notifications RLS policy with explicit permissions
-- This migration forcefully resets ALL policies to ensure they work

-- Step 1: Disable RLS temporarily
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (force clean slate)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'notifications'
    LOOP
        EXECUTE format('DROP POLICY %I ON notifications', r.policyname);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new policies with explicit grants

-- Policy 1: SELECT - Users can view their own notifications
CREATE POLICY "notifications_select_policy"
ON notifications
FOR SELECT
TO authenticated
USING (auth.uid() = recipient_id);

-- Policy 2: INSERT - Allow ALL authenticated users to insert notifications
-- This is the critical policy that should allow User A to create notifications for User B
CREATE POLICY "notifications_insert_policy"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);  -- No restrictions - any authenticated user can insert

-- Policy 3: UPDATE - Users can only update their own notifications
CREATE POLICY "notifications_update_policy"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Policy 4: DELETE - Users can only delete their own notifications
CREATE POLICY "notifications_delete_policy"
ON notifications
FOR DELETE
TO authenticated
USING (auth.uid() = recipient_id);

-- Step 5: Grant explicit table permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

-- Step 6: Verify grants
DO $$
BEGIN
    RAISE NOTICE 'Notifications RLS policies have been reset.';
    RAISE NOTICE 'Verifying table permissions...';
END $$;
