import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // 미션 기본 정보
    const { data: mission, error: missionError } = await supabase
      .from("missions")
      .select("*")
      .eq("id", id)
      .single();

    if (missionError || !mission) {
      return NextResponse.json(
        { error: "미션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 크루 정보
    const { data: crew } = await supabase
      .from("crews")
      .select("id, name, avatar_url")
      .eq("id", mission.crew_id)
      .single();

    // 참가자 목록 (simplified - just basic info)
    const { data: participantsData } = await supabase
      .from("mission_participants")
      .select("profile_id, joined_at, profiles(id, display_name, avatar_url)")
      .eq("mission_id", id)
      .eq("status", "joined")
      .order("joined_at", { ascending: false });

    const participants = participantsData?.map((p: {
      profile_id: string;
      joined_at: string;
      profiles: unknown;
    }) => ({
      userId: p.profile_id,
      progress: 0, // Simplified - no distance tracking in admin view for now
      joinedAt: p.joined_at,
      profile: p.profiles,
    })) || [];

    // 통계
    const { count: totalParticipants } = await supabase
      .from("mission_participants")
      .select("*", { count: "exact", head: true })
      .eq("mission_id", id);

    const { count: completedParticipants } = await supabase
      .from("mission_participants")
      .select("*", { count: "exact", head: true })
      .eq("mission_id", id)
      .eq("status", "completed");

    // 전체 진행률 계산
    const totalProgress = participants.reduce((sum, p) => sum + (p.progress || 0), 0);
    const averageProgress =
      participants.length > 0 ? totalProgress / participants.length : 0;

    return NextResponse.json({
      mission,
      crew,
      participants,
      stats: {
        totalParticipants: totalParticipants || 0,
        completedParticipants: completedParticipants || 0,
        averageProgress: Math.round(averageProgress),
        completionRate:
          totalParticipants && totalParticipants > 0
            ? Math.round(((completedParticipants || 0) / totalParticipants) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("미션 상세 정보 로드 오류:", error);
    return NextResponse.json(
      { error: "미션 정보 로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
