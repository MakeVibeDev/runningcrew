-- Auto-generate notifications for mission and ranking events
-- This migration creates database triggers to automatically create notifications
-- bypassing RLS issues by using SECURITY DEFINER functions

-- ============================================================================
-- MISSION CREATED NOTIFICATIONS
-- ============================================================================

-- Function to create notifications when a new mission is created
CREATE OR REPLACE FUNCTION create_mission_created_notification()
RETURNS TRIGGER
SECURITY DEFINER -- Run as database owner, bypassing RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  crew_member_ids uuid[];
  crew_info record;
BEGIN
  -- Get crew information
  SELECT id, name, slug INTO crew_info
  FROM crews
  WHERE id = NEW.crew_id;

  -- Get all crew members
  SELECT array_agg(profile_id) INTO crew_member_ids
  FROM crew_members
  WHERE crew_id = NEW.crew_id;

  -- Send notifications to all crew members
  IF crew_member_ids IS NOT NULL AND array_length(crew_member_ids, 1) > 0 THEN
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      message,
      data,
      link
    )
    SELECT
      unnest(crew_member_ids),
      'mission_created',
      '새로운 미션',
      crew_info.name || ' 크루에 새로운 미션 "' || NEW.title || '"이(가) 생성되었습니다!',
      jsonb_build_object(
        'missionId', NEW.id,
        'missionTitle', NEW.title,
        'crewId', crew_info.id,
        'crewName', crew_info.name
      ),
      '/missions/' || NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for mission creation
DROP TRIGGER IF EXISTS trigger_notify_mission_created ON missions;
CREATE TRIGGER trigger_notify_mission_created
  AFTER INSERT ON missions
  FOR EACH ROW
  EXECUTE FUNCTION create_mission_created_notification();

-- ============================================================================
-- RANKING TOP3 NOTIFICATIONS
-- ============================================================================

-- Function to create notifications when user achieves top 3 ranking
-- This will be triggered when mission_participant_stats is updated
CREATE OR REPLACE FUNCTION create_ranking_top3_notification()
RETURNS TRIGGER
SECURITY DEFINER -- Run as database owner, bypassing RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  mission_info record;
  crew_info record;
  current_rank integer;
  previous_rank integer;
BEGIN
  -- Only process if total_distance_km changed (meaning new records added)
  IF OLD.total_distance_km IS NOT DISTINCT FROM NEW.total_distance_km THEN
    RETURN NEW;
  END IF;

  -- Get current ranking by comparing with other participants
  SELECT COUNT(*) + 1 INTO current_rank
  FROM mission_participant_stats mps
  WHERE mps.mission_id = NEW.mission_id
    AND mps.total_distance_km > NEW.total_distance_km;

  -- Get previous ranking (if exists)
  SELECT COUNT(*) + 1 INTO previous_rank
  FROM mission_participant_stats mps
  WHERE mps.mission_id = OLD.mission_id
    AND mps.total_distance_km > OLD.total_distance_km;

  -- Only notify if:
  -- 1. User entered top 3 (current_rank <= 3)
  -- 2. User wasn't in top 3 before (previous_rank > 3 OR previous_rank IS NULL)
  IF current_rank <= 3 AND (previous_rank > 3 OR previous_rank IS NULL) THEN
    -- Get mission and crew information
    SELECT m.id, m.title, m.crew_id
    INTO mission_info
    FROM missions m
    WHERE m.id = NEW.mission_id;

    SELECT c.id, c.name, c.slug
    INTO crew_info
    FROM crews c
    WHERE c.id = mission_info.crew_id;

    -- Create notification
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      message,
      data,
      link
    )
    VALUES (
      NEW.profile_id,
      'ranking_top3',
      '순위권 진입! 🏆',
      '축하합니다! "' || mission_info.title || '" 미션에서 ' || current_rank || '위에 올랐습니다!',
      jsonb_build_object(
        'missionId', mission_info.id,
        'missionTitle', mission_info.title,
        'crewId', crew_info.id,
        'crewName', crew_info.name,
        'rank', current_rank,
        'previousRank', previous_rank
      ),
      '/missions/' || mission_info.id || '/rankings'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for ranking changes
DROP TRIGGER IF EXISTS trigger_notify_ranking_top3 ON mission_participant_stats;
CREATE TRIGGER trigger_notify_ranking_top3
  AFTER UPDATE ON mission_participant_stats
  FOR EACH ROW
  EXECUTE FUNCTION create_ranking_top3_notification();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION create_mission_created_notification() IS
  'Automatically creates notifications for all crew members when a new mission is created';

COMMENT ON FUNCTION create_ranking_top3_notification() IS
  'Automatically creates notifications when a user achieves top 3 ranking in a mission';
