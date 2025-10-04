"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"] as const;
const MAX_FILE_MB = 2;

type CrewProfileEditorProps = {
  crewId: string;
  ownerId: string;
  defaultRegion: string;
  defaultLogoUrl: string | null;
};

export function CrewProfileEditor({ crewId, ownerId, defaultRegion, defaultLogoUrl }: CrewProfileEditorProps) {
  const router = useRouter();
  const { user, client } = useSupabase();
  const [region, setRegion] = useState(defaultRegion);
  const [logoPreview, setLogoPreview] = useState<string | null>(defaultLogoUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setRegion(defaultRegion);
    setLogoPreview(defaultLogoUrl);
    setLogoFile(null);
    setRemoveLogo(false);
  }, [defaultLogoUrl, defaultRegion]);

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  if (!user || user.id !== ownerId) {
    return null;
  }

  const canSubmit = region.trim().length > 1 && !isPending;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoFile(null);
      setLogoPreview(defaultLogoUrl);
      setRemoveLogo(false);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type as typeof ACCEPTED_TYPES[number])) {
      setError("PNG, JPG, JPEG, WEBP 형식의 이미지만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`이미지 크기는 ${MAX_FILE_MB}MB 이하만 허용됩니다.`);
      return;
    }

    setError(null);
    setRemoveLogo(false);
    if (logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
  };

  const handleRemoveLogo = () => {
    if (logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setMessage(null);
    setError(null);

    startTransition(async () => {
      let newLogoUrl = defaultLogoUrl;

      if (removeLogo) {
        newLogoUrl = null;
      }

      if (logoFile) {
        const storagePath = `crew-assets/${user.id}/${Date.now()}_${logoFile.name}`;
        const { error: uploadError } = await client.storage
          .from("crew-assets")
          .upload(storagePath, logoFile, {
            upsert: true,
            contentType: logoFile.type,
          });

        if (uploadError) {
          console.error("로고 업로드 실패", uploadError);
          setError("로고 이미지를 업로드하지 못했습니다. 잠시 후 다시 시도해주세요.");
          return;
        }

        const { data: publicUrl } = client.storage.from("crew-assets").getPublicUrl(storagePath);
        newLogoUrl = publicUrl.publicUrl;
      }

      const { error: updateError } = await client
        .from("crews")
        .update({
          activity_region: region.trim(),
          logo_image_url: newLogoUrl,
        } as never)
        .eq("id", crewId);

      if (updateError) {
        console.error("크루 기본 정보 업데이트 실패", updateError);
        setError("크루 정보를 저장하는 중 문제가 발생했습니다.");
        return;
      }

      setMessage("크루 정보가 저장되었습니다.");
      setLogoFile(null);
      setRemoveLogo(false);
      setTimeout(() => {
        router.refresh();
      }, 400);
    });
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setOpen((prev) => !prev);
            setMessage(null);
            setError(null);
            if (!open) {
              setRegion(defaultRegion);
              setLogoPreview(defaultLogoUrl);
              setLogoFile(null);
              setRemoveLogo(false);
            }
          }}
          className="rounded-full border border-border px-4 py-1 text-xs font-medium hover:bg-muted"
        >
          {open ? "설정 닫기" : "기본 정보 설정"}
        </button>
      </div>

      {!open ? null : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-5 text-sm"
        >
          <div className="flex items-center justify-between">
            <p className="font-medium text-foreground">크루 기본 정보 관리</p>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-full bg-foreground px-4 py-1 text-xs font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "저장 중..." : "변경 사항 저장"}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="crew-logo-edit">
                크루 로고 이미지
              </label>
              <div className="flex flex-col gap-3">
            <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-border/60 bg-muted">
              {logoPreview ? (
                <Image src={logoPreview} alt="로고 미리보기" fill className="object-cover" unoptimized />
              ) : (
                <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                  로고 없음
                </div>
              )}
            </div>
            <input
              id="crew-logo-edit"
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleFileChange}
              className="w-full rounded-xl border border-dashed border-border/60 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>PNG/JPG/WEBP · 최대 {MAX_FILE_MB}MB</span>
              {logoPreview ? (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-orange-600 hover:underline"
                >
                  로고 제거
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="crew-region-edit">
              활동 지역
            </label>
            <input
              id="crew-region-edit"
              type="text"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="예: 서울 송파구 잠실동"
              required
            />
            <p className="text-xs text-muted-foreground">주요 집결 장소나 활동 코스를 한 줄로 요약해주세요.</p>
          </div>
        </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-100/40 px-3 py-2 text-xs text-rose-600">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl border border-orange-200 bg-orange-100/40 px-3 py-2 text-xs text-orange-700">
              {message}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
