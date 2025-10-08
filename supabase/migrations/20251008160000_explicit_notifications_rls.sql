-- EXPLICIT FIX: Use auth.uid() IS NOT NULL instead of true
-- Some Postgres versions don't handle WITH CHECK (true) correctly

-- Step 1: Drop the problematic INSERT policy
DROP POLICY IF EXISTS "allow_insert_any_notifications" ON notifications;

-- Step 2: Create new INSERT policy with explicit auth check
CREATE POLICY "notifications_allow_authenticated_insert"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Explicit check: user must be authenticated (has a valid auth.uid())
  auth.uid() IS NOT NULL
);

-- Step 3: Add comment explaining the policy
COMMENT ON POLICY "notifications_allow_authenticated_insert" ON notifications IS
  'Allow any authenticated user to create notifications for any recipient. Uses auth.uid() IS NOT NULL instead of true for better compatibility.';

-- Step 4: Verify the policy exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'notifications'
        AND policyname = 'notifications_allow_authenticated_insert'
    ) THEN
        RAISE NOTICE 'SUCCESS: Policy "notifications_allow_authenticated_insert" created';
    ELSE
        RAISE EXCEPTION 'FAILED: Policy was not created';
    END IF;
END $$;
