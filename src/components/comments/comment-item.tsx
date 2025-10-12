"use client";

import { useState, useRef, useEffect } from "react";
import { Heart, MoreVertical, Pencil, Trash2 } from "lucide-react";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  content: string;
  mentions: string[] | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
  profiles: Profile;
  isLikedByUser?: boolean;
}

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  onDeleted: (commentId: string) => void;
  onUpdated: (updatedComment: Comment) => void;
  onLikeToggle: (commentId: string, isLiked: boolean, newCount: number) => void;
}

export function CommentItem({
  comment,
  currentUserId,
  onDeleted,
  onUpdated,
  onLikeToggle,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUserId === comment.profiles.id;
  const displayName = comment.profiles.display_name || "Anonymous";

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleLikeToggle = async () => {
    if (isLiking || !currentUserId) return;

    setIsLiking(true);

    try {
      const method = comment.isLikedByUser ? "DELETE" : "POST";
      const response = await fetch(`/api/comments/${comment.id}/like`, {
        method,
        credentials: "include",
      });

      if (response.ok) {
        const newIsLiked = !comment.isLikedByUser;
        const newCount = comment.likes_count + (newIsLiked ? 1 : -1);
        onLikeToggle(comment.id, newIsLiked, newCount);
      } else {
        const error = await response.json();
        alert(error.error || "좋아요 처리 실패");
      }
    } catch (error) {
      console.error("좋아요 처리 실패:", error);
      alert("좋아요 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLiking(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || isUpdating) return;

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: editContent.trim(),
          mentions: comment.mentions, // Keep existing mentions for now
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onUpdated(data.comment);
        setIsEditing(false);
      } else {
        const error = await response.json();
        alert(error.error || "댓글 수정 실패");
      }
    } catch (error) {
      console.error("댓글 수정 실패:", error);
      alert("댓글 수정 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;

    if (!confirm("정말 이 댓글을 삭제하시겠습니까?")) {
      return;
    }

    setIsDeleting(true);
    setShowMenu(false);

    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        onDeleted(comment.id);
      } else {
        const error = await response.json();
        alert(error.error || "댓글 삭제 실패");
      }
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      alert("댓글 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "방금 전";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;

    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Render content with highlighted mentions
  const renderContent = (content: string) => {
    // Simple mention highlighting (matches @username pattern)
    const mentionRegex = /@(\S+)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, index) => {
      // Odd indices are the captured groups (usernames)
      if (index % 2 === 1) {
        return (
          <span key={index} className="text-primary font-bold">
            @{part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {comment.profiles.avatar_url ? (
          <img
            src={comment.profiles.avatar_url}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{displayName}</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(comment.created_at)}
          </span>
          {comment.created_at !== comment.updated_at && (
            <span className="text-xs text-muted-foreground">(수정됨)</span>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 border rounded-md resize-none min-h-[60px] bg-background"
              maxLength={1000}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={!editContent.trim() || isUpdating}
                className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
              >
                {isUpdating ? "저장 중..." : "저장"}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isUpdating}
                className="px-3 py-1 border rounded-md text-sm"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap break-words">
              {renderContent(comment.content)}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={handleLikeToggle}
                disabled={isLiking || !currentUserId}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  comment.isLikedByUser
                    ? "text-red-500"
                    : "text-muted-foreground hover:text-red-500"
                } disabled:opacity-50`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    comment.isLikedByUser ? "fill-current" : ""
                  }`}
                />
                {comment.likes_count > 0 && (
                  <span>{comment.likes_count}</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Menu for owner */}
      {isOwner && !isEditing && (
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-accent rounded transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-background border rounded-lg shadow-lg overflow-hidden z-50">
              <button
                onClick={handleEdit}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
              >
                <Pencil className="w-3 h-3" />
                수정
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2 text-destructive disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
