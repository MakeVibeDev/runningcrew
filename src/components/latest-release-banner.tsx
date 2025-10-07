"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import { getLatestRelease } from "@/data/releases";

export function LatestReleaseBanner() {
  const [isHidden, setIsHidden] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const release = getLatestRelease();

  useEffect(() => {
    const hidden = localStorage.getItem(`hideRelease_${release.version}`) === "true";
    setIsHidden(hidden);
  }, [release.version]);

  const handleHideChange = (checked: boolean) => {
    localStorage.setItem(`hideRelease_${release.version}`, String(checked));
    if (checked) {
      setIsHidden(true);
    }
  };

  if (isHidden) {
    return null;
  }

  return (
    <section className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-6 shadow-sm dark:border-orange-800 dark:from-orange-950/30 dark:to-orange-900/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-orange-200 px-2.5 py-0.5 text-xs font-semibold text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  {release.version}
                </span>
                <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                  {release.title}
                </h3>
              </div>
              <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                {release.date} 업데이트
              </p>
            </div>
          </div>

          {!isCollapsed && (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {release.highlights.map((highlight, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 rounded-lg border border-orange-300 bg-white/60 px-3 py-1.5 text-sm dark:border-orange-700 dark:bg-orange-950/40"
                  >
                    <span>{highlight.emoji}</span>
                    <span className="text-orange-900 dark:text-orange-100">{highlight.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-4">
                <Link
                  href={`/releases/${release.version}`}
                  className="text-sm font-medium text-orange-700 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
                >
                  자세히 보기 →
                </Link>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-orange-700 dark:text-orange-300">
                  <input
                    type="checkbox"
                    onChange={(e) => handleHideChange(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-orange-300 text-orange-600 focus:ring-orange-500 dark:border-orange-700"
                  />
                  다시 보지 않기
                </label>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex-shrink-0 text-orange-700 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
          aria-label={isCollapsed ? "펼치기" : "접기"}
        >
          <svg
            className={`h-5 w-5 transition-transform ${isCollapsed ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}
