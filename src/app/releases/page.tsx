import type { Metadata } from "next";
import Link from "next/link";

import { releases } from "@/data/releases";

export const metadata: Metadata = {
  title: "릴리즈 노트",
  description: "RunningCrew의 업데이트 내역을 확인하세요",
};

export default function ReleasesPage() {
  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <h1 className="text-3xl font-bold">릴리즈 노트</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            RunningCrew의 업데이트 내역을 확인하세요
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="space-y-6">
          {releases.map((release) => (
            <Link
              key={release.version}
              href={`/releases/${release.version}`}
              className="block rounded-xl border border-border/60 bg-background p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                      {release.version}
                    </span>
                    <span className="text-sm text-muted-foreground">{release.date}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">{release.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{release.summary}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {release.highlights.map((highlight, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-sm"
                      >
                        <span>{highlight.emoji}</span>
                        <span>{highlight.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
