"use client";

import Link from "next/link";

export function FeedbackButton() {
  return (
    <Link
      href="/records/upload"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition hover:bg-orange-600 hover:scale-110 active:scale-95"
      aria-label="기록 추가"
      title="기록 추가"
    >
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    </Link>
  );
}
