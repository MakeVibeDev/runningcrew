-- Complete reset of notifications RLS policies to fix persistent RLS errors
-- Error: "new row violates row-level security policy for table notifications"

-- First, disable RLS temporarily
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on notifications table
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'notifications' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON notifications', policy_name);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create fresh policies

-- 1. SELECT: Users can only view their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_id);

-- 2. INSERT: Any authenticated user can create notifications for anyone
--    This is required for features like: likes, comments, crew join requests
--    where one user creates a notification for another user
CREATE POLICY "notifications_insert_authenticated"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. UPDATE: Users can only update their own notifications (e.g., mark as read)
CREATE POLICY "notifications_update_own"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- 4. DELETE: Users can only delete their own notifications
CREATE POLICY "notifications_delete_own"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = recipient_id);

-- Add comments for documentation
COMMENT ON POLICY "notifications_select_own" ON notifications IS
  'Users can view only their own notifications';

COMMENT ON POLICY "notifications_insert_authenticated" ON notifications IS
  'Any authenticated user can create notifications. This allows user A to create notifications for user B (likes, comments, crew requests, etc.)';

COMMENT ON POLICY "notifications_update_own" ON notifications IS
  'Users can update only their own notifications (mark as read, etc.)';

COMMENT ON POLICY "notifications_delete_own" ON notifications IS
  'Users can delete only their own notifications';
