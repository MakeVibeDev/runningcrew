"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadProfileImage } from "@/lib/supabase/rest";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser-client";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useSupabase();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted/40 pb-16">
        <main className="mx-auto max-w-2xl px-6 py-10">
          <p className="text-center text-muted-foreground">로딩 중...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    router.push("/auth/login");
    return null;
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "파일 크기는 5MB 이하여야 합니다." });
      return;
    }

    // 파일 타입 체크
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "이미지 파일만 업로드 가능합니다." });
      return;
    }

    try {
      setUploading(true);
      setMessage(null);
      const url = await uploadProfileImage(user.id, file);
      setAvatarUrl(url);
      setMessage({ type: "success", text: "이미지가 업로드되었습니다." });
    } catch (error) {
      console.error("Failed to upload image:", error);
      setMessage({ type: "error", text: "이미지 업로드에 실패했습니다." });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // display_name이 비어있으면 기본값 사용
      const finalDisplayName = displayName.trim() || user.email?.split("@")[0] || "러너";

      const supabase = getBrowserSupabaseClient();
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const { error } = await (supabase as any).from("profiles").update({
        display_name: finalDisplayName,
        avatar_url: avatarUrl || profile?.avatar_url || null,
      }).eq("id", user.id);
      /* eslint-enable @typescript-eslint/no-explicit-any */

      if (error) {
        throw new Error(`프로필 업데이트 실패: ${error.message}`);
      }

      setMessage({ type: "success", text: "프로필이 저장되었습니다." });

      // 페이지 새로고침하여 프로필 업데이트 반영
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setMessage({ type: "error", text: "프로필 저장에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  };

  const currentAvatarUrl = avatarUrl || profile?.avatar_url || user?.user_metadata?.avatar_url;
  const currentDisplayName = displayName || profile?.display_name || user?.email || "러너";

  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-6 py-6">
          <h1 className="text-3xl font-semibold">프로필 설정</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            프로필 이미지와 닉네임을 변경할 수 있습니다.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>개인 정보</CardTitle>
            <CardDescription>다른 사용자에게 표시되는 정보입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 프로필 이미지 */}
            <div className="space-y-3">
              <label className="text-sm font-medium">프로필 이미지</label>
              <div className="flex items-center gap-6">
                <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-border/60 bg-muted">
                  {currentAvatarUrl ? (
                    <Image
                      src={currentAvatarUrl}
                      alt="프로필"
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-orange-500/10 text-2xl font-bold text-orange-700">
                      {currentDisplayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    {uploading ? "업로드 중..." : "이미지 변경"}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG 형식, 최대 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* 닉네임 */}
            <div className="space-y-3">
              <label htmlFor="displayName" className="text-sm font-medium">
                닉네임
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                다른 사용자에게 표시될 이름입니다.
              </p>
            </div>

            {/* 이메일 (읽기 전용) */}
            <div className="space-y-3">
              <label className="text-sm font-medium">이메일</label>
              <input
                type="email"
                value={user.email || ""}
                disabled
                className="w-full rounded-lg border border-border bg-muted px-4 py-2 text-sm text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                이메일은 변경할 수 없습니다.
              </p>
            </div>

            {/* 메시지 */}
            {message && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* 저장 버튼 */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "저장 중..." : "변경사항 저장"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                취소
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
