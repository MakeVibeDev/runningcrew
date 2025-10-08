"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Avatar } from "@/components/ui/avatar";
import { reportSupabaseError } from "@/lib/error-reporter";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profile: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface CommentData {
  id: string;
  content: string;
  created_at: string;
  profile:
    | {
        id: string;
        display_name: string;
        avatar_url: string | null;
      }
    | {
        id: string;
        display_name: string;
        avatar_url: string | null;
      }[];
}

interface ReleaseInteractionsProps {
  releaseVersion: string;
}

export function ReleaseInteractions({ releaseVersion }: ReleaseInteractionsProps) {
  const router = useRouter();
  const { client, user } = useSupabase();
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load likes count
      const { count: likesCount } = await client
        .from("release_likes")
        .select("*", { count: "exact", head: true })
        .eq("release_version", releaseVersion);

      setLikesCount(likesCount || 0);

      // Check if current user liked
      if (user) {
        const { data: userLike } = await client
          .from("release_likes")
          .select("id")
          .eq("release_version", releaseVersion)
          .eq("profile_id", user.id)
          .maybeSingle();

        setIsLiked(!!userLike);
      }

      // Load comments
      const { data: commentsData, error: commentsError } = await client
        .from("release_comments")
        .select(`
          id,
          content,
          created_at,
          profile:profiles(id, display_name, avatar_url)
        `)
        .eq("release_version", releaseVersion)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      setComments(
        ((commentsData as CommentData[]) || []).map((c: CommentData) => ({
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          profile: Array.isArray(c.profile) ? c.profile[0] : c.profile,
        }))
      );
    } catch (error) {
      console.error("Failed to load release interactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseVersion, user]);

  const handleLike = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        const { error } = await client
          .from("release_likes")
          .delete()
          .eq("release_version", releaseVersion)
          .eq("profile_id", user.id);

        if (error) throw error;

        setIsLiked(false);
        setLikesCount((prev) => prev - 1);
      } else {
        // Like
        const { error } = await client
          .from("release_likes")
          .insert({
            release_version: releaseVersion,
            profile_id: user.id,
          } as never);

        if (error) throw error;

        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      await reportSupabaseError(error, "Release Like Toggle Failed", {
        userId: user.id,
        userEmail: user.email,
        metadata: { releaseVersion },
      });
      alert("좋아요 처리에 실패했습니다.");
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: commentData, error } = await client
        .from("release_comments")
        .insert({
          release_version: releaseVersion,
          profile_id: user.id,
          content: newComment.trim(),
        } as never)
        .select(`
          id,
          content,
          created_at,
          profile:profiles(id, display_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Add new comment to the top
      const data = commentData as CommentData;
      const newCommentObj: Comment = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        profile: Array.isArray(data.profile) ? data.profile[0] : data.profile,
      };

      setComments([newCommentObj, ...comments]);
      setNewComment("");
      router.refresh();
    } catch (error) {
      console.error("Failed to post comment:", error);
      await reportSupabaseError(error, "Release Comment Post Failed", {
        userId: user.id,
        userEmail: user.email,
        metadata: { releaseVersion },
      });
      alert("댓글 작성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const { error } = await client
        .from("release_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      setComments(comments.filter((c) => c.id !== commentId));
      router.refresh();
    } catch (error) {
      console.error("Failed to delete comment:", error);
      await reportSupabaseError(error, "Release Comment Delete Failed", {
        userId: user?.id,
        userEmail: user?.email,
        metadata: { releaseVersion, commentId },
      });
      alert("댓글 삭제에 실패했습니다.");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;

    return date.toLocaleDateString("ko-KR");
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 pb-16">
        <div className="text-center text-sm text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 pb-16">
      {/* Like Section */}
      <div className="border-t border-border/60 pt-8">
        <button
          onClick={handleLike}
          disabled={!user}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            isLiked
              ? "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950/30 dark:text-orange-400"
              : "border border-border/60 hover:bg-muted"
          } ${!user ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <span className="text-lg">{isLiked ? "❤️" : "🤍"}</span>
          <span>좋아요 {likesCount > 0 && `(${likesCount})`}</span>
        </button>
        {!user && <p className="mt-2 text-xs text-muted-foreground">로그인하면 좋아요를 누를 수 있습니다.</p>}
      </div>

      {/* Comments Section */}
      <div className="mt-8 border-t border-border/60 pt-8">
        <h2 className="mb-4 text-xl font-semibold">
          댓글 {comments.length > 0 && `(${comments.length})`}
        </h2>

        {/* Comment Form */}
        {user ? (
          <form onSubmit={handleCommentSubmit} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="이번 업데이트에 대한 의견을 남겨주세요..."
              className="w-full resize-none rounded-lg border border-border/60 bg-muted/30 p-3 text-sm outline-none focus:border-foreground"
              rows={3}
              disabled={isSubmitting}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? "작성 중..." : "댓글 작성"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-6 rounded-lg border border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            로그인하면 댓글을 작성할 수 있습니다.
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">첫 댓글을 작성해보세요!</p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg border border-border/60 bg-background p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    src={comment.profile.avatar_url}
                    alt={comment.profile.display_name}
                    size="sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{comment.profile.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(comment.created_at)}
                        </p>
                      </div>
                      {user?.id === comment.profile.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
