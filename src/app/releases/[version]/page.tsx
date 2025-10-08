import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getReleaseByVersion, releases } from "@/data/releases";
import { ReleaseInteractions } from "@/components/release/release-interactions";

interface PageProps {
  params: Promise<{
    version: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { version } = await params;
  const release = getReleaseByVersion(version);

  if (!release) {
    return {
      title: "릴리즈를 찾을 수 없습니다",
    };
  }

  return {
    title: `${release.version} - ${release.title}`,
    description: release.summary,
  };
}

export async function generateStaticParams() {
  return releases.map((release) => ({
    version: release.version,
  }));
}

export default async function ReleaseDetailPage({ params }: PageProps) {
  const { version } = await params;
  const release = getReleaseByVersion(version);

  if (!release) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <Link
            href="/releases"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            릴리즈 목록으로
          </Link>

          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
              {release.version}
            </span>
            <span className="text-sm text-muted-foreground">{release.date}</span>
          </div>

          <h1 className="mt-3 text-3xl font-bold">{release.title}</h1>
          <p className="mt-2 text-muted-foreground">{release.summary}</p>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="space-y-8">
          {/* Highlights */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">주요 업데이트</h2>
            <div className="flex flex-wrap gap-3">
              {release.highlights.map((highlight, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-4 py-3 shadow-sm"
                >
                  <span className="text-2xl">{highlight.emoji}</span>
                  <span className="font-medium">{highlight.text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Features */}
          {release.features.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">새로운 기능</h2>
              <div className="space-y-4">
                {release.features.map((feature, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-border/60 bg-background p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{feature.emoji}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold">{feature.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Improvements */}
          {release.improvements.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">개선 사항</h2>
              <div className="space-y-4">
                {release.improvements.map((improvement, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-border/60 bg-background p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{improvement.emoji}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold">{improvement.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {improvement.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Fixes */}
          {release.fixes.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">버그 수정</h2>
              <div className="space-y-4">
                {release.fixes.map((fix, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-border/60 bg-background p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{fix.emoji}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold">{fix.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {fix.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Interactions Section */}
      <ReleaseInteractions releaseVersion={release.version} />
    </div>
  );
}
