-- Universal Comments and Likes System (Fixed Version)
-- This migration transforms the record-specific comments system into a universal system
-- that can be used for records, profiles, crews, missions, and any future entities

-- ============================================================================
-- 1. CREATE ENUM FOR ENTITY TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM (
    'record',
    'profile',
    'crew_intro',
    'mission',
    'announcement'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. CREATE UNIVERSAL COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
  mentions UUID[] DEFAULT '{}',
  likes_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_profile_id ON comments(profile_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_mentions ON comments USING GIN(mentions);

-- ============================================================================
-- 3. MIGRATE EXISTING RECORD_COMMENTS DATA
-- ============================================================================

-- Copy existing record comments to new universal table
INSERT INTO comments (id, entity_type, entity_id, profile_id, content, mentions, likes_count, created_at, updated_at)
SELECT
  id,
  'record'::entity_type,
  record_id,
  profile_id,
  content,
  '{}', -- Default empty mentions array
  0, -- Default likes_count
  created_at,
  updated_at
FROM record_comments
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. CREATE COMMENT_LIKES TABLE
-- ============================================================================

-- Create new comment_likes table (skip if already exists)
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(comment_id, profile_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_profile_id ON comment_likes(profile_id);

-- ============================================================================
-- 5. CREATE UNIVERSAL LIKES TABLE (for entities themselves, not comments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(entity_type, entity_id, profile_id)
);

-- Migrate existing record likes
INSERT INTO entity_likes (entity_type, entity_id, profile_id, created_at)
SELECT
  'record'::entity_type,
  record_id,
  profile_id,
  created_at
FROM record_likes
ON CONFLICT (entity_type, entity_id, profile_id) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_entity_likes_entity ON entity_likes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_likes_profile_id ON entity_likes(profile_id);

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

-- Anyone can view public comments
CREATE POLICY "Anyone can view comments"
  ON comments
  FOR SELECT
  USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON comments
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON comments
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON comments
  FOR DELETE
  USING (auth.uid() = profile_id);

-- Enable RLS on comment_likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can like comments" ON comment_likes;
DROP POLICY IF EXISTS "Users can unlike comments" ON comment_likes;

CREATE POLICY "Anyone can view comment likes"
  ON comment_likes FOR SELECT USING (true);

CREATE POLICY "Users can like comments"
  ON comment_likes FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can unlike comments"
  ON comment_likes FOR DELETE
  USING (auth.uid() = profile_id);

-- Enable RLS on entity_likes
ALTER TABLE entity_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view entity likes" ON entity_likes;
DROP POLICY IF EXISTS "Users can like entities" ON entity_likes;
DROP POLICY IF EXISTS "Users can unlike entities" ON entity_likes;

CREATE POLICY "Anyone can view entity likes"
  ON entity_likes FOR SELECT USING (true);

CREATE POLICY "Users can like entities"
  ON entity_likes FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can unlike entities"
  ON entity_likes FOR DELETE
  USING (auth.uid() = profile_id);

-- ============================================================================
-- 7. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes_count
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_likes_count();

-- Function to update comments count in parent entity
CREATE OR REPLACE FUNCTION update_entity_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update count based on entity type
    IF NEW.entity_type = 'record' THEN
      UPDATE records SET comments_count = comments_count + 1 WHERE id = NEW.entity_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.entity_type = 'record' THEN
      UPDATE records SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.entity_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_entity_comments_count ON comments;
CREATE TRIGGER trigger_update_entity_comments_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_entity_comments_count();

-- Function to update likes count in parent entity
CREATE OR REPLACE FUNCTION update_entity_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.entity_type = 'record' THEN
      UPDATE records SET likes_count = likes_count + 1 WHERE id = NEW.entity_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.entity_type = 'record' THEN
      UPDATE records SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.entity_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_entity_likes_count ON entity_likes;
CREATE TRIGGER trigger_update_entity_likes_count
  AFTER INSERT OR DELETE ON entity_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_entity_likes_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_updated_at ON comments;
CREATE TRIGGER trigger_update_comment_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. NOTIFICATION TRIGGERS
-- ============================================================================

-- Function to create notification for entity like
CREATE OR REPLACE FUNCTION create_entity_like_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  entity_owner_id uuid;
  liker_name text;
  notification_title text;
  notification_message text;
  notification_link text;
BEGIN
  -- Get entity owner and construct notification based on type
  IF NEW.entity_type = 'record' THEN
    SELECT profile_id INTO entity_owner_id FROM records WHERE id = NEW.entity_id;
    notification_title := '좋아요';
    notification_link := '/records/' || NEW.entity_id;
  ELSIF NEW.entity_type = 'profile' THEN
    entity_owner_id := NEW.entity_id;
    notification_title := '프로필 좋아요';
    notification_link := '/profile/' || NEW.entity_id;
  ELSE
    RETURN NEW; -- Unknown entity type
  END IF;

  -- Don't notify if liking own entity
  IF entity_owner_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;

  -- Get liker's name
  SELECT display_name INTO liker_name FROM profiles WHERE id = NEW.profile_id;

  -- Construct message based on entity type
  IF NEW.entity_type = 'record' THEN
    notification_message := COALESCE(liker_name, '러너') || '님이 회원님의 기록을 좋아합니다.';
  ELSIF NEW.entity_type = 'profile' THEN
    notification_message := COALESCE(liker_name, '러너') || '님이 회원님의 프로필을 좋아합니다.';
  END IF;

  -- Create notification
  INSERT INTO notifications (
    recipient_id, type, title, message, data, link
  ) VALUES (
    entity_owner_id,
    CASE NEW.entity_type
      WHEN 'record' THEN 'record_liked'
      WHEN 'profile' THEN 'profile_liked'
      ELSE 'entity_liked'
    END,
    notification_title,
    notification_message,
    jsonb_build_object(
      'entityType', NEW.entity_type,
      'entityId', NEW.entity_id,
      'actorId', NEW.profile_id,
      'actorName', COALESCE(liker_name, '러너')
    ),
    notification_link
  );

  RETURN NEW;
END;
$$;

-- Function to create notification for comment
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  entity_owner_id uuid;
  commenter_name text;
  comment_preview text;
  notification_link text;
BEGIN
  -- Get entity owner based on type
  IF NEW.entity_type = 'record' THEN
    SELECT profile_id INTO entity_owner_id FROM records WHERE id = NEW.entity_id;
    notification_link := '/records/' || NEW.entity_id;
  ELSIF NEW.entity_type = 'profile' THEN
    entity_owner_id := NEW.entity_id;
    notification_link := '/profile/' || NEW.entity_id;
  ELSE
    RETURN NEW;
  END IF;

  -- Don't notify if commenting on own entity
  IF entity_owner_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;

  -- Get commenter's name
  SELECT display_name INTO commenter_name FROM profiles WHERE id = NEW.profile_id;

  -- Create comment preview
  comment_preview := LEFT(NEW.content, 50);
  IF LENGTH(NEW.content) > 50 THEN
    comment_preview := comment_preview || '...';
  END IF;

  -- Create notification
  INSERT INTO notifications (
    recipient_id, type, title, message, data, link
  ) VALUES (
    entity_owner_id,
    'comment_created',
    '새 댓글',
    COALESCE(commenter_name, '러너') || '님이 댓글을 남겼습니다: "' || comment_preview || '"',
    jsonb_build_object(
      'commentId', NEW.id,
      'entityType', NEW.entity_type,
      'entityId', NEW.entity_id,
      'actorId', NEW.profile_id,
      'actorName', COALESCE(commenter_name, '러너'),
      'commentContent', comment_preview
    ),
    notification_link
  );

  RETURN NEW;
END;
$$;

-- Function to create notification for comment like
CREATE OR REPLACE FUNCTION create_comment_like_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  comment_owner_id uuid;
  comment_entity_type entity_type;
  comment_entity_id uuid;
  liker_name text;
  comment_preview text;
  notification_link text;
BEGIN
  -- Get comment info
  SELECT profile_id, entity_type, entity_id, content
  INTO comment_owner_id, comment_entity_type, comment_entity_id, comment_preview
  FROM comments WHERE id = NEW.comment_id;

  -- Don't notify if liking own comment
  IF comment_owner_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;

  -- Get liker's name
  SELECT display_name INTO liker_name FROM profiles WHERE id = NEW.profile_id;

  -- Create preview
  comment_preview := LEFT(comment_preview, 30);
  IF LENGTH(comment_preview) > 30 THEN
    comment_preview := comment_preview || '...';
  END IF;

  -- Create link based on entity type
  IF comment_entity_type = 'record' THEN
    notification_link := '/records/' || comment_entity_id;
  ELSIF comment_entity_type = 'profile' THEN
    notification_link := '/profile/' || comment_entity_id;
  END IF;

  -- Create notification
  INSERT INTO notifications (
    recipient_id, type, title, message, data, link
  ) VALUES (
    comment_owner_id,
    'comment_liked',
    '댓글 좋아요',
    COALESCE(liker_name, '러너') || '님이 회원님의 댓글을 좋아합니다: "' || comment_preview || '"',
    jsonb_build_object(
      'commentId', NEW.comment_id,
      'entityType', comment_entity_type,
      'entityId', comment_entity_id,
      'actorId', NEW.profile_id,
      'actorName', COALESCE(liker_name, '러너'),
      'commentContent', comment_preview
    ),
    notification_link
  );

  RETURN NEW;
END;
$$;

-- Function to create notifications for mentions
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mentioned_user_id uuid;
  mentioner_name text;
  comment_preview text;
  notification_link text;
BEGIN
  -- Only process if there are mentions
  IF NEW.mentions IS NULL OR array_length(NEW.mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get mentioner's name
  SELECT display_name INTO mentioner_name FROM profiles WHERE id = NEW.profile_id;

  -- Create preview
  comment_preview := LEFT(NEW.content, 50);
  IF LENGTH(NEW.content) > 50 THEN
    comment_preview := comment_preview || '...';
  END IF;

  -- Create link based on entity type
  IF NEW.entity_type = 'record' THEN
    notification_link := '/records/' || NEW.entity_id;
  ELSIF NEW.entity_type = 'profile' THEN
    notification_link := '/profile/' || NEW.entity_id;
  END IF;

  -- Create notification for each mentioned user
  FOREACH mentioned_user_id IN ARRAY NEW.mentions
  LOOP
    IF mentioned_user_id != NEW.profile_id THEN
      INSERT INTO notifications (
        recipient_id, type, title, message, data, link
      ) VALUES (
        mentioned_user_id,
        'mention',
        '멘션',
        COALESCE(mentioner_name, '러너') || '님이 댓글에서 회원님을 언급했습니다: "' || comment_preview || '"',
        jsonb_build_object(
          'commentId', NEW.id,
          'entityType', NEW.entity_type,
          'entityId', NEW.entity_id,
          'actorId', NEW.profile_id,
          'actorName', COALESCE(mentioner_name, '러너'),
          'commentContent', comment_preview
        ),
        notification_link
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create notification triggers
DROP TRIGGER IF EXISTS trigger_notify_entity_like ON entity_likes;
CREATE TRIGGER trigger_notify_entity_like
  AFTER INSERT ON entity_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_entity_like_notification();

DROP TRIGGER IF EXISTS trigger_notify_comment ON comments;
CREATE TRIGGER trigger_notify_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

DROP TRIGGER IF EXISTS trigger_notify_comment_like ON comment_likes;
CREATE TRIGGER trigger_notify_comment_like
  AFTER INSERT ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_like_notification();

DROP TRIGGER IF EXISTS trigger_notify_mentions ON comments;
CREATE TRIGGER trigger_notify_mentions
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notifications();

-- ============================================================================
-- 9. CLEAN UP OLD TRIGGERS
-- ============================================================================

-- Remove old record-specific triggers
DROP TRIGGER IF EXISTS trigger_notify_record_like ON record_likes;
DROP TRIGGER IF EXISTS trigger_notify_record_comment ON record_comments;
DROP TRIGGER IF EXISTS trigger_update_likes_count ON record_likes;
DROP TRIGGER IF EXISTS trigger_update_comments_count ON record_comments;
DROP TRIGGER IF EXISTS trigger_update_comment_updated_at ON record_comments;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Universal Comments & Likes System Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'New Tables:';
  RAISE NOTICE '  - comments (universal, replaces record_comments)';
  RAISE NOTICE '  - entity_likes (universal, replaces record_likes)';
  RAISE NOTICE '  - comment_likes (for liking comments)';
  RAISE NOTICE '';
  RAISE NOTICE 'Supported Entity Types:';
  RAISE NOTICE '  - record';
  RAISE NOTICE '  - profile';
  RAISE NOTICE '  - crew_intro';
  RAISE NOTICE '  - mission';
  RAISE NOTICE '  - announcement';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - @ mentions with notifications';
  RAISE NOTICE '  - Comment likes with notifications';
  RAISE NOTICE '  - Entity likes with notifications';
  RAISE NOTICE '  - Automatic count updates';
  RAISE NOTICE '========================================';
END $$;
