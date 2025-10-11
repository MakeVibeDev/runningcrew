import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "fallback-secret-key";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: "토큰이 없습니다." },
        { status: 401 }
      );
    }

    // JWT 검증
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.admin) {
      return NextResponse.json(
        { authenticated: false, error: "관리자 권한이 없습니다." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      username: payload.username,
    });
  } catch (error) {
    console.error("세션 검증 오류:", error);
    return NextResponse.json(
      { authenticated: false, error: "유효하지 않은 토큰입니다." },
      { status: 401 }
    );
  }
}
