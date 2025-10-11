import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "fallback-secret-key";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // 환경 변수와 비교
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "사용자 이름 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // JWT 토큰 생성 (24시간 유효)
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT({ admin: true, username })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    // HTTP-only 쿠키로 설정
    const response = NextResponse.json(
      { success: true, message: "로그인 성공" },
      { status: 200 }
    );

    response.cookies.set("admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24시간
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("관리자 로그인 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
