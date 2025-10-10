import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

type RouteContext = {
  params: Promise<{ recordId: string }>;
};

// PATCH - 기록 수정
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { recordId } = await context.params;

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증되지 않았습니다." }, { status: 401 });
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from("profiles")
      .select("crew_role")
      .eq("id", user.id)
      .single<{ crew_role: string }>();

    if (!profile || profile.crew_role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 요청 본문 파싱
    const body = await request.json();
    const {
      recorded_at,
      distance_km,
      duration_seconds,
      pace_seconds_per_km,
      visibility,
      notes,
    } = body;

    // 기록 업데이트
    const updateData = {
      recorded_at,
      distance_km: parseFloat(distance_km),
      duration_seconds: parseInt(duration_seconds),
      pace_seconds_per_km: pace_seconds_per_km ? parseInt(pace_seconds_per_km) : null,
      visibility,
      notes,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("records")
      .update(updateData as never)
      .eq("id", recordId)
      .select()
      .single();

    if (error) {
      console.error("기록 수정 에러:", error);
      return NextResponse.json(
        { error: "기록 수정에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("PATCH /api/admin/records/[recordId] 에러:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE - 기록 삭제
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { recordId } = await context.params;

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증되지 않았습니다." }, { status: 401 });
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from("profiles")
      .select("crew_role")
      .eq("id", user.id)
      .single<{ crew_role: string }>();

    if (!profile || profile.crew_role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 기록 삭제
    const { error } = await supabase.from("records").delete().eq("id", recordId);

    if (error) {
      console.error("기록 삭제 에러:", error);
      return NextResponse.json(
        { error: "기록 삭제에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/records/[recordId] 에러:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
