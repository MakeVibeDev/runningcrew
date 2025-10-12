import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // 사용자 기본 정보
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 가입한 크루 목록
    const { data: crews } = await supabase
      .from("crew_members")
      .select("crews(id, name, avatar_url, created_at)")
      .eq("user_id", id);

    // 등록한 기록 목록 (최근 10개)
    const { data: records } = await supabase
      .from("records")
      .select("id, title, distance, duration, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    // 제재 이력
    const { data: sanctions } = await supabase
      .from("sanctions")
      .select("*, admin_users(username)")
      .eq("profile_id", id)
      .order("created_at", { ascending: false });

    // 통계
    const { count: totalCrews } = await supabase
      .from("crew_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id);

    const { count: totalRecords } = await supabase
      .from("records")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id);

    // 총 러닝 거리 계산
    const { data: distanceData } = await supabase
      .from("records")
      .select("distance")
      .eq("user_id", id);

    const totalDistance = (distanceData || []).reduce(
      (sum, record) => sum + (record.distance || 0),
      0
    );

    return NextResponse.json({
      user,
      crews: crews?.map((c: any) => c.crews) || [],
      records: records || [],
      sanctions: sanctions || [],
      stats: {
        totalCrews: totalCrews || 0,
        totalRecords: totalRecords || 0,
        totalDistance,
      },
    });
  } catch (error) {
    console.error("사용자 상세 정보 로드 오류:", error);
    return NextResponse.json(
      { error: "사용자 정보 로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
