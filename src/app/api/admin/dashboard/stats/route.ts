import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // 날짜 설정
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    // 총 사용자 수
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // 활성 크루 수
    const { count: activeCrews } = await supabase
      .from("crews")
      .select("*", { count: "exact", head: true });

    // 진행중 미션 수 (종료일이 오늘 이후인 미션)
    const today = now.toISOString().split("T")[0];
    const { count: activeMissions } = await supabase
      .from("missions")
      .select("*", { count: "exact", head: true })
      .gte("end_date", today);

    // 총 기록 수
    const { count: totalRecords } = await supabase
      .from("records")
      .select("*", { count: "exact", head: true });

    // 오늘 신규 가입자 수
    const { count: todayUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfToday.toISOString());

    // 어제 신규 가입자 수
    const { count: yesterdayUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfYesterday.toISOString())
      .lt("created_at", startOfToday.toISOString());

    // 오늘 등록된 기록 수
    const { count: todayRecords } = await supabase
      .from("records")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfToday.toISOString());

    // 어제 등록된 기록 수
    const { count: yesterdayRecords } = await supabase
      .from("records")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfYesterday.toISOString())
      .lt("created_at", startOfToday.toISOString());

    // 최근 활동 (최근 10건)
    const { data: recentUsers } = await supabase
      .from("profiles")
      .select("id, username, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: recentRecords } = await supabase
      .from("records")
      .select("id, title, distance, user_id, created_at, profiles(username, full_name)")
      .order("created_at", { ascending: false })
      .limit(5);

    // 변화율 계산
    const calculateChange = (today: number, yesterday: number) => {
      if (yesterday === 0) return today > 0 ? 100 : 0;
      return Math.round(((today - yesterday) / yesterday) * 100);
    };

    const usersChange = calculateChange(todayUsers || 0, yesterdayUsers || 0);
    const recordsChange = calculateChange(todayRecords || 0, yesterdayRecords || 0);

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeCrews: activeCrews || 0,
      activeMissions: activeMissions || 0,
      totalRecords: totalRecords || 0,
      todayUsers: todayUsers || 0,
      todayRecords: todayRecords || 0,
      usersChange,
      usersChangePositive: usersChange >= 0,
      recordsChange,
      recordsChangePositive: recordsChange >= 0,
      recentUsers: recentUsers || [],
      recentRecords: recentRecords || [],
    });
  } catch (error) {
    console.error("대시보드 통계 로드 오류:", error);
    return NextResponse.json(
      { error: "통계 로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
