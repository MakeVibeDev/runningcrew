import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, userId } = await request.json();

    if (!imageUrl || !userId) {
      return NextResponse.json(
        { error: "imageUrl과 userId가 필요합니다." },
        { status: 400 }
      );
    }

    // 외부 이미지 다운로드
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error("이미지 다운로드 실패:", response.statusText);
      return NextResponse.json(
        { error: "이미지 다운로드에 실패했습니다." },
        { status: 500 }
      );
    }

    const blob = await response.blob();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const ext = contentType.split("/")[1] || "jpg";
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const filePath = `avatars/${fileName}`;

    // Supabase Storage에 업로드
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(filePath, blob, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage 업로드 실패:", uploadError);
      return NextResponse.json(
        { error: "Storage 업로드에 실패했습니다." },
        { status: 500 }
      );
    }

    // Public URL 생성
    const { data } = supabase.storage
      .from("profiles")
      .getPublicUrl(filePath);

    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    console.error("아바타 업로드 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
