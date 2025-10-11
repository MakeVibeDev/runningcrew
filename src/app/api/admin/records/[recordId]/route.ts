import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "fallback-secret-key";

type RouteContext = {
  params: Promise<{ recordId: string }>;
};

// GET - 기록 조회
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { recordId } = await context.params;

    // 관리자 토큰 검증
    const token = request.cookies.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "인증되지 않았습니다." }, { status: 401 });
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.admin) {
      return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });
    }

    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // 기록 조회
    const { data, error } = await supabase
      .from("records")
      .select(
        `
        id, recorded_at, distance_km, duration_seconds, pace_seconds_per_km,
        visibility, notes, image_path, created_at,
        profile:profiles!records_profile_id_fkey(id, display_name, avatar_url)
      `
      )
      .eq("id", recordId)
      .single();

    if (error) {
      console.error("기록 조회 에러:", error);
      return NextResponse.json(
        { error: "기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // image_path를 Supabase Storage URL로 변환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = data as any;
    if (record?.image_path && typeof record.image_path === 'string' && !record.image_path.startsWith("http")) {
      const { data: publicUrlData } = supabase.storage
        .from("records-raw")
        .getPublicUrl(record.image_path);
      record.image_path = publicUrlData.publicUrl;
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("GET /api/admin/records/[recordId] 에러:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PATCH - 기록 수정
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { recordId } = await context.params;

    console.log("[PATCH] Record ID:", recordId);

    // 관리자 토큰 검증
    const token = request.cookies.get("admin-token")?.value;

    if (!token) {
      console.log("[PATCH] No admin token found");
      return NextResponse.json({ error: "인증되지 않았습니다." }, { status: 401 });
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.admin) {
      console.log("[PATCH] Not an admin");
      return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });
    }

    // 관리자 클라이언트 사용 (RLS 우회)
    const supabase = createAdminClient();

    // 요청 본문 파싱
    const body = await request.json();
    console.log("[PATCH] Request body:", body);

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

    console.log("[PATCH] Update data:", updateData);

    const { data, error } = await supabase
      .from("records")
      .update(updateData as never)
      .eq("id", recordId)
      .select();

    console.log("[PATCH] Update result:", { data, error });

    if (error) {
      console.error("기록 수정 에러:", error);
      return NextResponse.json(
        { error: "기록 수정에 실패했습니다.", details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.error("[PATCH] No rows updated");
      return NextResponse.json(
        { error: "기록을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: data[0] });
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
    const { recordId } = await context.params;

    // 관리자 토큰 검증
    const token = request.cookies.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "인증되지 않았습니다." }, { status: 401 });
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.admin) {
      return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });
    }

    // 관리자 클라이언트 사용 (RLS 우회)
    const supabase = createAdminClient();

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
