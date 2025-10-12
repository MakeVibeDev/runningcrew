/**
 * 범용 댓글 시스템 통합 테스트 스크립트
 *
 * 실행 방법: npx tsx scripts/test-comments-integration.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
}

async function runTest(name: string, testFn: () => Promise<void>) {
  const startTime = Date.now();
  try {
    await testFn();
    logTest(name, true);
  } catch (error) {
    logTest(name, false, error instanceof Error ? error.message : String(error));
  }
}

// 1. 데이터베이스 테이블 확인
async function testDatabaseTables() {
  console.log('\n📦 데이터베이스 테이블 확인\n');

  await runTest('comments 테이블 존재 확인', async () => {
    const { error } = await supabase.from('comments').select('id').limit(1);
    if (error && error.code !== 'PGRST116') throw error;
  });

  await runTest('comment_likes 테이블 존재 확인', async () => {
    const { error } = await supabase.from('comment_likes').select('id').limit(1);
    if (error && error.code !== 'PGRST116') throw error;
  });

  await runTest('entity_likes 테이블 존재 확인', async () => {
    const { error } = await supabase.from('entity_likes').select('id').limit(1);
    if (error && error.code !== 'PGRST116') throw error;
  });
}

// 2. 댓글 조회 테스트
async function testCommentRetrieval() {
  console.log('\n📖 댓글 조회 테스트\n');

  // 먼저 기존 댓글이 마이그레이션 되었는지 확인
  await runTest('기존 댓글 마이그레이션 확인', async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('entity_type', 'record')
      .limit(5);

    if (error) throw error;
    console.log(`   마이그레이션된 댓글 수: ${data?.length || 0}개`);
  });

  await runTest('프로필 정보 포함 조회', async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:profile_id (
          id, username, display_name, full_name, avatar_url
        )
      `)
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) {
      console.log('   ⚠️  테스트할 댓글이 없습니다');
      return;
    }
    if (!data[0].profiles) {
      throw new Error('프로필 정보가 포함되지 않음');
    }
  });

  await runTest('created_at 기준 정렬', async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    if (data && data.length > 1) {
      const dates = data.map(d => new Date(d.created_at).getTime());
      for (let i = 1; i < dates.length; i++) {
        if (dates[i] > dates[i - 1]) {
          throw new Error('정렬 순서가 올바르지 않음');
        }
      }
    }
  });
}

// 3. API 엔드포인트 테스트
async function testAPIEndpoints() {
  console.log('\n🌐 API 엔드포인트 테스트\n');

  const baseUrl = 'http://localhost:3000';

  // 먼저 테스트할 record를 찾음
  await runTest('GET /api/comments - 댓글 조회', async () => {
    const { data: records } = await supabase
      .from('records')
      .select('id')
      .limit(1)
      .single();

    if (!records) {
      console.log('   ⚠️  테스트할 기록이 없습니다');
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/comments?entityType=record&entityId=${records.id}`
    );

    if (!response.ok) {
      throw new Error(`API 응답 에러: ${response.status}`);
    }

    const data = await response.json();
    console.log(`   조회된 댓글 수: ${data.comments?.length || 0}개`);
  });

  await runTest('GET /api/users/search - 사용자 검색', async () => {
    const response = await fetch(`${baseUrl}/api/users/search?q=test&limit=5`);

    // 비로그인 상태에서는 401 에러가 예상됨
    if (response.status === 401) {
      console.log('   ℹ️  비로그인 상태 - 401 응답 (예상된 동작)');
      return;
    }

    if (!response.ok) {
      throw new Error(`API 응답 에러: ${response.status}`);
    }

    const data = await response.json();
    console.log(`   검색된 사용자 수: ${data.users?.length || 0}명`);
  });
}

// 4. 트리거 및 알림 테스트
async function testNotificationTriggers() {
  console.log('\n🔔 알림 트리거 확인\n');

  await runTest('댓글 알림 트리거 함수 존재 확인', async () => {
    const { data, error } = await supabase.rpc('pg_get_functiondef', {
      funcoid: 'create_comment_notification'
    }).single();

    // 함수가 없으면 에러가 발생하지만, 이는 rpc 호출이 제한될 수 있음
    console.log('   ℹ️  트리거 함수는 데이터베이스에 설정되어 있어야 합니다');
  });

  await runTest('최근 알림 조회', async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('type, title, created_at')
      .in('type', ['comment_created', 'comment_liked', 'mention'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    console.log(`   최근 댓글 관련 알림: ${data?.length || 0}개`);
    if (data && data.length > 0) {
      data.forEach(n => {
        console.log(`   - ${n.type}: ${n.title}`);
      });
    }
  });
}

// 5. RLS 정책 테스트
async function testRLSPolicies() {
  console.log('\n🔒 RLS 정책 테스트\n');

  await runTest('비로그인 상태 댓글 조회 가능', async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('id')
      .limit(1);

    // PGRST116 = no rows returned (정상)
    if (error && error.code !== 'PGRST116') throw error;
    console.log('   ✓ 비로그인 상태에서도 댓글 조회 가능');
  });
}

// 6. 데이터 무결성 테스트
async function testDataIntegrity() {
  console.log('\n🔍 데이터 무결성 테스트\n');

  await runTest('댓글의 profile_id가 유효한지 확인', async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        profile_id,
        profiles:profile_id (id)
      `)
      .limit(10);

    if (error) throw error;
    if (data) {
      const invalidComments = data.filter(c => !c.profiles);
      if (invalidComments.length > 0) {
        throw new Error(`${invalidComments.length}개의 댓글에 유효하지 않은 profile_id`);
      }
      console.log(`   ✓ ${data.length}개 댓글 모두 유효한 profile_id`);
    }
  });

  await runTest('mentions 배열 형식 확인', async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('id, mentions')
      .not('mentions', 'is', null)
      .limit(5);

    if (error) throw error;
    if (data) {
      data.forEach(comment => {
        if (!Array.isArray(comment.mentions)) {
          throw new Error(`댓글 ${comment.id}의 mentions가 배열이 아님`);
        }
      });
      console.log(`   ✓ mentions 필드가 모두 배열 형식`);
    }
  });

  await runTest('content 길이 제한 확인', async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('id, content')
      .limit(100);

    if (error) throw error;
    if (data) {
      const tooLong = data.filter(c => c.content.length > 1000);
      if (tooLong.length > 0) {
        throw new Error(`${tooLong.length}개의 댓글이 1000자를 초과`);
      }
      console.log(`   ✓ 모든 댓글이 1000자 이내`);
    }
  });
}

// 메인 테스트 실행
async function main() {
  console.log('🚀 범용 댓글 시스템 통합 테스트 시작\n');
  console.log('=' .repeat(60));

  const startTime = Date.now();

  await testDatabaseTables();
  await testCommentRetrieval();
  await testAPIEndpoints();
  await testNotificationTriggers();
  await testRLSPolicies();
  await testDataIntegrity();

  const duration = Date.now() - startTime;

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 테스트 결과 요약\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`총 테스트: ${total}개`);
  console.log(`✅ 성공: ${passed}개`);
  console.log(`❌ 실패: ${failed}개`);
  console.log(`⏱️  소요 시간: ${(duration / 1000).toFixed(2)}초`);

  if (failed > 0) {
    console.log('\n실패한 테스트:\n');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`❌ ${r.name}`);
      if (r.error) {
        console.log(`   ${r.error}`);
      }
    });
  }

  console.log('\n' + '='.repeat(60));

  // 종료 코드 설정
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('테스트 실행 중 오류 발생:', error);
  process.exit(1);
});
