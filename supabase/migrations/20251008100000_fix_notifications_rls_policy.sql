-- Force update notifications insert policy to fix RLS error
-- Error: "new row violates row-level security policy for table notifications"

-- Drop ALL existing insert policies
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON notifications;

-- Create new policy that allows any authenticated user to insert notifications
CREATE POLICY "Enable insert for authenticated users"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comment
COMMENT ON POLICY "Enable insert for authenticated users" ON notifications IS
  'Allow any authenticated user to create notifications for any recipient. Required for likes, comments, crew join requests, etc.';
