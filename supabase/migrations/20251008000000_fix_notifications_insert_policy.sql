-- Fix notifications insert policy to allow authenticated users to send notifications to anyone
-- The current policy only checks auth.role(), but we need to allow users to notify others

-- Drop old policy
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

-- Create new policy that allows any authenticated user to insert notifications
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add comment explaining the policy
COMMENT ON POLICY "Authenticated users can insert notifications" ON notifications IS
  'Any authenticated user can create notifications for any recipient. This is needed for features like likes, comments, and crew join requests.';
