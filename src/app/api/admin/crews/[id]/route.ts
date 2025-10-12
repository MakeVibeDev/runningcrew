import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // 크루 기본 정보
    const { data: crew, error: crewError } = await supabase
      .from("crews")
      .select("*")
      .eq("id", id)
      .single();

    if (crewError || !crew) {
      return NextResponse.json(
        { error: "크루를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 크루장 정보
    const { data: leader } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", crew.owner_id)
      .single();

    // 멤버 목록
    const { data: membersData } = await supabase
      .from("crew_members")
      .select("profile_id, created_at, profiles(id, display_name, avatar_url)")
      .eq("crew_id", id)
      .order("created_at", { ascending: false });

    const members = membersData?.map((m: {
      profile_id: string;
      created_at: string;
      profiles: unknown;
    }) => ({
      userId: m.profile_id,
      joinedAt: m.created_at,
      profile: m.profiles,
    })) || [];

    // 미션 목록
    const { data: missions } = await supabase
      .from("missions")
      .select("id, title, description, start_date, end_date, goal_type, goal_value")
      .eq("crew_id", id)
      .order("created_at", { ascending: false });

    // 통계
    const { count: totalMembers } = await supabase
      .from("crew_members")
      .select("*", { count: "exact", head: true })
      .eq("crew_id", id);

    const { count: totalMissions } = await supabase
      .from("missions")
      .select("*", { count: "exact", head: true })
      .eq("crew_id", id);

    // 활성 미션 수 (종료일이 오늘 이후)
    const today = new Date().toISOString().split("T")[0];
    const { count: activeMissions } = await supabase
      .from("missions")
      .select("*", { count: "exact", head: true })
      .eq("crew_id", id)
      .gte("end_date", today);

    // 최근 활동 (최근 가입한 멤버 5명)
    const { data: recentMembers } = await supabase
      .from("crew_members")
      .select("created_at, profiles(display_name)")
      .eq("crew_id", id)
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      crew,
      leader,
      members,
      missions: missions || [],
      recentMembers: recentMembers || [],
      stats: {
        totalMembers: totalMembers || 0,
        totalMissions: totalMissions || 0,
        activeMissions: activeMissions || 0,
      },
    });
  } catch (error) {
    console.error("크루 상세 정보 로드 오류:", error);
    return NextResponse.json(
      { error: "크루 정보 로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
