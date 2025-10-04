"use client";

import Image from "next/image";

import { useSupabase } from "@/components/providers/supabase-provider";

export function UserGreeting() {
  const { loading, user, profile } = useSupabase();

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
        <div className="space-y-1">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <p className="text-sm font-medium text-muted-foreground">RunningCrew Preview</p>
        <h1 className="text-lg font-semibold">대시보드 (가상 데이터)</h1>
      </div>
    );
  }

  const displayName = profile?.display_name || user.email || "러너";
  const avatarUrl = profile?.avatar_url || (user.user_metadata?.avatar_url as string | undefined);
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border/60 bg-muted text-sm font-semibold uppercase text-muted-foreground">
        {avatarUrl ? (
          <Image src={avatarUrl} alt={`${displayName} avatar`} fill sizes="40px" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-orange-500/10 text-orange-700">
            {initials}
          </div>
        )}
      </div>
      <div>
        {/* <p className="text-xs font-medium text-muted-foreground">환영합니다</p> */}
        <h1 className="text-lg font-semibold">{displayName}님의 대시보드</h1>
      </div>
    </div>
  );
}
