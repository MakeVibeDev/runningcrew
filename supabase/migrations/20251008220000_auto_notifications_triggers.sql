-- Automatic notification triggers for record likes and comments
-- This bypasses RLS issues by using database-level triggers

-- Function to create notification for record like
CREATE OR REPLACE FUNCTION create_record_like_notification()
RETURNS TRIGGER
SECURITY DEFINER -- Run as database owner, bypassing RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  record_owner_id uuid;
  liker_name text;
BEGIN
  -- Get record owner ID
  SELECT profile_id INTO record_owner_id
  FROM records
  WHERE id = NEW.record_id;

  -- Don't notify if liking own record
  IF record_owner_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;

  -- Get liker's name
  SELECT display_name INTO liker_name
  FROM profiles
  WHERE id = NEW.profile_id;

  -- Create notification
  INSERT INTO notifications (
    recipient_id,
    type,
    title,
    message,
    data,
    link
  ) VALUES (
    record_owner_id,
    'record_liked',
    '좋아요',
    COALESCE(liker_name, '러너') || '님이 회원님의 기록을 좋아합니다.',
    jsonb_build_object(
      'recordId', NEW.record_id,
      'actorId', NEW.profile_id,
      'actorName', COALESCE(liker_name, '러너')
    ),
    '/records/' || NEW.record_id
  );

  RETURN NEW;
END;
$$;

-- Function to create notification for record comment
CREATE OR REPLACE FUNCTION create_record_comment_notification()
RETURNS TRIGGER
SECURITY DEFINER -- Run as database owner, bypassing RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  record_owner_id uuid;
  commenter_name text;
  comment_preview text;
BEGIN
  -- Get record owner ID
  SELECT profile_id INTO record_owner_id
  FROM records
  WHERE id = NEW.record_id;

  -- Don't notify if commenting on own record
  IF record_owner_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;

  -- Get commenter's name
  SELECT display_name INTO commenter_name
  FROM profiles
  WHERE id = NEW.profile_id;

  -- Create comment preview (first 50 chars)
  comment_preview := LEFT(NEW.content, 50);
  IF LENGTH(NEW.content) > 50 THEN
    comment_preview := comment_preview || '...';
  END IF;

  -- Create notification
  INSERT INTO notifications (
    recipient_id,
    type,
    title,
    message,
    data,
    link
  ) VALUES (
    record_owner_id,
    'record_commented',
    '새 댓글',
    COALESCE(commenter_name, '러너') || '님이 댓글을 남겼습니다: "' || comment_preview || '"',
    jsonb_build_object(
      'recordId', NEW.record_id,
      'actorId', NEW.profile_id,
      'actorName', COALESCE(commenter_name, '러너'),
      'commentContent', comment_preview
    ),
    '/records/' || NEW.record_id
  );

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_record_like ON record_likes;
CREATE TRIGGER trigger_notify_record_like
  AFTER INSERT ON record_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_record_like_notification();

DROP TRIGGER IF EXISTS trigger_notify_record_comment ON record_comments;
CREATE TRIGGER trigger_notify_record_comment
  AFTER INSERT ON record_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_record_comment_notification();

-- Verify
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Auto notification triggers created:';
  RAISE NOTICE '- record_likes -> creates like notification';
  RAISE NOTICE '- record_comments -> creates comment notification';
  RAISE NOTICE 'Notifications will be created automatically!';
  RAISE NOTICE '========================================';
END $$;
