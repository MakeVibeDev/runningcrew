"use client";

import { useEffect, useState, useTransition } from "react";

import { useSupabase } from "@/components/providers/supabase-provider";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useSupabase();
  const [type, setType] = useState<"bug" | "suggestion">("bug");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    // Blur any active input before closing
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      // Blur any focused input to prevent mobile zoom issues
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      document.body.style.overflow = "unset";

      // Reset viewport zoom on mobile
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        const content = viewport.getAttribute('content');
        viewport.setAttribute('content', content || '');
      }

      // Reset form when closed
      setTimeout(() => {
        setType("bug");
        setContent("");
        setError(null);
        setSuccess(false);
      }, 300);
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError("내용을 입력해주세요.");
      return;
    }

    startTransition(async () => {
      setError(null);

      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            content: content.trim(),
            userEmail: user?.email || "비로그인 사용자",
            userName: user?.user_metadata?.name || "익명",
            userId: user?.id || null,
            userAgent: navigator.userAgent,
            url: window.location.href,
          }),
        });

        if (!response.ok) {
          throw new Error("피드백 전송에 실패했습니다.");
        }

        setSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 1500);
      } catch (err) {
        console.error("피드백 전송 실패:", err);
        setError("피드백 전송에 실패했습니다. 다시 시도해주세요.");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border/60 bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">피드백 보내기</h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Success Message */}
        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="mb-2 text-4xl">✅</div>
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">
              피드백이 전송되었습니다!
            </p>
            <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-500">
              소중한 의견 감사합니다.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">분류</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setType("bug")}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
                    type === "bug"
                      ? "border-red-500 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  🐛 버그 제보
                </button>
                <button
                  type="button"
                  onClick={() => setType("suggestion")}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
                    type === "suggestion"
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  💡 개선 의견
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label htmlFor="feedback-content" className="text-sm font-semibold text-foreground">
                내용
              </label>
              <textarea
                id="feedback-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder={
                  type === "bug"
                    ? "발견하신 버그를 자세히 설명해주세요.\n예) 어떤 상황에서 발생했나요? 재현 방법은?"
                    : "개선하면 좋을 점을 알려주세요.\n예) 어떤 기능이 필요한가요? 불편한 점은?"
                }
                className="w-full rounded-lg border border-border/60 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                maxLength={1000}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                required
              />
              <p className="text-xs text-muted-foreground">
                {content.length}/1000자
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending || !content.trim()}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "전송 중..." : "피드백 전송"}
            </button>

            {/* Info */}
            <p className="text-xs text-muted-foreground">
              {user ? `로그인 정보와 함께 전송됩니다 (${user.email})` : "비로그인 사용자로 전송됩니다"}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
