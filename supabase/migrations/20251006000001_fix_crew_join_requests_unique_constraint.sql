-- Fix unique constraint to only apply to pending requests
-- This allows users to be rejected multiple times if they reapply

-- Drop the old constraint
ALTER TABLE public.crew_join_requests
DROP CONSTRAINT IF EXISTS crew_join_requests_crew_id_profile_id_status_key;

-- Create a partial unique index for pending requests only
CREATE UNIQUE INDEX IF NOT EXISTS crew_join_requests_pending_unique
ON public.crew_join_requests (crew_id, profile_id)
WHERE status = 'pending';

-- Clean up any duplicate rejected/approved entries (keep the most recent)
WITH duplicates AS (
  SELECT
    id,
    crew_id,
    profile_id,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY crew_id, profile_id, status
      ORDER BY created_at DESC
    ) as rn
  FROM crew_join_requests
  WHERE status IN ('approved', 'rejected')
)
DELETE FROM crew_join_requests
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
