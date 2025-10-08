"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useTransition } from "react";

import { KakaoLoginButton } from "@/components/ui/oauth-button";
import { useSupabase } from "@/components/providers/supabase-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MAX_IMAGE_MB = 5;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"] as const;
const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1920;
const COMPRESSION_QUALITY = 0.85;

function formatToDatetimeLocal(isoString: string) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 16);
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatSecondsToPace(value: number | string) {
  const seconds = typeof value === "string" ? parseInt(value, 10) : value;
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(1, "0");
  const secs = Math.round(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function parsePaceInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length !== 2) return null;
  const [minStr, secStr] = parts;
  if (!/^[0-9]+$/.test(minStr) || !/^[0-9]{2}$/.test(secStr)) return null;
  const minutes = parseInt(minStr, 10);
  const seconds = parseInt(secStr, 10);
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
  return minutes * 60 + seconds;
}

function formatSecondsToHhMmSs(totalSeconds: number | string) {
  const seconds = typeof totalSeconds === "string" ? parseInt(totalSeconds, 10) : totalSeconds;
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const hrs = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const mins = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length > 3) return null;

  // Allow partial input during typing
  if (parts.some((part) => !/^[0-9]*$/.test(part))) return null;

  // Pad parts to 2 digits for parsing
  const paddedParts = parts.map((part) => part.padStart(2, "0"));
  const [h, m, s] =
    paddedParts.length === 3
      ? paddedParts
      : paddedParts.length === 2
      ? ["00", paddedParts[0], paddedParts[1]]
      : ["00", "00", paddedParts[0]];

  const hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  const seconds = parseInt(s, 10);
  if ([hours, minutes, seconds].some((n) => Number.isNaN(n))) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 이미지 압축 함수
 * Canvas를 사용하여 이미지 크기를 조정하고 압축합니다.
 */
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = document.createElement('img');

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // 비율 유지하면서 최대 크기로 조정
        if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
          const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed'));
              return;
            }

            // 압축된 이미지가 원본보다 크면 원본 사용
            if (blob.size >= file.size) {
              resolve(file);
              return;
            }

            // 파일명 유지하면서 새 파일 생성
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          COMPRESSION_QUALITY
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

type JoinedMission = {
  id: string;
  title: string;
  crewName: string;
  crewSlug: string;
};

type OcrResponse = {
  success: boolean;
  data?: {
    id: string;
    storagePath: string;
    distanceKm: number | null;
    durationSeconds: number | null;
    recordedAt: string | null;
    rawText: string | null;
    confidence: number | null;
    preprocessedImageUrl?: string | null;
    yoloCrops?: unknown;
  };
  error?: string;
};

function RecordUploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMissionId = searchParams?.get("missionId");
  const { user, client, loading, signInWithOAuth } = useSupabase();
  const [missions, setMissions] = useState<JoinedMission[]>([]);
  const [fetchingMissions, setFetchingMissions] = useState(false);
  const [missionId, setMissionId] = useState<string>("");
  const [recordedAt, setRecordedAt] = useState<string>(() => formatToDatetimeLocal(new Date().toISOString()));
  const [distance, setDistance] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState<string>("");
  const [durationInput, setDurationInput] = useState<string>("");
  const [paceInput, setPaceInput] = useState<string>("");
  const [paceSecondsPerKm, setPaceSecondsPerKm] = useState<string>("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [notes, setNotes] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hideGuide, setHideGuide] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hideRecordUploadGuide") === "true";
    }
    return false;
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResultId, setOcrResultId] = useState<string | null>(null);
  const [showNoMissionsDialog, setShowNoMissionsDialog] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFetchingMissions(true);
    void client
      .from("mission_participants")
      .select(
        "mission:missions(id,title,crew:crews(id,name,slug))",
      )
      .eq("profile_id", user.id)
      .eq("status", "joined")
      .order("joined_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          console.error("미션 목록을 불러오지 못했습니다.", fetchError);
          setError("참여 중인 미션 목록을 가져오지 못했습니다.");
          setFetchingMissions(false);
          return;
        }

        const mapped = (data ?? [])
          .map((row) => (row as {mission: {id: string; title: string; crew: {name: string; slug: string} | null} | null}).mission)
          .filter((mission): mission is NonNullable<typeof mission> => Boolean(mission))
          .map((mission) => ({
            id: mission.id,
            title: mission.title,
            crewName: mission.crew?.name ?? "알 수 없는 크루",
            crewSlug: mission.crew?.slug ?? "",
          }));

        setMissions(mapped);
        if (mapped.length > 0) {
          const preferred =
            requestedMissionId && mapped.some((mission) => mission.id === requestedMissionId)
              ? requestedMissionId
              : mapped[0].id;
          setMissionId(preferred);
        } else {
          setMissionId("");
          setShowNoMissionsDialog(true);
        }
        setFetchingMissions(false);
      });
  }, [client, requestedMissionId, user]);

  useEffect(() => {
    if (!distance || !durationSeconds) {
      setPaceSecondsPerKm("");
      setPaceInput("");
      return;
    }
    const distanceValue = parseFloat(distance);
    const durationValue = parseInt(durationSeconds, 10);
    if (!distanceValue || Number.isNaN(durationValue) || distanceValue <= 0 || durationValue <= 0) {
      setPaceSecondsPerKm("");
      setPaceInput("");
      return;
    }
    const pace = Math.round(durationValue / distanceValue);
    setPaceSecondsPerKm(pace.toString());
    setPaceInput(formatSecondsToPace(pace));
  }, [distance, durationSeconds]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!durationSeconds) {
      return;
    }
    const formatted = formatSecondsToHhMmSs(durationSeconds);
    setDurationInput((prev) => (prev === formatted ? prev : formatted));
  }, [durationSeconds]);

  useEffect(() => {
    if (!paceSecondsPerKm) {
      return;
    }
    const formatted = formatSecondsToPace(paceSecondsPerKm);
    setPaceInput((prev) => (prev === formatted ? prev : formatted));
  }, [paceSecondsPerKm]);

  function handleDurationChange(value: string) {
    setDurationInput(value);
  }

  function handleDurationBlur() {
    const parsed = parseDurationInput(durationInput);
    if (parsed === null) {
      setDurationSeconds("");
      setPaceSecondsPerKm("");
      setPaceInput("");
      return;
    }
    setDurationSeconds(parsed.toString());
    setDurationInput(formatSecondsToHhMmSs(parsed));
  }

  function handlePaceChange(value: string) {
    setPaceInput(value);
  }

  function handlePaceBlur() {
    const parsed = parsePaceInput(paceInput);
    if (parsed === null) {
      setPaceSecondsPerKm("");
      return;
    }
    setPaceSecondsPerKm(parsed.toString());
    setPaceInput(formatSecondsToPace(parsed));
  }

  async function requestOcr(path: string) {
    setOcrLoading(true);
    try {
      if (!user) {
        setError("로그인 정보가 없습니다. 다시 로그인 후 시도해주세요.");
        setOcrLoading(false);
        return;
      }

      const { data, error: invokeError } = await client.functions.invoke<OcrResponse>("ocr-ingest", {
        body: {
          profileId: user.id,
          storagePath: path,
          bucket: "records-raw",
        },
      });

      if (invokeError || !data?.success || !data.data) {
        setError(
          data?.error ?? invokeError?.message ?? "OCR 분석에 실패했습니다. 값을 직접 입력해주세요.",
        );
        setOcrLoading(false);
        return;
      }

      const { id, storagePath: resolvedPath, distanceKm, durationSeconds, recordedAt, rawText } =
        data.data;
      setOcrResultId(id);
      setStoragePath(resolvedPath);
      if (distanceKm) setDistance(distanceKm.toString());
      if (durationSeconds) {
        setDurationSeconds(durationSeconds.toString());
        setDurationInput(formatSecondsToHhMmSs(durationSeconds));
      }
      if (recordedAt) setRecordedAt(formatToDatetimeLocal(recordedAt));

      // OCR 원문을 콘솔에 출력
      if (rawText) {
        console.log("=== OCR 원문 ===");
        console.log(rawText);
        console.log("===============");
      }
    } catch (ocrError) {
      console.error("OCR 호출 실패", ocrError);
      setOcrResultId(null);
      setError("OCR 호출 중 문제가 발생했습니다. 값을 직접 입력해주세요.");
    } finally {
      setOcrLoading(false);
    }
  }

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
      setError("PNG, JPG, JPEG, WEBP 형식의 이미지만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`이미지 크기는 ${MAX_IMAGE_MB}MB 이하만 허용됩니다.`);
      return;
    }

    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setError(null);

    // 이미지 압축
    let fileToUpload = file;
    try {
      fileToUpload = await compressImage(file);
    } catch (compressionError) {
      console.warn("[Compress] Failed to compress image, using original:", compressionError);
      fileToUpload = file;
    }

    const objectUrl = URL.createObjectURL(fileToUpload);
    setImagePreview(objectUrl);
    setDurationSeconds("");
    setDurationInput("");
    setPaceSecondsPerKm("");
    setPaceInput("");
    setDistance("");

    if (!user) return;

    setOcrResultId(null);

    const path = `${user.id}/ocr-${Date.now()}_${file.name}`;

    const { error: uploadError } = await client.storage
      .from("records-raw")
      .upload(path, fileToUpload, {
        upsert: true,
        contentType: fileToUpload.type,
      });

    if (uploadError) {
      console.error("[Upload] 이미지 업로드 실패", uploadError);
      setError("이미지를 업로드하지 못했습니다. 다시 시도해주세요.");
      return;
    }

    setStoragePath(path);

    // 짧은 지연 추가 - Storage 파일이 완전히 커밋될 때까지 대기
    await new Promise(resolve => setTimeout(resolve, 500));

    await requestOcr(path);
  };

  const canSubmit = useMemo(() => {
    return (
      !!user &&
      !!missionId &&
      recordedAt.trim().length > 0 &&
      parseFloat(distance) > 0 &&
      parseInt(durationSeconds, 10) > 0 &&
      parseInt(paceSecondsPerKm, 10) > 0 &&
      !!storagePath &&
      !isSubmitting
    );
  }, [user, missionId, recordedAt, distance, durationSeconds, paceSecondsPerKm, storagePath, isSubmitting]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !user || !storagePath) return;

    const submit = async () => {
      setError(null);
      setSuccess(null);

    const paceValue = parseInt(paceSecondsPerKm, 10);
    const durationValue = parseInt(durationSeconds, 10);
      const distanceValue = parseFloat(distance);

      // datetime-local 값을 로컬 시간 그대로 저장 (타임존 오프셋 보정)
      const recordedDate = new Date(recordedAt);
      const recordedAtISO = new Date(
        recordedDate.getTime() - recordedDate.getTimezoneOffset() * 60000
      ).toISOString();

      const { error: insertError } = await client
        .from("records")
        .insert({
          profile_id: user.id,
          mission_id: missionId,
          recorded_at: recordedAtISO,
          distance_km: distanceValue,
          duration_seconds: durationValue,
          pace_seconds_per_km: paceValue,
          visibility,
          notes: notes.trim() || null,
          image_path: storagePath,
          ocr_result_id: ocrResultId,
        } as never);

      if (insertError) {
        console.error("기록 저장 실패", insertError);
        setError(insertError.message ?? "기록을 저장하지 못했습니다. 다시 시도해주세요.");
        return;
      }

      setSuccess("기록이 저장되었습니다!");
      setDistance("");
      setDurationSeconds("");
      setDurationInput("");
      setPaceSecondsPerKm("");
      setPaceInput("");
      setNotes("");
      setRecordedAt("");
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(null);
      setStoragePath(null);
      setOcrResultId(null);

      setTimeout(() => {
        router.push(`/missions/${missionId}`);
      }, 600);
    };

    startTransition(submit);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-14">
        <h1 className="text-3xl font-semibold">기록 업로드</h1>
        <p className="rounded-2xl border border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground">
          로그인 상태를 확인하는 중입니다...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-14">
        <h1 className="text-3xl font-semibold">기록 업로드</h1>
        <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground">
          <p>기록을 업로드하려면 먼저 로그인해야 합니다.</p>
          <KakaoLoginButton onClick={() => void signInWithOAuth("kakao")} />
        </div>
      </div>
    );
  }
  return (
    <>
      <AlertDialog open={showNoMissionsDialog} onOpenChange={setShowNoMissionsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>참여 중인 미션이 없습니다</AlertDialogTitle>
            <AlertDialogDescription>
              기록을 등록하려면 크루의 미션에 참여해야 합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowNoMissionsDialog(false);
                router.push("/missions");
              }}
            >
              미션 보기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto max-w-3xl space-y-8 px-0 py-8">
        <div className="space-y-4 px-4">
          <h1 className="text-3xl font-semibold">기록 등록</h1>
          <p className="text-sm text-muted-foreground">
            참여 중인 미션을 선택하고 OCR 결과를 확인한 뒤 기록을 저장하세요.
          </p>

        {/* 안내 사항 */}
        {!hideGuide && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-4 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  1
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  크루의 미션 참여
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-4 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  2
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  기록 캡쳐 이미지 등록
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-4 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  3
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  OCR 결과 확인 및 수정
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-4 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  4
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  기록 등록
                </p>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={hideGuide}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHideGuide(checked);
                  localStorage.setItem("hideRecordUploadGuide", String(checked));
                }}
                className="h-4 w-4 rounded border-border text-orange-500 focus:ring-orange-500"
              />
              다시 보지 않기
            </label>
          </div>
        )}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
          {success}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="space-y-6  border border-border/60 bg-background p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="mission">
              참여 중인 미션
            </label>
            <select
              id="mission"
              value={missionId}
              onChange={(event) => setMissionId(event.target.value)}
              disabled={fetchingMissions || missions.length === 0}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              {missions.length ? null : <option value="">참여 중인 미션이 없습니다</option>}
              {missions.map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.title} · {mission.crewName}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {fetchingMissions
                ? "미션 목록을 불러오는 중입니다."
                : missions.length
                ? "기록 등록할 미션을 선택하세요."
                : "미션에 참여한 뒤 다시 시도해주세요."}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground" htmlFor="record-image">
                기록 이미지 업로드
              </label>
              <button
                type="button"
                onClick={() => {
                  document.getElementById("record-image")?.click();
                }}
                className="flex h-12 w-full items-center justify-center rounded-xl border border-dashed border-orange-400 bg-orange-50 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              >
                기록 이미지 선택
              </button>
              <input
                id="record-image"
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                onChange={handleImageChange}
                className="hidden"
                required
              />
              <p className="text-xs text-muted-foreground">
                PNG/JPG/JPEG/WEBP, 최대 {MAX_IMAGE_MB}MB. 업로드 후 자동 분석이 시작
              </p>
              <div className="relative mt-2 h-48 w-full overflow-hidden rounded-xl border border-border/60 bg-muted">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="기록 이미지 미리보기"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 320px"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    아직 업로드한 이미지가 없습니다.
                  </div>
                )}
                {ocrLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm font-medium text-muted-foreground">
                    OCR 분석 중...
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <h2 className="text-mm font-semibold text-muted-foreground">운동 데이터</h2>
              <label className="block text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                    초기 버전이라 OCR 정확도가 떨어집니다. 직접 확인 & 수정해 주세요👍
                  </label>
              <div className="space-y-4 border-border/60 bg-background pt-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    활동 시각<span className="px-2 text-orange-600 dark:text-orange-400">실제 활동 시간</span>
                  </label>
                  <input
                    id="recorded-at"
                    type="datetime-local"
                    value={recordedAt}
                    onChange={(event) => setRecordedAt(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border/60 bg-background px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                      거리 (km, 숫자만 입력)
                    </label>
                    <input
                      id="distance"
                      type="number"
                      step="0.01"
                      min="0"
                      value={distance}
                      onChange={(event) => setDistance(event.target.value)}
                      placeholder="예: 13.1"
                      className="mt-2 w-full rounded-lg border border-border/60 bg-background px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                      운동 시간 (hh:mm:ss)
                    </label>
                    <input
                      id="duration"
                      type="text"
                      value={durationInput}
                      onChange={(event) => handleDurationChange(event.target.value)}
                      onBlur={handleDurationBlur}
                      placeholder="예: 01:12:34"
                      className="mt-2 w-full rounded-lg border border-border/60 bg-background px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    평균 페이스 (1분/Km)
                  </label>
                  <input
                    id="pace"
                    type="text"
                    value={paceInput}
                    onChange={(event) => handlePaceChange(event.target.value)}
                    onBlur={handlePaceBlur}
                    placeholder="예: 05:20"
                    className="mt-2 w-full rounded-lg border border-border/60 bg-background px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>  
              </div>
            </div>
           
          </div>
        </section>
        <div className="space-y-2 px-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                      공개 설정
                    </label>
                    <select
                      id="visibility"
                      value={visibility}
                      onChange={(event) =>
                        setVisibility(event.target.value === "private" ? "private" : "public")
                      }
                      className="mt-2 w-full rounded-lg border border-border/60 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="public">전체 공개 (통계 반영)</option>
                      <option value="private">비공개 (통계 제외)</option>
                    </select>
                  </div>
        <div className="space-y-2 px-4">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    메모 (선택)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-border/60 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    maxLength={500}
                  />
                </div>
        <div className="px-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-full bg-orange-500 px-5 py-4 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "💾 저장 중..." : "💾 기록 저장"}
          </button>
        </div>
      </form>
      </div>
    </>
  );
}

export default function RecordUploadPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl p-6">로딩 중...</div>}>
      <RecordUploadPageContent />
    </Suspense>
  );
}
