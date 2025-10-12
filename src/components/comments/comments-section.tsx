"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { CommentItem } from "./comment-item";
import { CommentInput } from "./comment-input";

interface Comment {
  id: string;
  content: string;
  mentions: string[] | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  isLikedByUser?: boolean;
}

interface CommentsSectionProps {
  entityType: "record" | "profile" | "crew_intro" | "mission" | "announcement";
  entityId: string;
  onCountChange?: (count: number) => void;
}

export function CommentsSection({ entityType, entityId, onCountChange }: CommentsSectionProps) {
  const { user } = useSupabase();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [entityType, entityId]);

  const loadComments = async () => {
    try {
      const response = await fetch(
        `/api/comments?entityType=${entityType}&entityId=${entityId}`
      );
      if (response.ok) {
        const data = await response.json();
        const loadedComments = data.comments || [];
        setComments(loadedComments);
        onCountChange?.(loadedComments.length);
      }
    } catch (error) {
      console.error("댓글 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentAdded = (newComment: Comment) => {
    const updatedComments = [newComment, ...comments];
    setComments(updatedComments);
    onCountChange?.(updatedComments.length);
  };

  const handleCommentDeleted = (commentId: string) => {
    const updatedComments = comments.filter((c) => c.id !== commentId);
    setComments(updatedComments);
    onCountChange?.(updatedComments.length);
  };

  const handleCommentUpdated = (updatedComment: Comment) => {
    setComments(
      comments.map((c) => (c.id === updatedComment.id ? updatedComment : c))
    );
  };

  const handleCommentLikeToggle = (commentId: string, isLiked: boolean, newCount: number) => {
    setComments(
      comments.map((c) =>
        c.id === commentId
          ? { ...c, isLikedByUser: isLiked, likes_count: newCount }
          : c
      )
    );
  };

  if (loading) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        댓글 로딩 중...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 댓글 입력 */}
      {user && (
        <CommentInput
          entityType={entityType}
          entityId={entityId}
          onCommentAdded={handleCommentAdded}
        />
      )}

      {/* 댓글 목록 */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            첫 댓글을 남겨보세요!
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              onDeleted={handleCommentDeleted}
              onUpdated={handleCommentUpdated}
              onLikeToggle={handleCommentLikeToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
