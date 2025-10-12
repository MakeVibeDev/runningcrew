-- Admin 전용 테이블 생성
-- 작성일: 2025-10-11
-- 설명: Admin 앱에서 사용하는 테이블들

-- 1. 관리자 계정 테이블
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator')),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_is_active ON admin_users(is_active);

-- 기본 관리자 계정 생성 (비밀번호: runningcrew2025!)
-- bcrypt hash for 'runningcrew2025!'
INSERT INTO admin_users (username, password_hash, role, name, email, is_active)
VALUES (
  'admin',
  '$2b$10$YourBcryptHashHere', -- 실제로는 bcrypt로 해싱된 비밀번호
  'super_admin',
  'System Admin',
  'admin@runningcrew.io',
  true
)
ON CONFLICT (username) DO NOTHING;

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- 2. 관리자 활동 로그 테이블
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_logs_action ON admin_activity_logs(action);
CREATE INDEX idx_admin_activity_logs_target_type ON admin_activity_logs(target_type);
CREATE INDEX idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);

-- 3. 신고 테이블
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('profile', 'record', 'comment', 'crew', 'mission')),
  target_id UUID NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'rejected')),
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_target_type ON reports(target_type);
CREATE INDEX idx_reports_target_id ON reports(target_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- updated_at 트리거
CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- 4. 제재 이력 테이블
CREATE TABLE IF NOT EXISTS sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('warning', 'suspension', 'ban')),
  reason TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_at TIMESTAMPTZ,
  issued_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_sanctions_profile_id ON sanctions(profile_id);
CREATE INDEX idx_sanctions_type ON sanctions(type);
CREATE INDEX idx_sanctions_is_active ON sanctions(is_active);
CREATE INDEX idx_sanctions_start_at ON sanctions(start_at DESC);
CREATE INDEX idx_sanctions_end_at ON sanctions(end_at);

-- updated_at 트리거
CREATE TRIGGER trigger_sanctions_updated_at
  BEFORE UPDATE ON sanctions
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- 5. 시스템 공지 테이블
CREATE TABLE IF NOT EXISTS system_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'announcement' CHECK (type IN ('maintenance', 'announcement', 'update', 'warning')),
  is_active BOOLEAN DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_system_notices_is_active ON system_notices(is_active);
CREATE INDEX idx_system_notices_type ON system_notices(type);
CREATE INDEX idx_system_notices_start_at ON system_notices(start_at DESC);

-- updated_at 트리거
CREATE TRIGGER trigger_system_notices_updated_at
  BEFORE UPDATE ON system_notices
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- RLS 정책 (Admin 앱은 Service Role Key를 사용하므로 RLS 우회됨)
-- 하지만 보안을 위해 정의해둠

-- admin_users: Admin만 접근
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- admin_activity_logs: Admin만 접근
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- reports: 신고자는 자신의 신고만 조회, Admin은 모두 조회
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" ON reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- sanctions: 제재 대상자는 자신의 제재 내역만 조회
ALTER TABLE sanctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sanctions" ON sanctions
  FOR SELECT
  USING (auth.uid() = profile_id);

-- system_notices: 모든 사용자가 활성화된 공지 조회 가능
ALTER TABLE system_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active notices" ON system_notices
  FOR SELECT
  USING (is_active = true);

-- 코멘트
COMMENT ON TABLE admin_users IS 'Admin 앱 관리자 계정';
COMMENT ON TABLE admin_activity_logs IS 'Admin 활동 로그 (감사 추적)';
COMMENT ON TABLE reports IS '사용자 신고 내역';
COMMENT ON TABLE sanctions IS '사용자 제재 이력';
COMMENT ON TABLE system_notices IS '시스템 공지사항';

COMMENT ON COLUMN admin_users.role IS 'super_admin: 최고 관리자, admin: 일반 관리자, moderator: 모더레이터';
COMMENT ON COLUMN reports.status IS 'pending: 대기, reviewing: 검토중, resolved: 해결, rejected: 기각';
COMMENT ON COLUMN sanctions.type IS 'warning: 경고, suspension: 정지, ban: 영구 차단';
COMMENT ON COLUMN sanctions.is_active IS '현재 활성 상태 (end_at 이전이고 취소되지 않음)';
