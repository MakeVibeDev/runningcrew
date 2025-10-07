"use client";

import Link from "next/link";
import { useState } from "react";

import { FeedbackModal } from "@/components/feedback-modal";

export function SiteFooter() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex flex-col gap-1">
              <p>
                <Link
                  href="https://makevibe.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  주식회사 메이크바이브 🚀
                </Link>
              </p>
              <p>대표이사: 안계준</p>
              <p>사업자등록번호: 821-81-03776</p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="버그 및 문의하기"
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span className="whitespace-pre-line leading-tight">버그 및{'\n'}문의하기</span>
            </button>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-border/20 pt-2 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2025 MakeVibe Inc. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </footer>
  );
}
