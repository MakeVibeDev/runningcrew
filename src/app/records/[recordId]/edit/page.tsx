"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { useSupabase } from "@/components/providers/supabase-provider";
import { fetchRecordById } from "@/lib/supabase/rest";

const MAX_IMAGE_MB = 5;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"] as const;

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
  const mins = Math.floor(seconds / 60).toString().padStart(1, "0");
  const secs = Math.round(seconds % 60).toString().padStart(2, "0");
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
  const hrs = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length > 3) return null;

  if (parts.some((part) => !/^[0-9]*$/.test(part))) return null;

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
  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export default function EditRecordPage({ params }: { params: Promise<{ recordId: string }> }) {
  const resolvedParams = use(params);
  const { user } = useSupabase();
  const router = useRouter();

  const [record, setRecord] = useState<Awaited<ReturnType<typeof fetchRecordById>>>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [pace, setPace] = useState("");
  const [recordedAt, setRecordedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    async function loadRecord() {
      try {
        const data = await fetchRecordById(resolvedParams.recordId);
        if (!data) {
          alert("기록을 찾을 수 없습니다.");
          router.push("/");
          return;
        }

        setRecord(data);
        setDistance(data.distanceKm.toString());
        setDuration(formatSecondsToHhMmSs(data.durationSeconds));
        setPace(data.paceSecondsPerKm ? formatSecondsToPace(data.paceSecondsPerKm) : "");
        setRecordedAt(formatToDatetimeLocal(data.recordedAt));
        setNotes(data.notes || "");
        setVisibility(data.visibility as "public" | "private");
        if (data.imagePath) {
          setImagePreview(data.imagePath);
        }
      } catch (error) {
        console.error("Failed to load record:", error);
        alert("기록을 불러오는데 실패했습니다.");
        router.push("/");
      } finally {
        setLoading(false);
      }
    }

    void loadRecord();
  }, [user, resolvedParams.recordId, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
      alert("PNG, JPEG, JPG, WEBP 형식만 지원합니다.");
      return;
    }

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      alert(`이미지 크기는 ${MAX_IMAGE_MB}MB 이하여야 합니다.`);
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !record) return;

    const distanceKm = parseFloat(distance);
    const durationSeconds = parseDurationInput(duration);
    const paceSeconds = pace ? parsePaceInput(pace) : null;

    if (!distanceKm || distanceKm <= 0) {
      alert("거리를 올바르게 입력해주세요.");
      return;
    }

    if (!durationSeconds || durationSeconds <= 0) {
      alert("활동 시간을 올바르게 입력해주세요.");
      return;
    }

    setSaving(true);

    try {
      const { getBrowserSupabaseClient } = await import("@/lib/supabase/browser-client");
      const supabase = getBrowserSupabaseClient();

      let imagePath = record.imagePathRaw;

      // 새 이미지가 선택된 경우 업로드
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const storagePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("records-raw")
          .upload(storagePath, imageFile, { upsert: true });

        if (uploadError) {
          throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
        }

        imagePath = storagePath;
      }

      // 기록 업데이트
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const { error: updateError } = await (supabase as any)
        .from("records")
        .update({
          distance_km: distanceKm,
          duration_seconds: durationSeconds,
          pace_seconds_per_km: paceSeconds,
          recorded_at: recordedAt,
          notes: notes.trim() || null,
          visibility,
          image_path: imagePath,
        })
        .eq("id", resolvedParams.recordId);
      /* eslint-enable @typescript-eslint/no-explicit-any */

      if (updateError) {
        throw new Error(`기록 수정 실패: ${updateError.message}`);
      }

      alert("기록이 수정되었습니다.");
      router.push("/");
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "기록 수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!user || !record) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-6 py-6">
          <h1 className="text-2xl font-bold">기록 수정</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {record.mission?.title || "미션 정보 없음"}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <form onSubmit={handleSave} className="space-y-6">
          {/* 이미지 업로드 */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <label className="block text-sm font-semibold">기록 사진</label>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPEG, JPG, WEBP (최대 {MAX_IMAGE_MB}MB)
            </p>
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handleImageChange}
              className="mt-3 block w-full text-sm text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-semibold file:text-background hover:file:opacity-90"
            />
            {imagePreview && (
              <div className="relative mt-4 h-48 w-full overflow-hidden rounded-xl border border-border/40">
                <Image src={imagePreview} alt="미리보기" fill className="object-cover" />
              </div>
            )}
          </div>

          {/* 거리 */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <label htmlFor="distance" className="block text-sm font-semibold">
              거리 (km) *
            </label>
            <input
              type="number"
              id="distance"
              step="0.01"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2"
              required
            />
          </div>

          {/* 활동 시간 */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <label htmlFor="duration" className="block text-sm font-semibold">
              활동 시간 (HH:MM:SS) *
            </label>
            <input
              type="text"
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="01:23:45"
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2"
              required
            />
          </div>

          {/* 페이스 */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <label htmlFor="pace" className="block text-sm font-semibold">
              페이스 (분:초/km)
            </label>
            <input
              type="text"
              id="pace"
              value={pace}
              onChange={(e) => setPace(e.target.value)}
              placeholder="5:30"
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2"
            />
          </div>

          {/* 활동 시간 */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <label htmlFor="recordedAt" className="block text-sm font-semibold">
              활동 시간 *
            </label>
            <input
              type="datetime-local"
              id="recordedAt"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2"
              required
            />
          </div>

          {/* 메모 */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <label htmlFor="notes" className="block text-sm font-semibold">
              메모
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2"
              placeholder="활동에 대한 메모를 입력하세요"
            />
          </div>

          {/* 공개 설정 */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <label className="block text-sm font-semibold">공개 설정</label>
            <div className="mt-3 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="public"
                  checked={visibility === "public"}
                  onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                />
                <span className="text-sm">공개</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="private"
                  checked={visibility === "private"}
                  onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                />
                <span className="text-sm">비공개</span>
              </label>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-full border border-border px-6 py-3 font-semibold hover:bg-muted"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-foreground px-6 py-3 font-semibold text-background hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "수정 완료"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
