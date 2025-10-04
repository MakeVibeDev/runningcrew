-- Add likes and comments feature to records

-- 1. Add count columns to records table
ALTER TABLE records
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0 NOT NULL;

-- 2. Create record_likes table
CREATE TABLE IF NOT EXISTS record_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Prevent duplicate likes from same user
  UNIQUE(record_id, profile_id)
);

-- 3. Create record_comments table
CREATE TABLE IF NOT EXISTS record_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_record_likes_record_id ON record_likes(record_id);
CREATE INDEX IF NOT EXISTS idx_record_likes_profile_id ON record_likes(profile_id);
CREATE INDEX IF NOT EXISTS idx_record_comments_record_id ON record_comments(record_id);
CREATE INDEX IF NOT EXISTS idx_record_comments_profile_id ON record_comments(profile_id);
CREATE INDEX IF NOT EXISTS idx_record_comments_created_at ON record_comments(created_at DESC);

-- 5. RLS Policies for record_likes

-- Enable RLS
ALTER TABLE record_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes (for public records)
CREATE POLICY "Anyone can view record likes"
  ON record_likes
  FOR SELECT
  USING (true);

-- Users can create their own likes (only for public records they can see)
CREATE POLICY "Users can like records"
  ON record_likes
  FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id
    AND EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_likes.record_id
      AND (records.visibility = 'public' OR records.profile_id = auth.uid())
    )
  );

-- Users can delete their own likes
CREATE POLICY "Users can unlike records"
  ON record_likes
  FOR DELETE
  USING (auth.uid() = profile_id);

-- 6. RLS Policies for record_comments

-- Enable RLS
ALTER TABLE record_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments on public records
CREATE POLICY "Anyone can view comments on public records"
  ON record_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_comments.record_id
      AND (records.visibility = 'public' OR records.profile_id = auth.uid())
    )
  );

-- Authenticated users can create comments on records they can see
CREATE POLICY "Authenticated users can create comments"
  ON record_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id
    AND EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_comments.record_id
      AND (records.visibility = 'public' OR records.profile_id = auth.uid())
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON record_comments
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON record_comments
  FOR DELETE
  USING (auth.uid() = profile_id);

-- 7. Functions to maintain count cache

-- Function to update likes count
CREATE OR REPLACE FUNCTION update_record_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE records
    SET likes_count = likes_count + 1
    WHERE id = NEW.record_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE records
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.record_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comments count
CREATE OR REPLACE FUNCTION update_record_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE records
    SET comments_count = comments_count + 1
    WHERE id = NEW.record_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE records
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = OLD.record_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Triggers to automatically update counts

DROP TRIGGER IF EXISTS trigger_update_likes_count ON record_likes;
CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON record_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_record_likes_count();

DROP TRIGGER IF EXISTS trigger_update_comments_count ON record_comments;
CREATE TRIGGER trigger_update_comments_count
  AFTER INSERT OR DELETE ON record_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_record_comments_count();

-- 9. Function to update updated_at timestamp for comments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_updated_at ON record_comments;
CREATE TRIGGER trigger_update_comment_updated_at
  BEFORE UPDATE ON record_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Initialize counts for existing records
UPDATE records
SET likes_count = (
  SELECT COUNT(*) FROM record_likes WHERE record_likes.record_id = records.id
),
comments_count = (
  SELECT COUNT(*) FROM record_comments WHERE record_comments.record_id = records.id
);
