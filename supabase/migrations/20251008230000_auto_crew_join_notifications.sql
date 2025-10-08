-- Automatic notification triggers for crew join requests
-- This bypasses RLS issues by using database-level triggers

-- Function to create notification when join request is created
CREATE OR REPLACE FUNCTION create_crew_join_request_notification()
RETURNS TRIGGER
SECURITY DEFINER -- Run as database owner, bypassing RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  crew_info record;
  applicant_name text;
BEGIN
  -- Get crew info
  SELECT id, name, slug, owner_id INTO crew_info
  FROM crews
  WHERE id = NEW.crew_id;

  -- Get applicant's name
  SELECT display_name INTO applicant_name
  FROM profiles
  WHERE id = NEW.profile_id;

  -- Create notification for crew owner
  INSERT INTO notifications (
    recipient_id,
    type,
    title,
    message,
    data,
    link
  ) VALUES (
    crew_info.owner_id,
    'crew_join_request',
    '새로운 크루 가입 신청',
    COALESCE(applicant_name, '러너') || '님이 ' || crew_info.name || ' 크루 가입을 신청했습니다.',
    jsonb_build_object(
      'crewId', crew_info.id,
      'crewName', crew_info.name,
      'actorId', NEW.profile_id,
      'actorName', COALESCE(applicant_name, '러너')
    ),
    '/crews/' || crew_info.slug
  );

  RETURN NEW;
END;
$$;

-- Function to create notification when join request is approved
CREATE OR REPLACE FUNCTION create_crew_join_approved_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  crew_info record;
  new_member_name text;
  existing_member_ids uuid[];
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get crew info
    SELECT id, name, slug INTO crew_info
    FROM crews
    WHERE id = NEW.crew_id;

    -- Get new member's name
    SELECT display_name INTO new_member_name
    FROM profiles
    WHERE id = NEW.profile_id;

    -- Send approval notification to applicant
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      message,
      data,
      link
    ) VALUES (
      NEW.profile_id,
      'crew_join_approved',
      '크루 가입 승인',
      crew_info.name || ' 크루 가입이 승인되었습니다! 환영합니다! 🎉',
      jsonb_build_object(
        'crewId', crew_info.id,
        'crewName', crew_info.name
      ),
      '/crews/' || crew_info.slug
    );

    -- Get existing crew members (excluding the new member)
    SELECT array_agg(profile_id) INTO existing_member_ids
    FROM crew_members
    WHERE crew_id = NEW.crew_id
      AND profile_id != NEW.profile_id;

    -- Send notifications to existing members
    IF existing_member_ids IS NOT NULL AND array_length(existing_member_ids, 1) > 0 THEN
      INSERT INTO notifications (
        recipient_id,
        type,
        title,
        message,
        data,
        link
      )
      SELECT
        unnest(existing_member_ids),
        'crew_new_member',
        '새로운 크루원',
        COALESCE(new_member_name, '러너') || '님이 ' || crew_info.name || ' 크루에 가입했습니다!',
        jsonb_build_object(
          'crewId', crew_info.id,
          'crewName', crew_info.name,
          'actorId', NEW.profile_id,
          'actorName', COALESCE(new_member_name, '러너')
        ),
        '/crews/' || crew_info.slug;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to create notification when join request is rejected
CREATE OR REPLACE FUNCTION create_crew_join_rejected_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  crew_info record;
BEGIN
  -- Only process when status changes to 'rejected'
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    -- Get crew info
    SELECT id, name INTO crew_info
    FROM crews
    WHERE id = NEW.crew_id;

    -- Send rejection notification to applicant
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      message,
      data,
      link
    ) VALUES (
      NEW.profile_id,
      'crew_join_rejected',
      '크루 가입 신청 결과',
      crew_info.name || ' 크루 가입 신청이 거절되었습니다.',
      jsonb_build_object(
        'crewId', crew_info.id,
        'crewName', crew_info.name
      ),
      '/crews'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_crew_join_request ON crew_join_requests;
CREATE TRIGGER trigger_notify_crew_join_request
  AFTER INSERT ON crew_join_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION create_crew_join_request_notification();

DROP TRIGGER IF EXISTS trigger_notify_crew_join_approved ON crew_join_requests;
CREATE TRIGGER trigger_notify_crew_join_approved
  AFTER UPDATE ON crew_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_crew_join_approved_notification();

DROP TRIGGER IF EXISTS trigger_notify_crew_join_rejected ON crew_join_requests;
CREATE TRIGGER trigger_notify_crew_join_rejected
  AFTER UPDATE ON crew_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_crew_join_rejected_notification();

-- Verify
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Auto crew join notification triggers created:';
  RAISE NOTICE '- crew_join_requests INSERT -> join request notification';
  RAISE NOTICE '- crew_join_requests UPDATE (approved) -> approval + new member notifications';
  RAISE NOTICE '- crew_join_requests UPDATE (rejected) -> rejection notification';
  RAISE NOTICE '========================================';
END $$;
