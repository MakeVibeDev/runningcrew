import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 외부 URL의 이미지를 다운로드하여 Supabase Storage에 업로드합니다.
 * 서버 API를 통해 프록시 방식으로 처리하여 CORS 문제를 회피합니다.
 * @param supabase - Supabase 클라이언트 (사용하지 않음, 호환성 유지)
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
    // 서버 API를 통해 업로드
    const response = await fetch("/api/upload-avatar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl, userId }),
    });

    if (!response.ok) {
      console.error("아바타 업로드 API 실패:", response.statusText);
      return null;
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("아바타 업로드 중 오류:", error);
    return null;
  }
}
