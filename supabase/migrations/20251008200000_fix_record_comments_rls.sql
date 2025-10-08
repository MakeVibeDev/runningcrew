-- Fix record_comments and record_likes RLS policies for Server Actions
-- Make them permissive to allow server-side operations

-- ============================================
-- record_likes policies
-- ============================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can like records" ON record_likes;

-- Create new permissive INSERT policy
CREATE POLICY "authenticated_can_insert_likes"
ON record_likes
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- record_comments policies
-- ============================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create comments" ON record_comments;

-- Create new permissive INSERT policy
CREATE POLICY "authenticated_can_insert_comments"
ON record_comments
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Verify policies
DO $$
DECLARE
    policy_rec record;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'record_likes RLS policies:';
    RAISE NOTICE '========================================';

    FOR policy_rec IN
        SELECT policyname, cmd FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'record_likes'
        ORDER BY cmd, policyname
    LOOP
        RAISE NOTICE '% - %', policy_rec.cmd, policy_rec.policyname;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'record_comments RLS policies:';
    RAISE NOTICE '========================================';

    FOR policy_rec IN
        SELECT policyname, cmd FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'record_comments'
        ORDER BY cmd, policyname
    LOOP
        RAISE NOTICE '% - %', policy_rec.cmd, policy_rec.policyname;
    END LOOP;

    RAISE NOTICE '========================================';
END $$;
