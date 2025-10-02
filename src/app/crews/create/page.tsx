"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";
import { KakaoLoginButton } from "@/components/ui/oauth-button";
import { cn, generateSlug } from "@/lib/utils";

const MIN_NAME_LENGTH = 2;
const MIN_REGION_LENGTH = 2;
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"] as const;
const MAX_LOGO_MB = 2;

type FormState = "idle" | "checking" | "submitting" | "success" | "error";

type SlugState = "idle" | "checking" | "available" | "unavailable";

type FieldErrors = {
  name?: string;
  region?: string;
  slug?: string;
};

export default function CreateCrewPage() {
  const router = useRouter();
  const { user, profile, client, loading, signInWithOAuth, refreshProfile } = useSupabase();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("crew");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  useEffect(() => {
    setSlug(generateSlug(name));
  }, [name]);

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setLogoFile(null);
      setLogoPreview(null);
      setLogoError(null);
      return;
    }

    if (!ACCEPTED_LOGO_TYPES.includes(file.type as typeof ACCEPTED_LOGO_TYPES[number])) {
      setLogoError("PNG, JPG, JPEG, WEBP 형식의 이미지만 업로드할 수 있습니다.");
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setLogoError(`이미지 크기는 ${MAX_LOGO_MB}MB 이하만 허용됩니다.`);
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    setLogoError(null);
    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
  };

  const validate = useCallback(() => {
    const fieldErrors: FieldErrors = {};
    if (name.trim().length < MIN_NAME_LENGTH) {
      fieldErrors.name = "크루명은 최소 2글자 이상이어야 합니다.";
    }
    if (region.trim().length < MIN_REGION_LENGTH) {
      fieldErrors.region = "활동 지역을 입력해주세요.";
    }
    if (!slug.trim()) {
      fieldErrors.slug = "슬러그를 확인해주세요.";
    }
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  }, [name, region, slug]);

  useEffect(() => {
    if (!slug) {
      setSlugState("idle");
      return;
    }
    let active = true;
    setSlugState("checking");

    const handler = setTimeout(async () => {
      const { data, error } = await client
        .from("crews")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!active) return;

      if (error && error.code !== "PGRST116") {
        console.error("슬러그 확인 중 오류", error);
        setSlugState("idle");
        return;
      }

      if (!data) {
        setSlugState("available");
      } else {
        setSlugState("unavailable");
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [client, slug]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!user) {
        setMessage("로그인 후 크루를 생성할 수 있습니다.");
        return;
      }
      if (!validate() || slugState === "unavailable") {
        setMessage("필수 항목을 확인해주세요.");
        return;
      }

      setFormState("submitting");
      setMessage(null);

      if (!profile) {
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

        const { error: profileError } = await client.from("profiles").upsert({
          id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
        });

        if (profileError) {
          console.error("프로필 생성 실패", profileError);
          setFormState("error");
          setMessage("프로필 정보를 저장하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
          return;
        }

        await refreshProfile();
      }

      let uploadedLogoUrl: string | null = null;
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
          setFormState("error");
          setMessage("로고 이미지를 업로드하지 못했습니다. 잠시 후 다시 시도해주세요.");
          return;
        }

        const { data: publicUrl } = client.storage.from("crew-assets").getPublicUrl(storagePath);
        uploadedLogoUrl = publicUrl.publicUrl;
      }

      const { data: crew, error } = await client
        .from("crews")
        .insert({
          name: name.trim(),
          slug,
          owner_id: user.id,
          activity_region: region.trim(),
          description: description.trim() || null,
          logo_image_url: uploadedLogoUrl,
        })
        .select("id, slug")
        .single();

      if (error) {
        console.error("크루 생성 실패", error);
        setFormState("error");
        setMessage(error.message ?? "크루 생성 중 문제가 발생했습니다.");
        return;
      }

      const { error: membershipError } = await client.from("crew_members").upsert({
        crew_id: crew.id,
        profile_id: user.id,
        role: "owner",
      });

      if (membershipError) {
        console.error("크루 멤버십 생성 실패", membershipError);
      }

      setFormState("success");
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoFile(null);
      setLogoPreview(null);
      setLogoError(null);
      startTransition(() => {
        router.replace(`/crews/${crew.slug}`);
      });
    },
    [client, description, logoFile, logoPreview, name, profile, refreshProfile, region, router, slug, slugState, user, validate],
  );

const canSubmit = useMemo(
  () =>
    !!user &&
    name.trim().length >= MIN_NAME_LENGTH &&
    region.trim().length >= MIN_REGION_LENGTH &&
    slugState !== "unavailable" &&
    !logoError &&
    formState !== "submitting",
  [formState, logoError, name, region, slugState, user],
);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-14">
        <h1 className="text-3xl font-semibold">크루 생성</h1>
        <p className="rounded-2xl border border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground">
          로그인 상태를 확인하는 중입니다...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-14">
        <h1 className="text-3xl font-semibold">크루 생성</h1>
        <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground">
          <p>크루를 만들기 위해서는 먼저 로그인해야 합니다.</p>
          <p>카카오 계정으로 로그인한 뒤 다시 시도해주세요.</p>
          <KakaoLoginButton onClick={() => void signInWithOAuth("kakao")} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-14">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">새로운 러닝 크루 등록</p>
        <h1 className="text-3xl font-semibold">크루 생성</h1>
        <p className="text-sm text-muted-foreground">
          기본 정보 입력 후 저장하면 바로 크루 상세 페이지에서 소개 콘텐츠를 이어서 작성할 수 있습니다.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-semibold">기본 정보</h2>
          <p className="mt-1 text-sm text-muted-foreground">필수 항목을 모두 채워주세요.</p>

          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="crew-name">
                크루명
              </label>
              <input
                id="crew-name"
                type="text"
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="예: 잠실 새벽 크루"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              {errors.name ? (
                <p className="text-xs text-rose-500">{errors.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  이미 사용 중인 이름이 있을 수 있으니 활동 지역과 소개로 구분해주세요.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="crew-slug">
                크루 주소 (slug)
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="crew-slug"
                  type="text"
                  className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={slug}
                  onChange={(event) => setSlug(generateSlug(event.target.value))}
                  required
                />
                <span className="text-xs text-muted-foreground">/crews/{slug || "your-crew"}</span>
              </div>
              <p
                className={cn("text-xs", {
                  "text-emerald-600": slugState === "available",
                  "text-amber-600": slugState === "checking",
                  "text-rose-500": slugState === "unavailable",
                  "text-muted-foreground": slugState === "idle",
                })}
              >
                {slugState === "available" && "사용 가능한 주소입니다."}
                {slugState === "checking" && "사용 가능 여부를 확인 중입니다..."}
                {slugState === "unavailable" && "이미 사용 중인 주소입니다."}
                {slugState === "idle" && "크루명을 입력하면 자동으로 추천됩니다."}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="crew-region">
                활동 지역
              </label>
              <input
                id="crew-region"
                type="text"
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="예: 서울 송파구 잠실동"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                required
              />
              {errors.region ? (
                <p className="text-xs text-rose-500">{errors.region}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  운영 거점/주요 코스/집결 장소 등을 한 줄로 요약해주세요.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="crew-description">
                짧은 소개 (선택)
              </label>
              <textarea
                id="crew-description"
                rows={4}
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="크루 운영 방식, 모임 빈도, 주요 목표 등을 간단히 적어주세요."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                상세 소개는 이후 크루 상세 페이지에서 마크다운으로 작성할 수 있습니다.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="crew-logo">
                크루 로고 이미지 (선택)
              </label>
              <input
                id="crew-logo"
                type="file"
                accept={ACCEPTED_LOGO_TYPES.join(",")}
                onChange={handleLogoChange}
                className="w-full rounded-xl border border-dashed border-border/60 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-muted-foreground">
                PNG/JPG/JPEG/WEBP, 최대 {MAX_LOGO_MB}MB 권장. 정사각형 이미지를 사용하면 카드에 잘 맞습니다.
              </p>
              {logoError ? <p className="text-xs text-rose-500">{logoError}</p> : null}
              {logoPreview ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-border/60 bg-muted">
                  <Image
                    src={logoPreview}
                    alt="로고 미리보기"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {message ? (
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              formState === "error"
                ? "border-rose-300 bg-rose-100/50 text-rose-600"
                : "border-emerald-300 bg-emerald-100/40 text-emerald-700",
            )}
          >
            {message}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            저장 후에는 슬러그는 관리자만 수정할 수 있습니다.
          </p>
          <button
            type="submit"
            disabled={!canSubmit || slugState === "checking" || isPending}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formState === "submitting" || isPending ? "생성 중..." : "크루 생성"}
          </button>
        </div>
      </form>
    </div>
  );
}
