-- Create release_likes table
CREATE TABLE IF NOT EXISTS release_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_version TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(release_version, profile_id)
);

-- Create release_comments table
CREATE TABLE IF NOT EXISTS release_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_version TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_release_likes_version ON release_likes(release_version);
CREATE INDEX IF NOT EXISTS idx_release_likes_profile ON release_likes(profile_id);
CREATE INDEX IF NOT EXISTS idx_release_comments_version ON release_comments(release_version);
CREATE INDEX IF NOT EXISTS idx_release_comments_profile ON release_comments(profile_id);
CREATE INDEX IF NOT EXISTS idx_release_comments_created ON release_comments(created_at DESC);

-- Enable RLS
ALTER TABLE release_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for release_likes
CREATE POLICY "Anyone can view release likes"
  ON release_likes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can like releases"
  ON release_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can unlike their own likes"
  ON release_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- RLS Policies for release_comments
CREATE POLICY "Anyone can view release comments"
  ON release_comments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can comment on releases"
  ON release_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own comments"
  ON release_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own comments"
  ON release_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);
