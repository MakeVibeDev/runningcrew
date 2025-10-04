import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Toggle like on a record
 * Returns true if liked, false if unliked
 */
export async function toggleRecordLike(
  supabase: SupabaseClient,
  recordId: string,
  userId: string
): Promise<{ liked: boolean; error: string | null }> {
  try {
    // Check if already liked
    const { data: existing, error: checkError } = await supabase
      .from("record_likes")
      .select("id")
      .eq("record_id", recordId)
      .eq("profile_id", userId)
      .maybeSingle();

    if (checkError) {
      return { liked: false, error: checkError.message };
    }

    if (existing) {
      // Unlike
      const { error: deleteError } = await supabase
        .from("record_likes")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        return { liked: false, error: deleteError.message };
      }

      return { liked: false, error: null };
    } else {
      // Like
      const { error: insertError } = await supabase
        .from("record_likes")
        .insert({
          record_id: recordId,
          profile_id: userId,
        });

      if (insertError) {
        return { liked: false, error: insertError.message };
      }

      return { liked: true, error: null };
    }
  } catch (err) {
    console.error("좋아요 토글 실패:", err);
    return { liked: false, error: "좋아요 처리 중 오류가 발생했습니다." };
  }
}

/**
 * Check if user has liked a record
 */
export async function checkRecordLike(
  supabase: SupabaseClient,
  recordId: string,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from("record_likes")
      .select("id")
      .eq("record_id", recordId)
      .eq("profile_id", userId)
      .maybeSingle();

    if (error) {
      console.error("좋아요 확인 실패:", error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error("좋아요 확인 실패:", err);
    return false;
  }
}

/**
 * Get record likes count
 */
export async function getRecordLikesCount(
  supabase: SupabaseClient,
  recordId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("record_likes")
      .select("*", { count: "exact", head: true })
      .eq("record_id", recordId);

    if (error) {
      console.error("좋아요 수 조회 실패:", error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error("좋아요 수 조회 실패:", err);
    return 0;
  }
}

/**
 * Get comments for a record
 */
export async function getRecordComments(
  supabase: SupabaseClient,
  recordId: string
) {
  try {
    const { data, error } = await supabase
      .from("record_comments")
      .select(
        `
        id,
        content,
        created_at,
        updated_at,
        profile:profile_id(id, display_name, avatar_url)
      `
      )
      .eq("record_id", recordId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("댓글 조회 실패:", error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error("댓글 조회 실패:", err);
    return { data: [], error: "댓글을 불러오는 중 오류가 발생했습니다." };
  }
}

/**
 * Create a comment on a record
 */
export async function createRecordComment(
  supabase: SupabaseClient,
  recordId: string,
  userId: string,
  content: string
) {
  try {
    const { data, error } = await supabase
      .from("record_comments")
      .insert({
        record_id: recordId,
        profile_id: userId,
        content: content.trim(),
      })
      .select(
        `
        id,
        content,
        created_at,
        updated_at,
        profile:profile_id(id, display_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("댓글 작성 실패:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error("댓글 작성 실패:", err);
    return { data: null, error: "댓글 작성 중 오류가 발생했습니다." };
  }
}

/**
 * Update a comment
 */
export async function updateRecordComment(
  supabase: SupabaseClient,
  commentId: string,
  content: string
) {
  try {
    const { data, error } = await supabase
      .from("record_comments")
      .update({ content: content.trim() })
      .eq("id", commentId)
      .select(
        `
        id,
        content,
        created_at,
        updated_at,
        profile:profile_id(id, display_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("댓글 수정 실패:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error("댓글 수정 실패:", err);
    return { data: null, error: "댓글 수정 중 오류가 발생했습니다." };
  }
}

/**
 * Delete a comment
 */
export async function deleteRecordComment(
  supabase: SupabaseClient,
  commentId: string
) {
  try {
    const { error } = await supabase
      .from("record_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("댓글 삭제 실패:", error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    console.error("댓글 삭제 실패:", err);
    return { error: "댓글 삭제 중 오류가 발생했습니다." };
  }
}

/**
 * Get record comments count
 */
export async function getRecordCommentsCount(
  supabase: SupabaseClient,
  recordId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("record_comments")
      .select("*", { count: "exact", head: true })
      .eq("record_id", recordId);

    if (error) {
      console.error("댓글 수 조회 실패:", error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error("댓글 수 조회 실패:", err);
    return 0;
  }
}
