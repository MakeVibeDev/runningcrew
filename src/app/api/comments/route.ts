import { createClient } from "@/lib/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

// GET - Fetch comments for an entity
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const searchParams = request.nextUrl.searchParams;

    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    // Fetch comments with profile information
    const { data: comments, error } = await supabase
      .from("comments")
      .select(
        `
        *,
        profiles:profile_id (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get current user to check if they liked each comment
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Fetch user's likes for these comments
      const commentIds = comments?.map((c) => c.id) || [];
      const { data: userLikes } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .in("comment_id", commentIds)
        .eq("profile_id", user.id);

      const likedCommentIds = new Set(userLikes?.map((l) => l.comment_id));

      return NextResponse.json({
        comments: comments?.map((c) => ({
          ...c,
          isLikedByUser: likedCommentIds.has(c.id),
        })),
      });
    }

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "댓글을 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// POST - Create a new comment
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("POST /api/comments - user:", user?.id, "authError:", authError);

    if (!user) {
      console.log("POST /api/comments - No user found, returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entityType, entityId, content, mentions } = body;

    if (!entityType || !entityId || !content) {
      return NextResponse.json(
        { error: "entityType, entityId, and content are required" },
        { status: 400 }
      );
    }

    // Insert comment
    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        profile_id: user.id,
        content,
        mentions: mentions || [],
      })
      .select(
        `
        *,
        profiles:profile_id (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "댓글 작성에 실패했습니다" },
      { status: 500 }
    );
  }
}
