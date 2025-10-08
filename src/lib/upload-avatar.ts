import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 외부 URL의 이미지를 다운로드하여 Supabase Storage에 업로드합니다.
 * @param supabase - Supabase 클라이언트
 * @param imageUrl - 외부 이미지 URL
 * @param userId - 사용자 ID
 * @returns 업로드된 이미지의 public URL 또는 null
 */
export async function uploadAvatarFromUrl(
  supabase: SupabaseClient,
  imageUrl: string,
  userId: string
): Promise<string | null> {
  try {
    // 외부 이미지를 fetch
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error("이미지 다운로드 실패:", response.statusText);
      return null;
    }

    const blob = await response.blob();

    // 이미지 타입 확인
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // 파일명 생성 (확장자 추출)
    const ext = contentType.split("/")[1] || "jpg";
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const filePath = `avatars/${fileName}`;

    // Supabase Storage에 업로드
    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(filePath, blob, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage 업로드 실패:", uploadError);
      return null;
    }

    // Public URL 생성
    const { data } = supabase.storage
      .from("profiles")
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("아바타 업로드 중 오류:", error);
    return null;
  }
}
