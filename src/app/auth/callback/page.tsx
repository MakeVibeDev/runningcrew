"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";
import { reportSupabaseError } from "@/lib/error-reporter";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client, refreshProfile } = useSupabase();
  const [message, setMessage] = useState("인증 처리 중입니다...");

  useEffect(() => {
    const queryCode = searchParams?.get("code");
    const errorDescription = searchParams?.get("error_description");

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const hashCode = hashParams.get("code");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    const code = queryCode ?? hashCode;

    if (errorDescription) {
      setMessage(`로그인에 실패했습니다: ${errorDescription}`);
      return;
    }

    const syncProfile = async () => {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError) {
        console.error("사용자 정보를 가져오지 못했습니다.", userError);
        return;
      }
      const user = userData.user;
      if (!user) return;

      const metadata = user.user_metadata as Record<string, unknown>;
      const displayName =
        (metadata?.nickname as string | undefined) ||
        (metadata?.name as string | undefined) ||
        (metadata?.full_name as string | undefined) ||
        user.email?.split("@")[0] ||
        "러너";
      const avatarUrl =
        (metadata?.profile_image_url as string | undefined) ||
        (metadata?.thumbnail_image_url as string | undefined) ||
        (metadata?.picture as string | undefined) ||
        (metadata?.avatar_url as string | undefined) ||
        null;

      const { error: upsertError } = await client
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
        } as never);

      if (upsertError) {
        console.error("프로필 동기화 실패", upsertError);

        // Report to Slack
        await reportSupabaseError(upsertError, "Profile Upsert Failed in Auth Callback", {
          userId: user.id,
          userEmail: user.email,
          userName: displayName,
          metadata: {
            hasAvatarUrl: !!avatarUrl,
          },
        });
      } else {
        console.log("프로필 동기화 성공:", user.id, displayName);
      }
    };

    const handleSuccess = async () => {
      setMessage("로그인에 성공했습니다. 리다이렉트 중...");
      await syncProfile();
      await refreshProfile();

      // Get user ID for redirect
      const { data: userData } = await client.auth.getUser();
      const userId = userData.user?.id;

      setTimeout(() => {
        if (userId) {
          router.replace(`/profile/${userId}`);
        } else {
          router.replace("/");
        }
      }, 400);
    };

    if (code) {
      client.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            setMessage(`세션 교환에 실패했습니다: ${error.message}`);
            return;
          }
          handleSuccess().catch((error) => {
            console.error("콜백 처리 중 오류", error);
            setMessage("로그인 처리 중 문제가 발생했습니다.");
          });
        })
        .catch((error) => {
          setMessage(
            `예상치 못한 오류가 발생했습니다: ${error instanceof Error ? error.message : "unknown"}`,
          );
        });
      return;
    }

    if (accessToken && refreshToken) {
      client.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        .then(({ error }) => {
          if (error) {
            setMessage(`세션 설정에 실패했습니다: ${error.message}`);
            return;
          }
          handleSuccess().catch((error) => {
            console.error("콜백 처리 중 오류", error);
            setMessage("로그인 처리 중 문제가 발생했습니다.");
          });
        })
        .catch((error) => {
          setMessage(
            `예상치 못한 오류가 발생했습니다: ${error instanceof Error ? error.message : "unknown"}`,
          );
        });
      return;
    }

    setMessage("로그인 코드가 전달되지 않았습니다. 다시 시도해주세요.");
  }, [client, refreshProfile, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-6">
      <div className="max-w-md rounded-2xl border border-border/60 bg-background p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">RunningCrew 로그인</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/50 px-6">
        <div className="max-w-md rounded-2xl border border-border/60 bg-background p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">RunningCrew 로그인</h1>
          <p className="mt-3 text-sm text-muted-foreground">인증 처리 중입니다...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
