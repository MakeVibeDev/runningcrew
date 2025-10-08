-- PERMISSIVE APPROACH: Make notifications RLS as loose as possible
-- Priority: Make it work first, tighten security later if needed

-- Step 1: Disable RLS temporarily
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies completely
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'notifications'
    LOOP
        EXECUTE format('DROP POLICY %I ON notifications', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 3: Grant full permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO anon;

-- Step 4: Re-enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 5: Create PERMISSIVE policies (using PERMISSIVE explicitly)

-- SELECT: Anyone can read any notification (super permissive for now)
CREATE POLICY "permissive_select_all"
ON notifications
AS PERMISSIVE
FOR SELECT
TO PUBLIC
USING (true);

-- INSERT: Any authenticated user can insert (no restrictions at all)
CREATE POLICY "permissive_insert_all"
ON notifications
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Any authenticated user can update any notification
CREATE POLICY "permissive_update_all"
ON notifications
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: Any authenticated user can delete any notification
CREATE POLICY "permissive_delete_all"
ON notifications
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (true);

-- Step 6: Verify
DO $$
DECLARE
    policy_count int;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'PERMISSIVE RLS policies applied';
    RAISE NOTICE 'Total policies: %', policy_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NOTE: These are intentionally loose for debugging';
    RAISE NOTICE 'Tighten security after confirming it works';
    RAISE NOTICE '========================================';
END $$;
