"use client";

import { useState, useRef, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface CommentInputProps {
  entityType: "record" | "profile" | "crew_intro" | "mission" | "announcement";
  entityId: string;
  onCommentAdded: (comment: any) => void;
  placeholder?: string;
}

export function CommentInput({
  entityType,
  entityId,
  onCommentAdded,
  placeholder = "댓글을 남겨보세요...",
}: CommentInputProps) {
  const { user, client } = useSupabase();
  const [content, setContent] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mention autocomplete state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState<Profile[]>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const maxLength = 1000;
  const remainingChars = maxLength - content.length;

  // Search users for mention autocomplete
  useEffect(() => {
    if (!mentionQuery || mentionQuery.length < 2) {
      setMentionUsers([]);
      return;
    }

    const searchUsers = async () => {
      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(mentionQuery)}&limit=5`
        );
        if (response.ok) {
          const data = await response.json();
          setMentionUsers(data.users || []);
        }
      } catch (error) {
        console.error("사용자 검색 실패:", error);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [mentionQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= maxLength) {
      setContent(newContent);

      const textarea = e.target;
      const cursorPos = textarea.selectionStart;
      setCursorPosition(cursorPos);

      // Check if user typed @ to trigger mention autocomplete
      const textBeforeCursor = newContent.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

        // Check if there's a space after @, if so, close mention
        if (textAfterAt.includes(" ") || textAfterAt.includes("\n")) {
          setShowMentions(false);
          setMentionQuery("");
        } else {
          setShowMentions(true);
          setMentionQuery(textAfterAt);
          setSelectedMentionIndex(0);
        }
      } else {
        setShowMentions(false);
        setMentionQuery("");
      }
    }
  };

  const insertMention = (user: Profile) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    const displayName = user.display_name;
    const beforeAt = content.substring(0, lastAtIndex);
    const afterCursor = textAfterCursor;

    const newContent = `${beforeAt}@${displayName} ${afterCursor}`;
    setContent(newContent);

    // Add user ID to mentions array
    if (!mentions.includes(user.id)) {
      setMentions([...mentions, user.id]);
    }

    setShowMentions(false);
    setMentionQuery("");

    // Focus back on textarea
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = lastAtIndex + displayName.length + 2; // +2 for @ and space
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && mentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < mentionUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : mentionUsers.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        insertMention(mentionUsers[selectedMentionIndex]);
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+Enter or Cmd+Enter to submit
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting || !user) return;

    setIsSubmitting(true);

    try {
      // Insert comment directly using Supabase client
      const { data: comment, error } = await client
        .from("comments")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          profile_id: user.id,
          content: content.trim(),
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

      if (comment) {
        onCommentAdded(comment);
        setContent("");
        setMentions([]);
      }
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      alert("댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        댓글을 작성하려면 로그인해주세요.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="border rounded-lg bg-background">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-transparent border-none outline-none resize-none min-h-[80px] max-h-[200px]"
          disabled={isSubmitting}
        />

        {/* Mention autocomplete dropdown */}
        {showMentions && mentionUsers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 w-full max-w-xs bg-background border rounded-lg shadow-lg overflow-hidden z-50">
            {mentionUsers.map((user, index) => (
              <button
                key={user.id}
                onClick={() => insertMention(user)}
                className={`w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2 ${
                  index === selectedMentionIndex ? "bg-accent" : ""
                }`}
              >
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {user.display_name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2 border-t">
          <div className="text-xs text-muted-foreground">
            {remainingChars < 100 && (
              <span className={remainingChars < 0 ? "text-destructive" : ""}>
                {remainingChars}자 남음
              </span>
            )}
            <span className="ml-2 text-muted-foreground/60">
              Tip: @ 입력으로 멘션, Ctrl+Enter로 전송
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting || remainingChars < 0}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {isSubmitting ? "작성 중..." : "댓글 작성"}
          </button>
        </div>
      </div>
    </div>
  );
}
